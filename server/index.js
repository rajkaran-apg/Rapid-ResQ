import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET = process.env.JWT_SECRET || 'dev-only-secret';
const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CLIENT_URL || true;
const app = express();
app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: '3mb' }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ORIGIN } });

const ORDER = ['Reported', 'Verified', 'Assigned', 'Accepted', 'En Route', 'On Site', 'Responding', 'Resolved'];
const LABEL = { Reported: 'Incident Reported', Verified: 'Verified by Admin', Assigned: 'Team Assigned', Accepted: 'Accepted by Responder', 'En Route': 'Responder En Route', 'On Site': 'Arrived On Site', Responding: 'Responding', Resolved: 'Incident Resolved' };
const NOTE = { Verified: ['🔵', 'blue', 'Incident Verified'], Assigned: ['🟠', 'orange', 'Team Assigned'], Accepted: ['🔵', 'blue', 'Responder Accepted'], 'En Route': ['🔵', 'blue', 'Responder En Route'], 'On Site': ['🔵', 'blue', 'Responder On Site'], Responding: ['🟣', 'purple', 'Response In Progress'], Resolved: ['🟢', 'green', 'Incident Resolved'] };
const LOCS = ['Vijay Nagar', 'Palasia', 'Bhawarkua', 'Rau', 'Rajendra Nagar', 'MG Road'];
const TYPES = ['Accident', 'Fire', 'Medical Emergency', 'Infrastructure Failure', 'Other'];
const SEVS = ['Low', 'Medium', 'High', 'Critical'];
const DESC = {
  Accident: 'Vehicle collision reported, possible injuries and traffic blockage.',
  Fire: 'Smoke and flames visible in a commercial building; people evacuating.',
  'Medical Emergency': 'Person collapsed and unresponsive; bystanders requesting an ambulance.',
  'Infrastructure Failure': 'Water main burst / road cave-in affecting nearby traffic.',
  Other: 'Hazardous situation reported by a citizen; needs inspection.'
};

// ---------- in-memory "database" (swap for MongoDB / Supabase later) ----------
const hash = bcrypt.hashSync(process.env.DEMO_PASSWORD || 'Demo@123', 8);
const users = [
  ['Anita Sharma', 'admin@rapidresq.demo', 'ADMIN'],
  ['Sana Khan', 'admin2@rapidresq.demo', 'ADMIN'],
  ['Rohit Verma', 'dispatcher@rapidresq.demo', 'DISPATCHER'],
  ['Pooja Iyer', 'dispatcher2@rapidresq.demo', 'DISPATCHER'],
  ['Karan Singh', 'responder@rapidresq.demo', 'RESPONDER', 'T1'],
  ['Vikas Patel', 'bravo@rapidresq.demo', 'RESPONDER', 'T2'],
  ['Aman Rao', 'charlie@rapidresq.demo', 'RESPONDER', 'T3'],
  ['Meera Joshi', 'viewer@rapidresq.demo', 'VIEWER'],
  ['Deepak Yadav', 'viewer2@rapidresq.demo', 'VIEWER']
].map(([name, email, role, team]) => ({ name, email, role, team, hash }));
const teams = [['T1', 'Alpha', 'Palasia', 42, 7.2], ['T2', 'Bravo', 'MG Road', 35, 8.9], ['T3', 'Charlie', 'Rau', 28, 8.1], ['T4', 'Delta', 'Bhawarkua', 31, 7.8], ['T5', 'Echo', 'Vijay Nagar', 22, 9.4]]
  .map(([id, name, loc, resolved, avgResp]) => ({ id, name: 'Team ' + name, loc, status: 'Available', resolved, avgResp }));
let incidents = [], notifs = [], emails = [], audit = [], series = [], seq = 1029, nid = 0;

