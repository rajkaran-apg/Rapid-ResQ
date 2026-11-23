import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { initDb, q } from '../db.js';
import { createApp } from '../app.js';
import { hashPassword } from '../auth.js';
import { outbox } from '../mailer.js';
import { uid } from '../http.js';

let app; const tokens = {}; let team1, team2, incId;
const lastCode = to => { const m = [...outbox].reverse().find(o => o.to === to); return m.text.match(/\d{6}/)[0]; };

async function mkUser(role, email, teamId = null) {
  await q('insert into users(id,name,email,password_hash,role,team_id,email_verified) values($1,$2,$3,$4,$5,$6,true)', [uid(), role + ' User', email, await hashPassword('Passw0rd!'), role, teamId]);
}
async function login(email) {
  const a = await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd!' });
  assert.equal(a.body.step, 'otp');
  const b = await request(app).post('/api/auth/login/verify').send({ email, code: lastCode(email) });
  assert.equal(b.status, 200);
  return b.body.token;
}
const as = (t) => ({ Authorization: 'Bearer ' + t });

before(async () => {
  await initDb(); app = createApp();
  team1 = uid(); team2 = uid();
  await q("insert into teams(id,name,base) values($1,'Alpha','Palasia'),($2,'Bravo','Rau')", [team1, team2]);
  await mkUser('ADMIN', 'admin@t.in'); await mkUser('DISPATCHER', 'disp@t.in'); await mkUser('VIEWER', 'view@t.in');
  await mkUser('RESPONDER', 'resp1@t.in', team1); await mkUser('RESPONDER', 'resp2@t.in', team2);
  for (const [k, e] of [['admin', 'admin@t.in'], ['disp', 'disp@t.in'], ['view', 'view@t.in'], ['r1', 'resp1@t.in'], ['r2', 'resp2@t.in']]) tokens[k] = await login(e);
});

test('MFA: wrong password rejected, wrong OTP rejected, no token without OTP', async () => {
  const bad = await request(app).post('/api/auth/login').send({ email: 'admin@t.in', password: 'nope' });
  assert.equal(bad.status, 401);
  await request(app).post('/api/auth/login').send({ email: 'admin@t.in', password: 'Passw0rd!' });
  const wrong = await request(app).post('/api/auth/login/verify').send({ email: 'admin@t.in', code: '000000' });
  assert.equal(wrong.status, 401);
  assert.equal((await request(app).get('/api/incidents')).status, 401);
});

test('registration needs email verification, then works', async () => {
  const r = await request(app).post('/api/auth/register').send({ name: 'New Person', email: 'new@t.in', password: 'Abcdef12' });
  assert.equal(r.status, 201);
  const l = await request(app).post('/api/auth/login').send({ email: 'new@t.in', password: 'Abcdef12' });
  assert.equal(l.body.step, 'verify');
  const v = await request(app).post('/api/auth/verify-email').send({ email: 'new@t.in', code: lastCode('new@t.in') });
  assert.equal(v.status, 200);
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'new@t.in', password: 'Abcdef12' })).body.step, 'otp');
});

test('password reset flow', async () => {
  await request(app).post('/api/auth/forgot').send({ email: 'view@t.in' });
  const r = await request(app).post('/api/auth/reset').send({ email: 'view@t.in', code: lastCode('view@t.in'), password: 'NewPass123' });
  assert.equal(r.status, 200);
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'view@t.in', password: 'NewPass123' })).body.step, 'otp');
});

test('citizen reports an incident (validation + AI triage + email)', async () => {
  const bad = await request(app).post('/api/incidents').send({ type: 'Fire' });
  assert.equal(bad.status, 400);
  const r = await request(app).post('/api/incidents').send({
    type: 'Fire', description: 'Building on fire, people trapped on the upper floors screaming', address: 'Vijay Nagar, Indore',
    lat: 22.75, lng: 75.89, reporterName: 'Asha', reporterPhone: '9876543210', reporterEmail: 'asha@t.in'
  });
  assert.equal(r.status, 201); incId = r.body.id;
  assert.match(incId, /^RR-[A-Z0-9]{8}$/);
  assert.ok(outbox.some(o => o.to === 'asha@t.in'));
  const [row] = await q('select ai_type, ai_severity, ai_confidence from incidents where id=$1', [incId]);
  assert.equal(row.aiType, 'Fire'); assert.ok(row.aiConfidence > 0);
  const pub = await request(app).get('/api/track/' + incId);
  assert.equal(pub.status, 200); assert.equal(pub.body.reporterPhone, undefined);
});

test('RBAC enforced by backend + denials audited', async () => {
  for (const [who, path] of [['view', 'verify'], ['disp', 'verify'], ['r1', 'verify']]) {
    const r = await request(app).post(`/api/incidents/${incId}/verify`).set(as(tokens[who])).send({ severity: 'High' });
    assert.equal(r.status, 403, who);
  }
  assert.equal((await request(app).get('/api/admin/users').set(as(tokens.disp))).status, 403);
  assert.equal((await request(app).get('/api/admin/audit').set(as(tokens.view))).status, 403);
  const a = await request(app).get('/api/admin/audit?outcome=DENIED').set(as(tokens.admin));
  assert.ok(a.body.total >= 4);
  // viewer sees no reporter contact
  const v = await request(app).get('/api/incidents').set(as(tokens.view));
  assert.equal(v.body.items[0].reporterPhone, undefined);
  const ad = await request(app).get('/api/incidents').set(as(tokens.admin));
  assert.equal(ad.body.items[0].reporterPhone, '9876543210');
});

