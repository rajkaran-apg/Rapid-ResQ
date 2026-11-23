import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { q } from './db.js';
import { uid } from './http.js';
import { audit } from './audit.js';

export const signToken = user => jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '8h' });
export const hashPassword = pw => bcrypt.hash(pw, 10);
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash);

export async function userFromToken(token) {
  try {
    const { sub } = jwt.verify(token, config.jwtSecret);
    const [u] = await q('select id,name,email,phone,role,team_id,active,email_verified from users where id=$1', [sub]);
    return u && u.active ? u : null;
  } catch { return null; }
}

/** Every protected route re-reads the user, so role changes / deactivation apply immediately. */
export async function authenticate(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const u = await userFromToken(token);
  if (!u) return res.status(401).json({ error: 'Please log in again' });
  req.user = u; next();
}

/** Server-side RBAC. Failures are written to the audit log. */
export const requireRole = (...roles) => (req, res, next) => {
  if (roles.includes(req.user.role)) return next();
  audit(req.user, 'Permission denied', { detail: `${req.method} ${req.originalUrl}`, outcome: 'DENIED', ip: req.ip });
  res.status(403).json({ error: 'Access denied for your role' });
};

// ---------- email OTP ----------
const mac = code => crypto.createHmac('sha256', config.jwtSecret).update(code).digest('hex');

export async function issueOtp(userId, purpose, ttlMinutes = 10) {
  const code = String(crypto.randomInt(100000, 1000000));
  await q('delete from otps where user_id=$1 and purpose=$2', [userId, purpose]);
  await q('insert into otps(id,user_id,purpose,code_hash,expires_at) values($1,$2,$3,$4,$5)',
    [uid(), userId, purpose, mac(code), new Date(Date.now() + ttlMinutes * 60000)]);
  return code;
}

export async function consumeOtp(userId, purpose, code) {
  const [row] = await q('select * from otps where user_id=$1 and purpose=$2', [userId, purpose]);
  if (!row || new Date(row.expiresAt) < new Date()) return false;
  if (row.attempts >= 5) { await q('delete from otps where id=$1', [row.id]); return false; }
  const ok = crypto.timingSafeEqual(Buffer.from(mac(String(code))), Buffer.from(row.codeHash));
  if (!ok) { await q('update otps set attempts=attempts+1 where id=$1', [row.id]); return false; }
  await q('delete from otps where id=$1', [row.id]);
  return true;
}