// ---------- services ----------
const stamp = () => new Date().toISOString();
const log = (u, action, incident = '') => { audit.unshift({ id: ++nid, t: stamp(), user: u.name, role: u.role, action, incident }); audit.length = Math.min(audit.length, 300); };
const notify = (title, msg, level) => { const n = { id: ++nid, t: stamp(), title, msg, level }; notifs.unshift(n); notifs.length = Math.min(notifs.length, 50); io.to('staff').emit('toast', n); };
// Email simulator: replace body of this function with Nodemailer / SendGrid / Resend call
const sendEmail = (to, subject, body) => emails.unshift({ id: ++nid, t: stamp(), to, subject, body });
const snap = () => ({ incidents, teams, notifs, emails, audit, series });
const sync = () => io.to('staff').emit('sync', snap());
const pub = i => ({ ...i, contact: undefined, image: undefined, teamName: teams.find(t => t.id === i.team)?.name });
const touch = i => { io.to('track:' + i.id).emit('incident', pub(i)); sync(); };
const avgResp = () => +(teams.reduce((a, t) => a + t.avgResp, 0) / teams.length).toFixed(1);
const point = () => { series.push({ t: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), reported: incidents.length, resolved: incidents.filter(i => i.status === 'Resolved').length, resp: avgResp() }); if (series.length > 30) series.shift(); };

function report(o, actor) {
  const id = `INC-2026-${++seq}`;
  const i = { id, notes: [], team: null, status: 'Reported', createdAt: stamp(), timeline: [{ t: stamp(), s: LABEL.Reported, by: actor.name }], ...o };
  incidents.unshift(i);
  log(actor, 'Created incident', id);
  notify(`${i.severity === 'Critical' ? '🔴' : '🟠'} ${i.severity} Incident Reported`, `${id} — ${i.type} — ${i.location}`, i.severity === 'Critical' ? 'red' : 'orange');
  sendEmail(i.contact, `Incident ${id} reported`, `Your ${i.type} report at ${i.location} was received. Track it with ID ${id}.`);
  point(); touch(i); return i;
}
function setStatus(i, status, actor, note) {
  i.status = status;
  i.timeline.push({ t: stamp(), s: LABEL[status], by: actor.name });
  if (note) i.notes.push({ t: stamp(), by: actor.name, text: note });
  const tm = teams.find(t => t.id === i.team);
  if (status === 'En Route') i.respMin = +(5 + Math.random() * 5).toFixed(1);
  if (status === 'Resolved') {
    i.resolvedAt = stamp();
    if (tm) { tm.avgResp = +((tm.avgResp * tm.resolved + (i.respMin || 7)) / (tm.resolved + 1)).toFixed(1); tm.resolved++; tm.status = 'Available'; }
    point();
    sendEmail(i.contact, `Incident ${i.id} resolved`, 'Responders have resolved your reported incident. Thank you for reporting.');
  }
  log(actor, status === 'Resolved' ? 'Resolved incident' : status === 'Verified' ? 'Verified incident' : `Status → ${status}`, i.id);
  const [e, level, title] = NOTE[status];
  notify(`${e} ${title}`, `${i.id} — ${i.type} — ${i.location}${tm ? ' · ' + tm.name : ''}`, level);
  touch(i);
}
function assign(i, teamId, actor) {
  const tm = teams.find(t => t.id === teamId);
  if (!tm) return 'Unknown team';
  if (i.status !== 'Verified') return 'Incident must be verified before assignment';
  if (tm.status !== 'Available') return `${tm.name} is busy`;
  tm.status = 'Busy'; i.team = tm.id;
  sendEmail(i.contact, `Team assigned to ${i.id}`, `${tm.name} has been assigned to your incident.`);
  setStatus(i, 'Assigned', actor);
  return null;
}
function seed(type, location, severity, status, team, ago) {
  const base = Date.now() - ago * 60000, id = `INC-2026-${++seq}`, k = ORDER.indexOf(status);
  const timeline = ORDER.slice(0, k + 1).map((s, n) => ({ t: new Date(base + n * 2 * 60000).toISOString(), s: LABEL[s], by: n === 0 ? 'Citizen' : 'System' }));
  incidents.push({ id, type, location, severity, title: `${type} near ${location}`, description: DESC[type], contact: `citizen${seq}@demo.in`, status, team, notes: [], timeline, createdAt: new Date(base).toISOString(), respMin: k >= 4 ? +(5 + Math.random() * 5).toFixed(1) : undefined, resolvedAt: status === 'Resolved' ? timeline[k].t : undefined });
  if (team && status !== 'Resolved') teams.find(t => t.id === team).status = 'Busy';
}
[['Fire', 'Palasia', 'High', 'On Site', 'T2', 28], ['Accident', 'MG Road', 'High', 'Reported', null, 5], ['Medical Emergency', 'Bhawarkua', 'Critical', 'Verified', null, 8],
 ['Infrastructure Failure', 'Rau', 'Medium', 'Responding', 'T3', 40], ['Accident', 'Rajendra Nagar', 'Low', 'Resolved', 'T4', 150], ['Medical Emergency', 'Vijay Nagar', 'Critical', 'Resolved', 'T1', 200],
 ['Fire', 'Rau', 'High', 'Resolved', 'T5', 240], ['Other', 'Palasia', 'Low', 'Reported', null, 3], ['Accident', 'Vijay Nagar', 'Medium', 'Resolved', 'T2', 300],
 ['Infrastructure Failure', 'MG Road', 'Medium', 'Resolved', 'T3', 330], ['Medical Emergency', 'Rajendra Nagar', 'High', 'Resolved', 'T4', 360], ['Accident', 'Bhawarkua', 'High', 'Resolved', 'T1', 400]]
  .forEach(r => seed(...r));