test('full lifecycle: verify → assign → accept → en route → on site → resolve → review', async () => {
  // cannot assign before verification
  assert.equal((await request(app).post(`/api/incidents/${incId}/assign`).set(as(tokens.disp)).send({ teamId: team1 })).status, 400);
  const v = await request(app).post(`/api/incidents/${incId}/verify`).set(as(tokens.admin)).send({ severity: 'Critical' });
  assert.equal(v.status, 200);
  const as1 = await request(app).post(`/api/incidents/${incId}/assign`).set(as(tokens.disp)).send({ teamId: team1 });
  assert.equal(as1.status, 200);
  // team is now busy → cannot double-book
  assert.equal((await request(app).post(`/api/incidents/${incId}/assign`).set(as(tokens.disp)).send({ teamId: team1 })).status, 400);
  // responder of the OTHER team is blocked, own team allowed
  assert.equal((await request(app).post(`/api/incidents/${incId}/status`).set(as(tokens.r2)).send({ status: 'ACCEPTED' })).status, 403);
  assert.equal((await request(app).get(`/api/incidents/${incId}`).set(as(tokens.r2))).status, 403);
  assert.equal((await request(app).get('/api/incidents').set(as(tokens.r2))).body.total, 0);
  // skipping steps is rejected
  assert.equal((await request(app).post(`/api/incidents/${incId}/status`).set(as(tokens.r1)).send({ status: 'ON_SITE' })).status, 400);
  for (const s of ['ACCEPTED', 'EN_ROUTE', 'ON_SITE', 'RESOLVED'])
    assert.equal((await request(app).post(`/api/incidents/${incId}/status`).set(as(tokens.r1)).send({ status: s, note: 'ok' })).status, 200, s);
  const [t] = await q('select status from teams where id=$1', [team1]);
  assert.equal(t.status, 'AVAILABLE');
  const rv = await request(app).post(`/api/track/${incId}/review`).send({ rating: 5, review: 'Fast response' });
  assert.equal(rv.status, 200);
  assert.equal((await request(app).post(`/api/track/${incId}/review`).send({ rating: 4 })).status, 409);
  assert.ok(outbox.some(o => o.to === 'resp1@t.in' && o.subject.includes('assignment')));
  const ev = await request(app).get(`/api/incidents/${incId}`).set(as(tokens.admin));
  assert.equal(ev.body.events.filter(e => e.status).length, 7);
});

test('audit trail captures priority + AI decision; filters and analytics work', async () => {
  const a = await request(app).get('/api/admin/audit?q=verified').set(as(tokens.admin));
  assert.ok(a.body.items.some(i => /AI suggested/.test(i.detail || '')));
  const f = await request(app).get('/api/incidents?status=RESOLVED&type=Fire&severity=Critical&location=vijay').set(as(tokens.admin));
  assert.equal(f.body.total, 1);
  const none = await request(app).get('/api/incidents?status=active').set(as(tokens.admin));
  assert.equal(none.body.total, 0);
  const an = await request(app).get('/api/analytics').set(as(tokens.view));
  assert.equal(an.body.kpis.resolved, 1); assert.equal(an.body.kpis.avgRating, 5); assert.equal(an.body.daily.length, 14);
});

test('admin manages users and teams; cannot demote self', async () => {
  const c = await request(app).post('/api/admin/users').set(as(tokens.admin)).send({ name: 'Raju R', email: 'raju@t.in', role: 'RESPONDER', teamId: team2 });
  assert.equal(c.status, 201);
  assert.ok(outbox.some(o => o.to === 'raju@t.in' && o.subject.includes('invited')));
  assert.equal((await request(app).post('/api/admin/users').set(as(tokens.admin)).send({ name: 'No Team', email: 'x@t.in', role: 'RESPONDER' })).status, 400);
  const me = (await request(app).get('/api/auth/me').set(as(tokens.admin))).body;
  assert.equal((await request(app).patch('/api/admin/users/' + me.id).set(as(tokens.admin)).send({ role: 'VIEWER' })).status, 400);
  assert.equal((await request(app).post('/api/admin/teams').set(as(tokens.admin)).send({ name: 'Charlie', base: 'MG Road' })).status, 201);
  // deactivated users lose access immediately
  const u = (await request(app).get('/api/admin/users').set(as(tokens.admin))).body.find(x => x.email === 'resp2@t.in');
  await request(app).patch('/api/admin/users/' + u.id).set(as(tokens.admin)).send({ active: false });
  assert.equal((await request(app).get('/api/incidents').set(as(tokens.r2))).status, 401);
});

test('account locks after 5 wrong passwords', async () => {
  await mkUser('VIEWER', 'lock@t.in');
  for (let i = 0; i < 5; i++) await request(app).post('/api/auth/login').send({ email: 'lock@t.in', password: 'wrong' + i });
  const r = await request(app).post('/api/auth/login').send({ email: 'lock@t.in', password: 'Passw0rd!' });
  assert.equal(r.status, 429);
});
