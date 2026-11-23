import { q } from '../db.js';
import { uid, HttpError } from '../http.js';
import { emit } from '../realtime.js';
import { fireMail } from '../mailer.js';
import { config } from '../config.js';

export const FLOW = ['REPORTED', 'VERIFIED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SITE', 'RESOLVED'];
export const LABEL = {
  REPORTED: 'Incident reported', VERIFIED: 'Verified by admin', ASSIGNED: 'Response team assigned', ACCEPTED: 'Accepted by responder',
  EN_ROUTE: 'Responder en route', ON_SITE: 'Responder on site', RESOLVED: 'Incident resolved', REJECTED: 'Report rejected'
};
const TS = { VERIFIED: 'verified_at', ASSIGNED: 'assigned_at', ACCEPTED: 'accepted_at', EN_ROUTE: 'en_route_at', ON_SITE: 'on_site_at', RESOLVED: 'resolved_at' };
const COLS = `id,type,severity,status,title,description,address,lat,lng,reporter_name,reporter_phone,reporter_email,team_id,
  ai_type,ai_severity,ai_confidence,ai_decision,created_at,verified_at,assigned_at,accepted_at,en_route_at,on_site_at,resolved_at,rating,review`;
export const INCIDENT_COLS = COLS;

export const getIncident = async id => (await q(`select ${COLS} from incidents where id=$1`, [id]))[0];
export const mustGetIncident = async id => {
  const i = await getIncident(id);
  if (!i) throw new HttpError(404, 'Incident not found');
  return i;
};
export const getEvents = id => q('select id,at,status,label,actor_name,actor_role,note from incident_events where incident_id=$1 order by at asc, id asc', [id]);

/** What each staff role may see. Viewers never see reporter contact details. */
export function staffView(inc, role) {
  if (role !== 'VIEWER') return inc;
  const { reporterName, reporterPhone, reporterEmail, ...rest } = inc;
  return rest;
}

export async function publicView(inc) {
  const [team] = inc.teamId ? await q('select name from teams where id=$1', [inc.teamId]) : [];
  const events = (await getEvents(inc.id)).filter(e => e.status).map(e => ({ at: e.at, status: e.status, label: e.label }));
  return {
    id: inc.id, type: inc.type, status: inc.status, title: inc.title, address: inc.address, createdAt: inc.createdAt,
    resolvedAt: inc.resolvedAt, teamName: team?.name || null, severity: inc.severity, rating: inc.rating, events
  };
}

/** Push the fresh incident to everyone allowed to see it, each in their own redacted form. */
export async function broadcast(id, event = 'incident:update') {
  const inc = await getIncident(id);
  if (!inc) return;
  emit('role:ADMIN', event, staffView(inc, 'ADMIN'));
  emit('role:DISPATCHER', event, staffView(inc, 'DISPATCHER'));
  emit('role:VIEWER', event, staffView(inc, 'VIEWER'));
  if (inc.teamId) emit('team:' + inc.teamId, event, inc);
  emit('track:' + inc.id, 'track:update', await publicView(inc));
}
export const broadcastTeams = async () => {
  const teams = await q('select id,name,base,status from teams order by name');
  for (const r of ['ADMIN', 'DISPATCHER', 'VIEWER', 'RESPONDER']) emit('role:' + r, 'team:update', teams);
};

export async function addEvent(incidentId, status, label, actor, note = null) {
  await q('insert into incident_events(id,incident_id,status,label,actor_name,actor_role,note) values($1,$2,$3,$4,$5,$6,$7)',
    [uid(), incidentId, status, label, actor?.name || 'System', actor?.role || 'SYSTEM', note]);
}

/** In-app notification stored for later + pushed live. audience: 'ops' | 'team:<id>' */
export async function notify(audience, title, body, level = 'info', incidentId = null) {
  const n = { id: uid(), audience, title, body, level, incidentId, at: new Date().toISOString() };
  await q('insert into notifications(id,audience,title,body,level,incident_id) values($1,$2,$3,$4,$5,$6)', [n.id, audience, title, body, level, incidentId]);
  if (audience === 'ops') { emit('role:ADMIN', 'notification', n); emit('role:DISPATCHER', 'notification', n); }
  else emit(audience, 'notification', n);
}

/** Atomic status change (fails with 409 if someone else moved the incident first). */
export async function moveTo(inc, status, actor, note = null) {
  const col = TS[status] ? `, ${TS[status]}=now()` : '';
  const done = await q(`update incidents set status=$2${col} where id=$1 and status=$3 returning id`, [inc.id, status, inc.status]);
  if (!done.length) throw new HttpError(409, 'Incident was updated by someone else — refresh and retry');
  await addEvent(inc.id, status, LABEL[status], actor, note);
}

export const trackLink = id => `${config.clientUrl || 'http://localhost:5173'}/#/track/${id}`;

export function emailReporter(inc, subject, text) {
  fireMail(inc.reporterEmail, subject, `${text}\n\nIncident ID: ${inc.id}\nTrack live: ${trackLink(inc.id)}\n\n— RapidResQ`);
}
export async function emailTeam(teamId, subject, text) {
  const members = await q("select email from users where team_id=$1 and active=true and role='RESPONDER'", [teamId]);
  members.forEach(m => fireMail(m.email, subject, text));
}
