// Teams, users, audit log, notifications, analytics
import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { q } from '../db.js';
import { HttpError, parse, uid } from '../http.js';
import { authenticate, requireRole, hashPassword } from '../auth.js';
import { audit } from '../audit.js';
import { broadcastTeams } from '../services/incidents.js';
import { sendInvite } from './auth.js';

const router = Router();
router.use(authenticate);
const ROLES = ['ADMIN', 'DISPATCHER', 'RESPONDER', 'VIEWER'];

// ---------- teams ----------
router.get('/teams', async (_req, res) => {
  const teams = await q('select id,name,base,status from teams order by name');
  const active = await q("select team_id, count(*) as n from incidents where team_id is not null and status not in ('RESOLVED','REJECTED') group by team_id");
  const members = await q("select team_id, count(*) as n from users where role='RESPONDER' and active=true and team_id is not null group by team_id");
  const by = (rows, id) => Number(rows.find(r => r.teamId === id)?.n || 0);
  res.json(teams.map(t => ({ ...t, activeIncidents: by(active, t.id), members: by(members, t.id) })));
});

router.post('/admin/teams', requireRole('ADMIN'), async (req, res) => {
  const b = parse(z.object({ name: z.string().trim().min(2).max(60), base: z.string().trim().max(120).optional() }), req.body);
  if ((await q('select id from teams where lower(name)=lower($1)', [b.name])).length) throw new HttpError(409, 'Team name already exists');
  const id = uid();
  await q('insert into teams(id,name,base) values($1,$2,$3)', [id, b.name, b.base || null]);
  await audit(req.user, 'Created team', { detail: b.name, ip: req.ip });
  await broadcastTeams();
  res.status(201).json({ id });
});

// Responders can mark their own team AVAILABLE / OFFLINE (not while on an incident)
router.patch('/teams/:id/status', requireRole('ADMIN', 'RESPONDER'), async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['AVAILABLE', 'OFFLINE']) }), req.body);
  const [t] = await q('select * from teams where id=$1', [req.params.id]);
  if (!t) throw new HttpError(404, 'Team not found');
  if (req.user.role === 'RESPONDER' && req.user.teamId !== t.id) {
    await audit(req.user, 'Permission denied', { detail: 'Changed another team status', outcome: 'DENIED', ip: req.ip });
    throw new HttpError(403, 'You can only change your own team');
  }
  if (t.status === 'BUSY') throw new HttpError(409, 'Team is on an active incident');
  await q('update teams set status=$2 where id=$1', [t.id, status]);
  await audit(req.user, 'Team status changed', { detail: `${t.name} → ${status}`, ip: req.ip });
  await broadcastTeams();
  res.json({ ok: true });
});

// ---------- users (admin) ----------
router.get('/admin/users', requireRole('ADMIN'), async (_req, res) =>
  res.json(await q('select id,name,email,phone,role,team_id,email_verified,active,created_at from users order by created_at desc')));

router.post('/admin/users', requireRole('ADMIN'), async (req, res) => {
  const b = parse(z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), phone: z.string().trim().max(20).optional(), role: z.enum(ROLES), teamId: z.string().optional() }), req.body);
  if (b.role === 'RESPONDER' && !b.teamId) throw new HttpError(400, 'Responders must belong to a team');
  if ((await q('select id from users where email=$1', [b.email])).length) throw new HttpError(409, 'Email already registered');
  const user = { id: uid(), name: b.name, email: b.email };
  // random unusable password; the person sets their own through the emailed invite code
  await q('insert into users(id,name,email,phone,password_hash,role,team_id) values($1,$2,$3,$4,$5,$6,$7)',
    [user.id, b.name, b.email, b.phone || null, await hashPassword(crypto.randomBytes(24).toString('hex')), b.role, b.role === 'RESPONDER' ? b.teamId : null]);
  await sendInvite(user);
  await audit(req.user, 'Created user', { detail: `${b.email} as ${b.role}`, ip: req.ip });
  res.status(201).json({ id: user.id });
});

router.patch('/admin/users/:id', requireRole('ADMIN'), async (req, res) => {
  const b = parse(z.object({ role: z.enum(ROLES).optional(), teamId: z.string().nullable().optional(), active: z.boolean().optional() }), req.body);
  const [u] = await q('select * from users where id=$1', [req.params.id]);
  if (!u) throw new HttpError(404, 'User not found');
  if (u.id === req.user.id && (b.active === false || (b.role && b.role !== 'ADMIN'))) throw new HttpError(400, 'You cannot demote or deactivate yourself');
  const role = b.role ?? u.role;
  const teamId = role === 'RESPONDER' ? (b.teamId !== undefined ? b.teamId : u.teamId) : null;
  if (role === 'RESPONDER' && !teamId) throw new HttpError(400, 'Responders must belong to a team');
  await q('update users set role=$2, team_id=$3, active=$4 where id=$1', [u.id, role, teamId, b.active ?? u.active]);
  await audit(req.user, 'Updated user', { detail: `${u.email}: role=${role}, team=${teamId || '-'}, active=${b.active ?? u.active}`, ip: req.ip });
  res.json({ ok: true });
});

