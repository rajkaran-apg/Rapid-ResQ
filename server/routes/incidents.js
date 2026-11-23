import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { q } from '../db.js';
import { HttpError, parse, newIncidentId } from '../http.js';
import { authenticate, requireRole } from '../auth.js';
import { audit } from '../audit.js';
import { triage } from '../ai/triage.js';
import { config } from '../config.js';
import {
  INCIDENT_COLS, FLOW, LABEL, getEvents, mustGetIncident, staffView, publicView, broadcast, broadcastTeams,
  addEvent, notify, moveTo, emailReporter, emailTeam
} from '../services/incidents.js';

export const TYPES = ['Accident', 'Fire', 'Medical Emergency', 'Infrastructure Failure', 'Other'];
export const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const router = Router();
const skip = () => config.env === 'test';
const reportLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 15, skip, message: { error: 'Too many reports from this device. Please try later.' } });
const trackLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, skip });

// ---------------- PUBLIC: citizen report + tracking ----------------
const reportSchema = z.object({
  type: z.enum(TYPES),
  description: z.string().trim().min(10, 'Please describe the emergency (min 10 characters)').max(1500),
  address: z.string().trim().min(3).max(300),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  reporterName: z.string().trim().min(2).max(80),
  reporterPhone: z.string().trim().regex(/^[+\d][\d\s-]{6,17}$/, 'Enter a valid phone number'),
  reporterEmail: z.string().trim().email().max(120).optional().or(z.literal('')),
  image: z.string().startsWith('data:image/').max(2_200_000).optional()
});