incidents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
for (let k = 6; k >= 1; k--) series.push({ t: `-${k * 5}m`, reported: 6 + (6 - k), resolved: 3 + Math.floor((6 - k) / 2), resp: +(8.4 - (6 - k) * 0.1).toFixed(1) });
point();
log({ name: 'System', role: '-' }, 'Server started');

// ---------- auth + RBAC ----------
const auth = (...roles) => (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); }
  catch { return res.status(401).json({ error: '401 — Please log in' }); }
  if (roles.length && !roles.includes(req.user.role)) {
    log(req.user, `Permission denied: ${req.method} ${req.originalUrl.replace('/api', '')}`); sync();
    return res.status(403).json({ error: '403 — Access Denied' });
  }
  next();
};
const mfa = new Map();
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const u = users.find(x => x.email === email);
  if (!u || !bcrypt.compareSync(password || '', u.hash)) { log({ name: email || 'unknown', role: '-' }, 'Failed login'); sync(); return res.status(401).json({ error: 'Invalid email or password' }); }
  const otp = String(Math.floor(100000 + Math.random() * 900000)), mfaToken = Math.random().toString(36).slice(2);
  mfa.set(mfaToken, { u, otp, exp: Date.now() + 5 * 60000 });
  sendEmail(u.email, 'Your RapidResQ verification code', `DEMO OTP: ${otp} (valid 5 minutes)`); sync();
  res.json({ mfaToken, demoOtp: otp });
});
app.post('/api/verify', (req, res) => {
  const m = mfa.get(req.body.mfaToken);
  if (!m || m.exp < Date.now() || m.otp !== req.body.otp) return res.status(401).json({ error: 'Invalid or expired OTP' });
  mfa.delete(req.body.mfaToken);
  const { u } = m, user = { id: u.email, name: u.name, role: u.role, team: u.team, email: u.email };
  log(u, 'Login'); sync();
  res.json({ token: jwt.sign(user, SECRET, { expiresIn: '8h' }), user });
});
app.post('/api/logout', auth(), (req, res) => { log(req.user, 'Logout'); sync(); res.json({ ok: true }); });
app.get('/api/state', auth(), (req, res) => res.json(snap()));

