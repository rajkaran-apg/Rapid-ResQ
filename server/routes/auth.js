import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { q } from '../db.js';
import { HttpError, parse, uid } from '../http.js';
import { authenticate, signToken, hashPassword, checkPassword, issueOtp, consumeOtp } from '../auth.js';
import { sendMail } from '../mailer.js';
import { audit } from '../audit.js';
import { config } from '../config.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, skip: () => config.env === 'test', message: { error: 'Too many attempts. Try again in a few minutes.' } });
router.use(limiter);

const email = z.string().trim().toLowerCase().email();
const password = z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Za-z]/, 'Password needs a letter').regex(/\d/, 'Password needs a number');
const code = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, teamId: u.teamId });
const findByEmail = async e => (await q('select * from users where email=$1', [e]))[0];

async function mailCode(user, purpose, ttl, subject, intro) {
  const c = await issueOtp(user.id, purpose, ttl);
  const ok = await sendMail(user.email, subject, `Hello ${user.name},\n\n${intro}\n\n    ${c}\n\nThis code is valid for ${ttl >= 60 ? Math.round(ttl / 60) + ' hours' : ttl + ' minutes'}. If you did not request it, ignore this email.\n\n— RapidResQ`);
  if (!ok) throw new HttpError(503, 'Could not send email right now. Please try again.');
}
export const sendInvite = user => mailCode(user, 'RESET', 72 * 60, 'You have been invited to RapidResQ', 'An administrator created a RapidResQ account for you. In the app choose "Forgot password" and use this code to set your password:');

// Self-registration creates a read-only VIEWER account (admins can change the role later).
router.post('/register', async (req, res) => {
  const b = parse(z.object({ name: z.string().trim().min(2).max(80), email, phone: z.string().trim().max(20).optional(), password }), req.body);
  if (await findByEmail(b.email)) throw new HttpError(409, 'An account with this email already exists');
  const user = { id: uid(), name: b.name, email: b.email, role: 'VIEWER' };
  await q('insert into users(id,name,email,phone,password_hash,role) values($1,$2,$3,$4,$5,$6)', [user.id, b.name, b.email, b.phone || null, await hashPassword(b.password), 'VIEWER']);
  await mailCode(user, 'VERIFY', 30, 'Verify your RapidResQ account', 'Use this code to verify your email address:');
  await audit(user, 'Account registered', { ip: req.ip });
  res.status(201).json({ ok: true });
});

router.post('/resend-verification', async (req, res) => {
  const { email: e } = parse(z.object({ email }), req.body);
  const u = await findByEmail(e);
  if (u && !u.emailVerified) await mailCode(u, 'VERIFY', 30, 'Verify your RapidResQ account', 'Use this code to verify your email address:');
  res.json({ ok: true });
});

router.post('/verify-email', async (req, res) => {
  const b = parse(z.object({ email, code }), req.body);
  const u = await findByEmail(b.email);
  if (!u || !(await consumeOtp(u.id, 'VERIFY', b.code))) throw new HttpError(400, 'Invalid or expired code');
  await q('update users set email_verified=true where id=$1', [u.id]);
  await audit(u, 'Email verified', { ip: req.ip });
  res.json({ ok: true });
});

// Step 1: password → emails a one-time code (MFA)
router.post('/login', async (req, res) => {
  const b = parse(z.object({ email, password: z.string().min(1) }), req.body);
  const u = await findByEmail(b.email);
  const fail = async (status, msg) => { await audit(u || { name: b.email, role: '-' }, 'Failed login', { outcome: 'FAILED', detail: msg, ip: req.ip }); throw new HttpError(status, msg); };
  if (!u || !u.active) return fail(401, 'Invalid email or password');
  if (u.lockedUntil && new Date(u.lockedUntil) > new Date()) return fail(429, 'Account temporarily locked after too many failed attempts. Try again in 15 minutes.');
  if (!(await checkPassword(b.password, u.passwordHash))) {
    const attempts = u.failedAttempts + 1;
    if (attempts >= 5) await q('update users set failed_attempts=0, locked_until=$2 where id=$1', [u.id, new Date(Date.now() + 15 * 60000)]);
    else await q('update users set failed_attempts=$2 where id=$1', [u.id, attempts]);
    return fail(401, 'Invalid email or password');
  }
  await q('update users set failed_attempts=0, locked_until=null where id=$1', [u.id]);
  if (!u.emailVerified) {
    await mailCode(u, 'VERIFY', 30, 'Verify your RapidResQ account', 'Use this code to verify your email address:');
    return res.json({ step: 'verify' });
  }
  await mailCode(u, 'LOGIN', 10, 'Your RapidResQ login code', 'Your one-time login code is:');
  res.json({ step: 'otp' });
});

// Step 2: code → session token
router.post('/login/verify', async (req, res) => {
  const b = parse(z.object({ email, code }), req.body);
  const u = await findByEmail(b.email);
  if (!u || !u.active || !u.emailVerified || !(await consumeOtp(u.id, 'LOGIN', b.code))) {
    await audit(u || { name: b.email, role: '-' }, 'Failed MFA code', { outcome: 'FAILED', ip: req.ip });
    throw new HttpError(401, 'Invalid or expired code');
  }
  await audit(u, 'Login', { ip: req.ip });
  res.json({ token: signToken(u), user: publicUser(u) });
});

router.post('/forgot', async (req, res) => {
  const { email: e } = parse(z.object({ email }), req.body);
  const u = await findByEmail(e);
  if (u && u.active) await mailCode(u, 'RESET', 30, 'Reset your RapidResQ password', 'Use this code to set a new password:');
  res.json({ ok: true }); // same answer whether or not the account exists
});

router.post('/reset', async (req, res) => {
  const b = parse(z.object({ email, code, password }), req.body);
  const u = await findByEmail(b.email);
  if (!u || !(await consumeOtp(u.id, 'RESET', b.code))) throw new HttpError(400, 'Invalid or expired code');
  await q('update users set password_hash=$2, email_verified=true, failed_attempts=0, locked_until=null where id=$1', [u.id, await hashPassword(b.password)]);
  await audit(u, 'Password reset', { ip: req.ip });
  res.json({ ok: true });
});

router.get('/me', authenticate, (req, res) => res.json(publicUser(req.user)));
router.post('/logout', authenticate, async (req, res) => { await audit(req.user, 'Logout', { ip: req.ip }); res.json({ ok: true }); });

export default router;