// ---------- audit log ----------
router.get('/admin/audit', requireRole('ADMIN'), async (req, res) => {
  const f = req.query, where = [], params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replaceAll('?', '$' + params.length)); };
  if (f.outcome) add('outcome = ?', String(f.outcome));
  if (f.q) add('(lower(action) like ? or lower(coalesce(detail,\'\')) like ? or lower(actor_name) like ? or lower(coalesce(incident_id,\'\')) like ?)', `%${String(f.q).toLowerCase()}%`);
  if (f.from && !isNaN(Date.parse(f.from))) add('at >= ?', new Date(f.from));
  if (f.to && !isNaN(Date.parse(f.to))) add('at <= ?', new Date(new Date(f.to).getTime() + 86400000 - 1));
  const w = where.length ? 'where ' + where.join(' and ') : '';
  const limit = Math.min(Number(f.limit) || 50, 200), offset = Number(f.offset) || 0;
  const items = await q(`select id,at,actor_name,actor_role,action,incident_id,detail,outcome,ip from audit_logs ${w} order by at desc limit ${limit} offset ${offset}`, params);
  const [{ n }] = await q(`select count(*) as n from audit_logs ${w}`, params);
  res.json({ items, total: Number(n) });
});

// ---------- notifications ----------
router.get('/notifications', async (req, res) => {
  const u = req.user;
  const aud = u.role === 'RESPONDER' ? (u.teamId ? ['team:' + u.teamId] : []) : ['ADMIN', 'DISPATCHER'].includes(u.role) ? ['ops'] : [];
  if (!aud.length) return res.json([]);
  res.json(await q(`select id,at,title,body,level,incident_id from notifications where audience = $1 order by at desc limit 50`, [aud[0]]));
});

// ---------- analytics ----------
router.get('/analytics', requireRole('ADMIN', 'DISPATCHER', 'VIEWER'), async (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 90);
  const rows = await q('select id,type,severity,status,team_id,created_at,en_route_at,on_site_at,resolved_at,rating from incidents');
  const teams = await q('select id,name from teams');
  const mins = (a, b) => (a && b ? (new Date(b) - new Date(a)) / 60000 : null);
  const avg = arr => { const v = arr.filter(x => x != null); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null; };
  const count = (key, list) => list.map(k => ({ name: k, value: rows.filter(r => r[key] === k).length }));
  const closed = r => ['RESOLVED', 'REJECTED'].includes(r.status);
  const resolved = rows.filter(r => r.status === 'RESOLVED');

  const daily = [];
  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - d);
    const next = new Date(day); next.setDate(next.getDate() + 1);
    const inDay = t => t && new Date(t) >= day && new Date(t) < next;
    daily.push({ date: day.toISOString().slice(5, 10), reported: rows.filter(r => inDay(r.createdAt)).length, resolved: rows.filter(r => inDay(r.resolvedAt)).length });
  }
  res.json({
    kpis: {
      total: rows.length,
      active: rows.filter(r => !closed(r)).length,
      criticalActive: rows.filter(r => !closed(r) && r.severity === 'Critical').length,
      pendingReview: rows.filter(r => r.status === 'REPORTED').length,
      resolved: resolved.length,
      resolutionRate: rows.length ? Math.round((resolved.length / rows.length) * 100) : 0,
      avgResponseMin: avg(resolved.concat(rows.filter(r => r.onSiteAt && r.status !== 'RESOLVED')).map(r => mins(r.createdAt, r.onSiteAt))),
      avgResolutionMin: avg(resolved.map(r => mins(r.createdAt, r.resolvedAt))),
      avgRating: avg(rows.map(r => r.rating))
    },
    byType: count('type', ['Accident', 'Fire', 'Medical Emergency', 'Infrastructure Failure', 'Other']),
    bySeverity: count('severity', ['Critical', 'High', 'Medium', 'Low']),
    byStatus: count('status', ['REPORTED', 'VERIFIED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SITE', 'RESOLVED', 'REJECTED']),
    daily,
    teams: teams.map(t => {
      const mine = rows.filter(r => r.teamId === t.id), done = mine.filter(r => r.status === 'RESOLVED');
      return { id: t.id, name: t.name, handled: mine.length, resolved: done.length, avgResponseMin: avg(done.map(r => mins(r.createdAt, r.onSiteAt))), avgRating: avg(done.map(r => r.rating)) };
    })
  });
});

export default router;
