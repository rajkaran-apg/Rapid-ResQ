import crypto from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
export const uid = () => crypto.randomUUID();
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Unguessable public incident id, e.g. RR-7K3M9QXD */
export const newIncidentId = () => 'RR-' + Array.from(crypto.randomBytes(8), b => ALPH[b % ALPH.length]).join('');

export function parse(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) {
    const msg = r.error.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ');
    throw new HttpError(400, msg);
  }
  return r.data;
}