// ---------- incidents ----------
const find = (req, res) => { const i = incidents.find(x => x.id === req.params.id); if (!i) res.status(404).json({ error: 'Incident not found' }); return i; };
app.post('/api/incidents', (req, res) => {   // public: citizen report
  const { type, title, description, location, severity, contact, image } = req.body;
  if (!TYPES.includes(type) || !SEVS.includes(severity) || !title || !location || !contact) return res.status(400).json({ error: 'Missing or invalid fields' });
  const i = report({ type, title, description: description || '', location, severity, contact, image }, { name: 'Citizen', role: 'PUBLIC' });
  res.json({ id: i.id });
});
app.get('/api/track/:id', (req, res) => { const i = incidents.find(x => x.id === req.params.id.toUpperCase()); i ? res.json(pub(i)) : res.status(404).json({ error: 'Incident not found' }); });
app.post('/api/incidents/:id/verify', auth('ADMIN'), (req, res) => {
  const i = find(req, res); if (!i) return;
  if (i.status !== 'Reported') return res.status(400).json({ error: 'Already verified' });
  setStatus(i, 'Verified', req.user); res.json({ ok: true });
});
app.post('/api/incidents/:id/assign', auth('ADMIN', 'DISPATCHER'), (req, res) => {
  const i = find(req, res); if (!i) return;
  const err = assign(i, req.body.teamId, req.user);
  err ? res.status(400).json({ error: err }) : res.json({ ok: true });
});
app.post('/api/incidents/:id/priority', auth('ADMIN'), (req, res) => {
  const i = find(req, res); if (!i) return;
  if (!SEVS.includes(req.body.severity)) return res.status(400).json({ error: 'Bad severity' });
  log(req.user, `Priority ${i.severity} → ${req.body.severity}`, i.id); i.severity = req.body.severity; touch(i); res.json({ ok: true });
});
app.post('/api/incidents/:id/status', auth('RESPONDER', 'ADMIN'), (req, res) => {
  const i = find(req, res); if (!i) return;
  const { status, note } = req.body;
  if (req.user.role === 'RESPONDER' && i.team !== req.user.team) { log(req.user, 'Permission denied: not your assignment', i.id); sync(); return res.status(403).json({ error: '403 — Access Denied (not your assignment)' }); }
  const k = ORDER.indexOf(status);
  if (k < 3 || k !== ORDER.indexOf(i.status) + 1) return res.status(400).json({ error: `Cannot move from ${i.status} to ${status}` });
  setStatus(i, status, req.user, note); res.json({ ok: true });
});
app.post('/api/simulate', auth('ADMIN', 'DISPATCHER'), (req, res) => {
  const r = a => a[Math.floor(Math.random() * a.length)], type = r(TYPES), location = r(LOCS);
  const i = report({ type, location, severity: r(['Critical', 'High', 'High', 'Medium']), title: `${type} near ${location}`, description: DESC[type], contact: `sim${Date.now() % 1000}@demo.in` }, { name: 'Simulator', role: 'SYSTEM' });
  res.json({ id: i.id });
});

// ---------- demo mode: scripted end-to-end run (~3 min) ----------
let demoRun = false;
app.post('/api/demo', auth('ADMIN'), (req, res) => {
  if (demoRun) return res.status(400).json({ error: 'Demo already running' });
  demoRun = true;
  const adm = { name: 'Anita Sharma', role: 'ADMIN' }, dsp = { name: 'Rohit Verma', role: 'DISPATCHER' }, rsp = { name: 'Karan Singh', role: 'RESPONDER' };
  teams[0].status = 'Available';
  const i = report({ type: 'Accident', location: 'Vijay Nagar', severity: 'Critical', title: 'Multi-vehicle collision on main road', description: DESC.Accident, contact: 'citizen.demo@demo.in' }, { name: 'Citizen', role: 'PUBLIC' });
  [() => setStatus(i, 'Verified', adm), () => assign(i, 'T1', dsp), () => setStatus(i, 'Accepted', rsp), () => setStatus(i, 'En Route', rsp, 'Unit dispatched, ETA 8 min'),
   () => setStatus(i, 'On Site', rsp, 'Arrived, securing the area'), () => setStatus(i, 'Responding', rsp, 'First aid and traffic control underway'),
   () => { setStatus(i, 'Resolved', rsp, 'Injured shifted to hospital, road cleared'); demoRun = false; }]
    .forEach((f, k) => setTimeout(f, (k + 1) * 25000));
  res.json({ id: i.id });
});

io.on('connection', s => {
  try { jwt.verify(s.handshake.auth.token, SECRET); s.join('staff'); s.emit('sync', snap()); } catch { /* public (citizen) socket */ }
  s.on('track', id => typeof id === 'string' && s.join('track:' + id.toUpperCase()));
});
server.listen(PORT, () => console.log(`RapidResQ API + WebSocket on http://localhost:${PORT}`));
