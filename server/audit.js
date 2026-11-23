import { q } from './db.js';
import { uid } from './http.js';
import { emit } from './realtime.js';

/** Record who did what, when, on which incident. Never throws. */
export async function audit(actor, action, { incidentId = null, detail = null, outcome = 'SUCCESS', ip = null } = {}) {
  try {
    const row = { id: uid(), actorId: actor?.id ?? null, actorName: actor?.name ?? 'Anonymous', actorRole: actor?.role ?? 'PUBLIC', action, incidentId, detail, outcome, ip };
    await q('insert into audit_logs(id,actor_id,actor_name,actor_role,action,incident_id,detail,outcome,ip) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [row.id, row.actorId, row.actorName, row.actorRole, action, incidentId, detail, outcome, ip]);
    emit('role:ADMIN', 'audit:new', { ...row, at: new Date().toISOString() });
  } catch (e) { console.error('audit failed', e.message); }
}