router.post('/incidents', reportLimiter, async (req, res) => {
  const b = parse(reportSchema, req.body);
  const id = newIncidentId();
  const ai = triage(b.description);
  const title = b.description.length > 70 ? b.description.slice(0, 67) + '…' : b.description;
  await q(`insert into incidents(id,type,title,description,address,lat,lng,reporter_name,reporter_phone,reporter_email,ai_type,ai_severity,ai_confidence)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, b.type, title, b.description, b.address, b.lat ?? null, b.lng ?? null, b.reporterName, b.reporterPhone, b.reporterEmail || null, ai.type, ai.severity, ai.confidence]);
  if (b.image) await q('insert into incident_images(incident_id,data) values($1,$2)', [id, b.image]);
  await addEvent(id, 'REPORTED', LABEL.REPORTED, { name: b.reporterName, role: 'CITIZEN' });
  await audit(null, 'Incident reported', { incidentId: id, detail: `AI suggestion: ${ai.type} / ${ai.severity} (${Math.round(ai.confidence * 100)}%)`, ip: req.ip });
  await notify('ops', 'New incident reported', `${b.type} — ${b.address}`, 'warn', id);
  const inc = await mustGetIncident(id);
  emailReporter(inc, `RapidResQ: we received your report (${id})`, `Hello ${b.reporterName},\n\nYour ${b.type} report has been received and will be verified by our control room shortly.`);
  await broadcast(id, 'incident:new');
  res.status(201).json({ id });
});

router.get('/track/:id', trackLimiter, async (req, res) => {
  const [inc] = await q(`select ${INCIDENT_COLS} from incidents where id=$1`, [req.params.id.toUpperCase()]);
  if (!inc) throw new HttpError(404, 'Incident not found. Check the ID.');
  res.json(await publicView(inc));
});

router.post('/track/:id/review', trackLimiter, async (req, res) => {
  const { rating, review } = parse(z.object({ rating: z.number().int().min(1).max(5), review: z.string().trim().max(500).optional() }), req.body);
  const inc = await mustGetIncident(req.params.id.toUpperCase());
  if (inc.status !== 'RESOLVED') throw new HttpError(400, 'You can review only after the incident is resolved');
  if (inc.rating) throw new HttpError(409, 'Review already submitted');
  await q('update incidents set rating=$2, review=$3 where id=$1', [inc.id, rating, review || null]);
  await audit(null, 'Citizen review submitted', { incidentId: inc.id, detail: `${rating}/5`, ip: req.ip });
  await broadcast(inc.id);
  res.json({ ok: true });
});

// ---------------- STAFF ----------------
router.use(authenticate);

router.get('/incidents', async (req, res) => {
  const u = req.user, f = req.query;
  const where = [], params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replaceAll('?', '$' + params.length)); };
  if (u.role === 'RESPONDER') { if (!u.teamId) return res.json({ items: [], total: 0 }); add('team_id = ?', u.teamId); }
  if (f.status === 'active') where.push("status not in ('RESOLVED','REJECTED')");
  else if (f.status && f.status !== 'all') add('status = ?', String(f.status));
  if (f.type) add('type = ?', String(f.type));
  if (f.severity) add('severity = ?', String(f.severity));
  if (f.teamId) add('team_id = ?', String(f.teamId));
  if (f.location) add('lower(address) like ?', `%${String(f.location).toLowerCase()}%`);
  if (f.q) add('(lower(title) like ? or lower(id) like ?)', `%${String(f.q).toLowerCase()}%`);
  if (f.from && !isNaN(Date.parse(f.from))) add('created_at >= ?', new Date(f.from));
  if (f.to && !isNaN(Date.parse(f.to))) add('created_at <= ?', new Date(new Date(f.to).getTime() + 86400000 - 1));
  const w = where.length ? 'where ' + where.join(' and ') : '';
  const limit = Math.min(Number(f.limit) || 25, 200), offset = Number(f.offset) || 0;
  const items = await q(`select ${INCIDENT_COLS} from incidents ${w} order by created_at desc limit ${limit} offset ${offset}`, params);
  const [{ n }] = await q(`select count(*) as n from incidents ${w}`, params);
  res.json({ items: items.map(i => staffView(i, u.role)), total: Number(n) });
});

async function visible(req, id) {
  const inc = await mustGetIncident(id);
  if (req.user.role === 'RESPONDER' && inc.teamId !== req.user.teamId) {
    audit(req.user, 'Permission denied', { incidentId: id, detail: 'Responder opened an incident not assigned to their team', outcome: 'DENIED', ip: req.ip });
    throw new HttpError(403, 'This incident is not assigned to your team');
  }
  return inc;
}

router.get('/incidents/:id', async (req, res) => {
  const inc = await visible(req, req.params.id);
  const [img] = req.user.role === 'VIEWER' ? [] : await q('select data from incident_images where incident_id=$1', [inc.id]);
  const [team] = inc.teamId ? await q('select id,name,base,status from teams where id=$1', [inc.teamId]) : [];
  res.json({ incident: staffView(inc, req.user.role), events: await getEvents(inc.id), image: img?.data || null, team: team || null });
});

router.post('/incidents/:id/verify', requireRole('ADMIN'), async (req, res) => {
  const b = parse(z.object({ severity: z.enum(SEVERITIES), type: z.enum(TYPES).optional() }), req.body);
  const inc = await mustGetIncident(req.params.id);
  if (inc.status !== 'REPORTED') throw new HttpError(400, 'Only newly reported incidents can be verified');
  const decision = b.severity === inc.aiSeverity ? 'ACCEPTED' : 'OVERRIDDEN';
  await q('update incidents set severity=$2, type=$3, ai_decision=$4 where id=$1', [inc.id, b.severity, b.type || inc.type, decision]);
  await moveTo(inc, 'VERIFIED', req.user);
  await audit(req.user, 'Verified incident', { incidentId: inc.id, detail: `AI suggested ${inc.aiSeverity} (${Math.round(inc.aiConfidence * 100)}%); final priority ${b.severity} → ${decision}`, ip: req.ip });
  await notify('ops', 'Incident verified', `${inc.id} — ${b.severity} priority, ready for dispatch`, 'info', inc.id);
  emailReporter(inc, `RapidResQ: your report ${inc.id} is verified`, 'Our control room has verified your report. A response team will be assigned shortly.');
  await broadcast(inc.id);
  res.json({ ok: true });
});

router.post('/incidents/:id/reject', requireRole('ADMIN'), async (req, res) => {
  const { reason } = parse(z.object({ reason: z.string().trim().min(3).max(300) }), req.body);
  const inc = await mustGetIncident(req.params.id);
  if (!['REPORTED', 'VERIFIED'].includes(inc.status)) throw new HttpError(400, 'Cannot reject at this stage');
  await moveTo(inc, 'REJECTED', req.user, reason);
  await audit(req.user, 'Rejected report', { incidentId: inc.id, detail: reason, ip: req.ip });
  emailReporter(inc, `RapidResQ: report ${inc.id} could not be verified`, `We could not verify this report. Reason: ${reason}`);
  await broadcast(inc.id);
  res.json({ ok: true });
});

router.patch('/incidents/:id/priority', requireRole('ADMIN', 'DISPATCHER'), async (req, res) => {
  const { severity } = parse(z.object({ severity: z.enum(SEVERITIES) }), req.body);
  const inc = await mustGetIncident(req.params.id);
  if (['RESOLVED', 'REJECTED'].includes(inc.status)) throw new HttpError(400, 'Incident is closed');
  const decision = severity === inc.aiSeverity ? 'ACCEPTED' : 'OVERRIDDEN';
  await q('update incidents set severity=$2, ai_decision=$3 where id=$1', [inc.id, severity, decision]);
  await addEvent(inc.id, null, `Priority set to ${severity}`, req.user);
  await audit(req.user, 'Changed priority', { incidentId: inc.id, detail: `${inc.severity || 'unset'} → ${severity}; AI suggested ${inc.aiSeverity} → ${decision}`, ip: req.ip });
  await broadcast(inc.id);
  res.json({ ok: true });
});

router.post('/incidents/:id/assign', requireRole('ADMIN', 'DISPATCHER'), async (req, res) => {
  const { teamId } = parse(z.object({ teamId: z.string().min(1) }), req.body);
  const inc = await mustGetIncident(req.params.id);
  if (!['VERIFIED', 'ASSIGNED'].includes(inc.status)) throw new HttpError(400, 'Incident must be verified (and not yet accepted) to assign');
  const [team] = await q('select id,name from teams where id=$1', [teamId]);
  if (!team) throw new HttpError(404, 'Team not found');
  if (inc.teamId === teamId) throw new HttpError(400, 'Already assigned to this team');
  // Atomically claim the team so two dispatchers cannot double-book it
  const claimed = await q("update teams set status='BUSY' where id=$1 and status='AVAILABLE' returning id", [teamId]);
  if (!claimed.length) throw new HttpError(409, `${team.name} is not available`);
  const oldTeam = inc.teamId;
  if (oldTeam) await q("update teams set status='AVAILABLE' where id=$1", [oldTeam]);
  await q('update incidents set team_id=$2 where id=$1', [inc.id, teamId]);
  if (inc.status === 'VERIFIED') await moveTo({ ...inc, teamId }, 'ASSIGNED', req.user, `Assigned to ${team.name}`);
  else await addEvent(inc.id, 'ASSIGNED', `Reassigned to ${team.name}`, req.user);
  await audit(req.user, oldTeam ? 'Reassigned team' : 'Assigned team', { incidentId: inc.id, detail: team.name, ip: req.ip });
  await notify('team:' + teamId, 'New assignment', `${inc.type} — ${inc.address}`, 'critical', inc.id);
  emailTeam(teamId, `RapidResQ assignment: ${inc.id}`, `New ${inc.severity || ''} ${inc.type} incident assigned to ${team.name}.\nLocation: ${inc.address}\nOpen the RapidResQ app to accept.`);
  emailReporter(inc, `RapidResQ: team assigned to ${inc.id}`, `${team.name} has been assigned to your incident.`);
  if (oldTeam) { const { emit } = await import('../realtime.js'); emit('team:' + oldTeam, 'incident:removed', { id: inc.id }); }
  await broadcast(inc.id); await broadcastTeams();
  res.json({ ok: true });
});

router.post('/incidents/:id/status', requireRole('RESPONDER', 'ADMIN'), async (req, res) => {
  const { status, note } = parse(z.object({ status: z.enum(['ACCEPTED', 'EN_ROUTE', 'ON_SITE', 'RESOLVED']), note: z.string().trim().max(500).optional() }), req.body);
  const inc = await visible(req, req.params.id);
  if (FLOW.indexOf(status) !== FLOW.indexOf(inc.status) + 1 || FLOW.indexOf(inc.status) < FLOW.indexOf('ASSIGNED'))
    throw new HttpError(400, `Cannot move from ${inc.status} to ${status}`);
  await moveTo(inc, status, req.user, note || null);
  if (status === 'RESOLVED') await q("update teams set status='AVAILABLE' where id=$1", [inc.teamId]);
  await audit(req.user, `Status → ${status}`, { incidentId: inc.id, detail: note || null, ip: req.ip });
  await notify('ops', LABEL[status], `${inc.id} — ${inc.type}, ${inc.address}`, status === 'RESOLVED' ? 'success' : 'info', inc.id);
  if (['EN_ROUTE', 'RESOLVED'].includes(status)) emailReporter(inc, `RapidResQ: ${LABEL[status]} (${inc.id})`,
    status === 'RESOLVED' ? 'Your reported incident has been resolved. Please rate the response using the tracking link below.' : 'A responder is on the way to your location.');
  await broadcast(inc.id); await broadcastTeams();
  res.json({ ok: true });
});

router.post('/incidents/:id/notes', requireRole('ADMIN', 'DISPATCHER', 'RESPONDER'), async (req, res) => {
  const { note } = parse(z.object({ note: z.string().trim().min(1).max(500) }), req.body);
  const inc = await visible(req, req.params.id);
  await addEvent(inc.id, null, 'Note added', req.user, note);
  await audit(req.user, 'Added note', { incidentId: inc.id, ip: req.ip });
  await broadcast(inc.id);
  res.json({ ok: true });
});

export default router;
