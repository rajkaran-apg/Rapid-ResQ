import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { Siren, Bell, Mail, Search, Map as MapIcon, BarChart3, ScrollText, LayoutDashboard, Truck, LogOut, X, Shield, Clapperboard } from 'lucide-react';

const ORDER = ['Reported', 'Verified', 'Assigned', 'Accepted', 'En Route', 'On Site', 'Responding', 'Resolved'];
const TYPES = ['Accident', 'Fire', 'Medical Emergency', 'Infrastructure Failure', 'Other'];
const SEVS = ['Critical', 'High', 'Medium', 'Low'];
const LOC = { 'Vijay Nagar': [66, 24], Palasia: [50, 42], Bhawarkua: [34, 60], Rau: [20, 80], 'Rajendra Nagar': [74, 68], 'MG Road': [46, 54] };
const SEVC = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e' };
const LV = { red: '#ef4444', orange: '#f97316', green: '#22c55e', blue: '#3b82f6', purple: '#8b5cf6' };
const NAV = { ADMIN: ['dash', 'dispatch', 'map', 'analytics', 'audit', 'emails'], DISPATCHER: ['dash', 'dispatch', 'map', 'emails'], RESPONDER: ['responder', 'dash', 'map'], VIEWER: ['dash', 'analytics', 'map'] };
const HOME = { ADMIN: 'dash', DISPATCHER: 'dispatch', RESPONDER: 'responder', VIEWER: 'dash' };
const PAGES = { dash: ['Command Center', LayoutDashboard], dispatch: ['Dispatch Board', Truck], responder: ['My Assignments', Siren], map: ['Live Map', MapIcon], analytics: ['Analytics', BarChart3], audit: ['Audit Log', ScrollText], emails: ['Email Simulator', Mail] };
const DEMO = [['ADMIN', 'admin@rapidresq.demo'], ['DISPATCHER', 'dispatcher@rapidresq.demo'], ['RESPONDER', 'responder@rapidresq.demo'], ['VIEWER', 'viewer@rapidresq.demo']];
const fmt = t => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

let TOKEN = localStorage.getItem('rr_token') || '';
let toast = () => {};
async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) }, body: body && JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || 'Request failed'), { status: r.status });
  return d;
}
const call = async (p, m, b) => { try { return await api(p, m, b); } catch (e) { toast(e.message, e.status === 403 || e.status === 401 ? 'red' : 'orange'); } };

function Counter({ to, dec = 0, suffix = '' }) {
  const [v, setV] = useState(0), from = useRef(0);
  useEffect(() => {
    const s = performance.now(), a = from.current; let r;
    const f = n => { const p = Math.min((n - s) / 900, 1); setV(a + (to - a) * p); if (p < 1) r = requestAnimationFrame(f); else from.current = to; };
    r = requestAnimationFrame(f); return () => cancelAnimationFrame(r);
  }, [to]);
  return <>{v.toFixed(dec)}{suffix}</>;
}
const Sev = ({ s }) => <span className="chip" style={{ color: SEVC[s], background: SEVC[s] + '22', borderColor: SEVC[s] + '66' }}>{s}</span>;
const stc = s => s === 'Resolved' ? '#22c55e' : s === 'Reported' ? '#ef4444' : s === 'Verified' ? '#8b5cf6' : '#3b82f6';
const Stat = ({ s }) => <span className="chip" style={{ color: stc(s), background: stc(s) + '22', borderColor: stc(s) + '66' }}><i className={'dot' + (s !== 'Resolved' ? ' pulse' : '')} style={{ background: stc(s) }} />{s}</span>;

/* ---------------- public pages ---------------- */
function PublicNav({ go }) {
  return <div className="row pad"><div className="brand"><Siren color="#ef4444" /> Rapid<b>ResQ</b></div><div className="grow" />
    <button className="btn ghost sm" onClick={() => go('report')}>Report</button><button className="btn ghost sm" onClick={() => go('track')}>Track</button><button className="btn sm" onClick={() => go('login')}>Login</button></div>;
}
function Landing({ go }) {
  const st = [['24/7', 'Monitoring'], [128, 'Incidents Managed'], [94, 'Resolution Rate', '%'], [7.4, 'Avg Response', ' min', 1]];
  return <div className="page"><PublicNav go={go} />
    <div className="hero"><h1>RapidResQ</h1><p style={{ fontSize: 20 }} className="mut">Smart Real-Time Emergency Incident &amp; Response Management</p>
      <svg width="220" height="220" viewBox="0 0 100 100" style={{ margin: '14px 0' }}>
        {[45, 30, 15].map(r => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#6366f155" />)}
        <g style={{ transformOrigin: '50px 50px', animation: 'spin 3s linear infinite' }}><path d="M50 50 L95 50 A45 45 0 0 0 82 18 Z" fill="#ef444455" /></g>
        {[[70, 30], [35, 62], [60, 70]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="3" fill={['#ef4444', '#f97316', '#22c55e'][k]} className="pulse" />)}</svg>
      <div className="row" style={{ justifyContent: 'center' }}><button className="btn red" onClick={() => go('report')}>Report an Incident</button><button className="btn" onClick={() => go('cc')}>Open Command Center</button><button className="btn ghost" onClick={() => go('login')}>Login</button></div></div>
    <div className="grid" style={{ maxWidth: 900, margin: '30px auto', padding: '0 16px' }}>{st.map(([v, l, s = '', d = 0]) => <div key={l} className="glass pad lift" style={{ textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 800 }}>{typeof v === 'number' ? <Counter to={v} dec={d} suffix={s} /> : v}</div><div className="mut">{l}</div></div>)}</div></div>;
}
function Report({ go }) {
  const [f, setF] = useState({ type: 'Accident', severity: 'High', title: '', description: '', location: 'Vijay Nagar', contact: '' }), [id, setId] = useState(''), [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const img = e => { const file = e.target.files[0]; if (!file) return; if (file.size > 1.5e6) return toast('Image must be under 1.5 MB', 'orange'); const r = new FileReader(); r.onload = () => setF(x => ({ ...x, image: r.result })); r.readAsDataURL(file); };
  const submit = async e => { e.preventDefault(); setBusy(true); const r = await call('/incidents', 'POST', f); setBusy(false); if (r) { setId(r.id); toast('Incident reported successfully.', 'green'); } };
  return <div className="page"><PublicNav go={go} /><div style={{ maxWidth: 620, margin: '0 auto', padding: 16 }}>
    {id ? <div className="glass pad" style={{ textAlign: 'center' }}><h2>✅ Incident reported successfully.</h2><div style={{ fontSize: 34, fontWeight: 800, margin: '14px 0' }}>{id}</div><button className="btn" onClick={() => go('track', id)}>Track this incident</button></div> :
      <form className="glass pad" onSubmit={submit}><h2>Report an Emergency</h2>
        <label>Incident Type</label><select value={f.type} onChange={set('type')}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
        <label>Title</label><input required value={f.title} onChange={set('title')} placeholder="e.g. Car collision near signal" />
        <label>Description</label><textarea rows="3" value={f.description} onChange={set('description')} />
        <label>Location</label><select value={f.location} onChange={set('location')}>{Object.keys(LOC).map(t => <option key={t}>{t}</option>)}</select>
        <label>Severity</label><select value={f.severity} onChange={set('severity')}>{[...SEVS].reverse().map(t => <option key={t}>{t}</option>)}</select>
        <label>Contact (phone / email)</label><input required value={f.contact} onChange={set('contact')} />
        <label>Image (optional)</label><input type="file" accept="image/*" onChange={img} />
        <button className="btn red" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} disabled={busy}>{busy ? 'Submitting…' : 'Submit Report'}</button></form>}</div></div>;
}
const STEPS = [['Reported', ['Reported']], ['Verified', ['Verified']], ['Team Assigned', ['Assigned', 'Accepted']], ['Responder En Route', ['En Route']], ['On Site', ['On Site', 'Responding']], ['Resolved', ['Resolved']]];
function Track({ go, id0, tracked, watch }) {
  const [q, setQ] = useState(id0 || '');
  useEffect(() => { if (id0) watch(id0); }, []);
  const i = tracked, cur = i ? STEPS.findIndex(s => s[1].includes(i.status)) : -1;
  return <div className="page"><PublicNav go={go} /><div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
    <div className="row"><input style={{ flex: 1 }} placeholder="INC-2026-1042" value={q} onChange={e => setQ(e.target.value)} /><button className="btn" onClick={() => watch(q.trim())}>Track</button></div>
    {i && <div className="glass pad" style={{ marginTop: 14 }}><div className="row"><h2 className="grow">{i.id}</h2><Sev s={i.severity} /></div><div className="mut">{i.type} · {i.location}</div>
      <div style={{ margin: '14px 0' }}>{STEPS.map(([l], k) => <div key={l} className={'step ' + (k < cur || i.status === 'Resolved' ? 'done' : k === cur ? 'cur' : '')}><div className="c"><span>{k < cur || i.status === 'Resolved' ? '✓' : k === cur ? '●' : '○'}</span></div>{l}</div>)}</div>
      <p><b>Status:</b> {i.status} &nbsp; <b>Team:</b> {i.teamName || 'Awaiting assignment'} &nbsp; <b>ETA:</b> {i.status === 'Resolved' ? '—' : i.team ? `~${i.respMin || 8} min` : 'Pending'}</p>
      <h3>Timeline</h3><div className="tl">{i.timeline.map((t, k) => <div key={k}><b>{fmt(t.t)}</b> — {t.s}</div>)}</div></div>}</div></div>;
}
function Login({ go, onAuth }) {
  const [email, setE] = useState(''), [pw, setP] = useState(''), [m, setM] = useState(null), [otp, setO] = useState('');
  const step1 = async e => { e.preventDefault(); const r = await call('/login', 'POST', { email, password: pw }); if (r) setM(r); };
  const step2 = async e => { e.preventDefault(); const r = await call('/verify', 'POST', { mfaToken: m.mfaToken, otp }); if (r) onAuth(r); };
  return <div className="page"><PublicNav go={go} /><div style={{ maxWidth: 420, margin: '20px auto', padding: 16 }}><div className="glass pad">
    <h2>{m ? 'Two-Step Verification' : 'Sign in'}</h2>
    {!m ? <form onSubmit={step1}><label>Email</label><input value={email} onChange={e => setE(e.target.value)} /><label>Password</label><input type="password" value={pw} onChange={e => setP(e.target.value)} />
      <button className="btn" style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}>Continue</button>
      <p className="mut" style={{ fontSize: 13 }}>DEMO ACCOUNTS (password <b>Demo@123</b>) — click to fill:</p>
      <div className="row">{DEMO.map(([r, e]) => <button type="button" key={r} className="btn ghost sm" onClick={() => { setE(e); setP('Demo@123'); }}>{r}</button>)}</div></form> :
      <form onSubmit={step2}><div className="glass pad" style={{ margin: '12px 0', textAlign: 'center' }}><div className="mut" style={{ fontSize: 12 }}>DEMO OTP (simulated email)</div><div style={{ fontSize: 30, letterSpacing: 6, fontWeight: 800 }}>{m.demoOtp}</div></div>
        <label>Enter 6-digit OTP</label><input autoFocus maxLength="6" value={otp} onChange={e => setO(e.target.value)} /><button className="btn" style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}>Verify &amp; Enter</button></form>}
  </div></div></div>;
}

/* ---------------- incident modal ---------------- */
function IncidentModal({ id, d, close }) {
  const i = d.incidents.find(x => x.id === id), [team, setTeam] = useState(''), [note, setNote] = useState('');
  if (!i) return null;
  const next = ORDER[ORDER.indexOf(i.status) + 1], tm = d.teams.find(t => t.id === i.team);
  const doStatus = async () => { if (next === 'Resolved' && !window.confirm(`Mark ${i.id} as resolved?`)) return; await call(`/incidents/${i.id}/status`, 'POST', { status: next, note }); setNote(''); };
  return <div className="modal" onClick={close}><div className="glass pad" onClick={e => e.stopPropagation()}>
    <div className="row"><h2 className="grow">{i.id}</h2><Sev s={i.severity} /><Stat s={i.status} /><button className="btn ghost sm" onClick={close}><X size={16} /></button></div>
    <h3 style={{ marginTop: 10 }}>{i.type} — {i.location}</h3><p className="mut">{i.description || i.title}</p>
    {i.image && <img src={i.image} alt="" style={{ maxWidth: '100%', borderRadius: 12 }} />}
    <p><b>Assigned Team:</b> {tm ? tm.name : 'None'} &nbsp; <b>Contact:</b> {i.contact}</p>
    <div className="row" style={{ margin: '10px 0' }}>
      <button className="btn sm" onClick={() => call(`/incidents/${i.id}/verify`, 'POST')}>Verify (Admin)</button>
      <select style={{ width: 150 }} value={team} onChange={e => setTeam(e.target.value)}><option value="">Assign team…</option>{d.teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status})</option>)}</select>
      <button className="btn sm" disabled={!team} onClick={() => call(`/incidents/${i.id}/assign`, 'POST', { teamId: team })}>Assign</button>
      <select style={{ width: 120 }} value={i.severity} onChange={e => call(`/incidents/${i.id}/priority`, 'POST', { severity: e.target.value })}>{SEVS.map(s => <option key={s}>{s}</option>)}</select></div>
    {next && ORDER.indexOf(next) >= 3 && <div className="row"><input style={{ flex: 1 }} placeholder="Response note (optional)" value={note} onChange={e => setNote(e.target.value)} /><button className="btn sm red" onClick={doStatus}>Mark {next}</button></div>}
    <h3 style={{ marginTop: 14 }}>Timeline</h3><div className="tl">{i.timeline.map((t, k) => <div key={k}><b>{fmt(t.t)}</b> — {t.s} <span className="mut">({t.by})</span></div>)}</div>
    {i.notes.length > 0 && <><h3>Response Notes</h3>{i.notes.map((n, k) => <p key={k} className="mut">📝 {fmt(n.t)} · {n.by}: {n.text}</p>)}</>}
  </div></div>;
}

/* ---------------- dashboards ---------------- */
const blank = { type: '', severity: '', status: '', team: '', location: '', date: '' };
function Dash({ d, open }) {
  const [f, setF] = useState(blank), I = d.incidents, today = new Date().toDateString();
  const active = I.filter(i => i.status !== 'Resolved');
  const kpis = [['Total Incidents', I.length, () => setF(blank)], ['Active Incidents', active.length, () => setF({ ...blank, status: 'Active' })], ['Critical Incidents', active.filter(i => i.severity === 'Critical').length, () => setF({ ...blank, severity: 'Critical', status: 'Active' })],
    ['Resolved Today', I.filter(i => i.resolvedAt && new Date(i.resolvedAt).toDateString() === today).length, () => setF({ ...blank, status: 'Resolved' })], ['Available Teams', d.teams.filter(t => t.status === 'Available').length, null], ['Avg Response (min)', +(d.teams.reduce((a, t) => a + t.avgResp, 0) / d.teams.length || 0).toFixed(1), null, 1]];
  const rows = I.filter(i => (!f.type || i.type === f.type) && (!f.severity || i.severity === f.severity) && (!f.location || i.location === f.location) && (!f.team || i.team === f.team) && (!f.date || new Date(i.createdAt).toISOString().slice(0, 10) === f.date) &&
    (!f.status || (f.status === 'Active' ? i.status !== 'Resolved' : i.status === f.status)));
  const sel = (k, opts, label) => <select style={{ width: 150 }} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })}><option value="">{label}</option>{opts.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>)}</select>;
  return <div className="page"><div className="grid">{kpis.map(([l, v, fn, dec = 0]) => <div key={l} className="glass kpi lift" onClick={fn || undefined}><div className="mut">{l}</div><div className="v"><Counter to={v} dec={dec} /></div></div>)}</div>
    <div className="glass pad" style={{ marginTop: 14 }}><div className="row" style={{ marginBottom: 10 }}>
      {sel('type', TYPES, 'Type')}{sel('severity', SEVS, 'Severity')}{sel('status', ['Active', ...ORDER], 'Status')}{sel('location', Object.keys(LOC), 'Location')}{sel('team', d.teams.map(t => [t.id, t.name]), 'Team')}
      <input type="date" style={{ width: 150 }} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /><button className="btn ghost sm" onClick={() => setF(blank)}>Clear Filters</button></div>
      <div className="scroll"><table><thead><tr>{['ID', 'Type', 'Location', 'Severity', 'Status', 'Team', 'Time', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(i => <tr key={i.id} onClick={() => open(i.id)}><td><b>{i.id}</b></td><td>{i.type}</td><td>{i.location}</td><td><Sev s={i.severity} /></td><td><Stat s={i.status} /></td><td>{d.teams.find(t => t.id === i.team)?.name || '—'}</td><td>{fmt(i.createdAt)}</td><td><button className="btn ghost sm">Open</button></td></tr>)}</tbody></table>
        {!rows.length && <p className="mut" style={{ textAlign: 'center' }}>No incidents match these filters.</p>}</div></div></div>;
}
function Dispatch({ d, open }) {
  const [over, setOver] = useState(''), un = d.incidents.filter(i => i.status === 'Reported' || i.status === 'Verified');
  const drop = (e, t) => { e.preventDefault(); setOver(''); const id = e.dataTransfer.getData('id'); if (id) call(`/incidents/${id}/assign`, 'POST', { teamId: t.id }); };
  return <div className="page grid2"><div><h3>Unassigned Incidents</h3><p className="mut" style={{ fontSize: 13 }}>Verified incidents can be dragged onto an available team.</p>
    {un.map(i => <div key={i.id} draggable={i.status === 'Verified'} onDragStart={e => e.dataTransfer.setData('id', i.id)} className="glass pad lift" style={{ marginBottom: 10, borderLeft: `4px solid ${SEVC[i.severity]}`, cursor: i.status === 'Verified' ? 'grab' : 'default' }}>
      <div className="row"><b className="grow" onClick={() => open(i.id)} style={{ cursor: 'pointer' }}>{i.id}</b><Sev s={i.severity} /></div><div>{i.type} · {i.location}</div>
      <div className="row" style={{ marginTop: 6 }}><Stat s={i.status} />{i.status === 'Reported' && <button className="btn sm" onClick={() => call(`/incidents/${i.id}/verify`, 'POST')}>Verify</button>}</div></div>)}
    {!un.length && <p className="mut">All caught up 🎉 — use “Simulate Emergency”.</p>}</div>
    <div><h3>Response Teams</h3>{d.teams.map(t => { const load = d.incidents.filter(i => i.team === t.id && i.status !== 'Resolved').length;
      return <div key={t.id} className={'glass pad drop' + (over === t.id ? ' over' : '')} style={{ marginBottom: 10 }} onDragOver={e => { e.preventDefault(); setOver(t.id); }} onDragLeave={() => setOver('')} onDrop={e => drop(e, t)}>
        <div className="row"><b className="grow">{t.name}</b><span className="chip" style={{ color: t.status === 'Available' ? '#22c55e' : '#f97316', borderColor: 'currentColor' }}>{t.status}</span></div>
        <div className="mut">Base: {t.loc} · Workload: {load} active · {t.resolved} resolved · {t.avgResp} min avg</div></div>; })}</div></div>;
}
function Responder({ d, user, open }) {
  const tm = d.teams.find(t => t.id === user.team), mine = d.incidents.filter(i => i.team === user.team), act = mine.filter(i => i.status !== 'Resolved');
  const BT = [['Accepted', 'Accept'], ['En Route', 'En Route'], ['On Site', 'On Site'], ['Responding', 'Responding'], ['Resolved', 'Resolve']];
  const go = (i, s) => { if (s === 'Resolved' && !window.confirm('Resolve this incident?')) return; call(`/incidents/${i.id}/status`, 'POST', { status: s }); };
  return <div className="page"><div className="grid"><div className="glass kpi"><div className="mut">Team</div><div className="v" style={{ fontSize: 22 }}>{tm?.name}</div></div><div className="glass kpi"><div className="mut">Availability</div><div className="v" style={{ fontSize: 22 }}>{tm?.status}</div></div>
    <div className="glass kpi"><div className="mut">Current Workload</div><div className="v"><Counter to={act.length} /></div></div><div className="glass kpi"><div className="mut">Completed</div><div className="v"><Counter to={tm?.resolved || 0} /></div></div><div className="glass kpi"><div className="mut">Avg Response (min)</div><div className="v"><Counter to={tm?.avgResp || 0} dec={1} /></div></div></div>
    <h3 style={{ margin: '16px 0 8px' }}>My Active Assignments</h3>
    {act.map(i => <div key={i.id} className="glass pad" style={{ marginBottom: 12, borderLeft: `4px solid ${SEVC[i.severity]}` }}><div className="row"><b className="grow" style={{ cursor: 'pointer' }} onClick={() => open(i.id)}>{i.id} · {i.type} · {i.location}</b><Sev s={i.severity} /><Stat s={i.status} /></div>
      <div className="row" style={{ marginTop: 10 }}>{BT.map(([s, l]) => <button key={s} className="btn sm" disabled={ORDER.indexOf(s) !== ORDER.indexOf(i.status) + 1} onClick={() => go(i, s)}>{l}</button>)}</div></div>)}
    {!act.length && <p className="mut">No active assignments. Waiting for dispatch…</p>}
    <h3 style={{ margin: '16px 0 8px' }}>Completed</h3>{mine.filter(i => i.status === 'Resolved').map(i => <div key={i.id} className="glass pad" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => open(i.id)}>{i.id} · {i.type} · {i.location} <Stat s="Resolved" /></div>)}</div>;
}
function MapView({ d, open }) {
  const hash = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0), pos = (loc, id) => [LOC[loc][0] + (hash(id) % 9) - 4, LOC[loc][1] + (hash(id) % 7) - 3];
  return <div className="page glass pad"><svg viewBox="0 0 100 100" style={{ width: '100%', maxHeight: '72vh', background: '#0c1330', borderRadius: 14 }}>
    {[10, 30, 50, 70, 90].map(v => <g key={v} stroke="#ffffff10" strokeWidth=".4"><line x1={v} y1="0" x2={v} y2="100" /><line x1="0" y1={v} x2="100" y2={v} /></g>)}
    <path d="M0 70 Q30 40 50 50 T100 20" stroke="#3b82f655" strokeWidth="1.2" fill="none" /><path d="M20 100 L45 55 L70 0" stroke="#ffffff22" strokeWidth=".8" fill="none" />
    {Object.entries(LOC).map(([n, [x, y]]) => <text key={n} x={x} y={y + 9} fontSize="2.6" fill="#8b95b3" textAnchor="middle">{n}</text>)}
    {d.teams.map(t => { const [x, y] = pos(t.loc, t.id); return <g key={t.id}><rect x={x - 1.6} y={y - 1.6} width="3.2" height="3.2" rx=".6" fill="#3b82f6" /><text x={x} y={y - 2.6} fontSize="2.2" fill="#93c5fd" textAnchor="middle">{t.name.replace('Team ', '')}</text></g>; })}
    {d.incidents.map(i => { const [x, y] = pos(i.location, i.id), c = i.status === 'Resolved' ? '#22c55e' : SEVC[i.severity]; return <g key={i.id} onClick={() => open(i.id)} style={{ cursor: 'pointer' }}><circle cx={x} cy={y} r="2" fill={c} className={i.status !== 'Resolved' && i.severity === 'Critical' ? 'pulse' : ''} style={{ color: c }}><title>{i.id} {i.type}</title></circle></g>; })}</svg>
    <div className="row" style={{ marginTop: 10 }}><span>🔴 Critical</span><span>🟠 High</span><span>🟢 Resolved</span><span>🟦 Response teams</span><span className="mut">Click a marker for details</span></div></div>;
}
function Analytics({ d }) {
  const I = d.incidents, cnt = (k, keys) => keys.map(n => ({ name: n, value: I.filter(i => i[k] === n).length }));
  const res = I.filter(i => i.status === 'Resolved').length, wk = I.filter(i => Date.now() - new Date(i.createdAt) < 7 * 864e5).length, td = I.filter(i => new Date(i.createdAt).toDateString() === new Date().toDateString()).length;
  const rt = I.filter(i => i.respMin).map(i => i.respMin), avg = rt.length ? (rt.reduce((a, b) => a + b, 0) / rt.length).toFixed(1) : '—';
  const C = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899'];
  const bar = (title, data, colors) => <div className="glass pad"><h3>{title}</h3><ResponsiveContainer width="100%" height={220}><BarChart data={data}><XAxis dataKey="name" stroke="#8b95b3" fontSize={11} /><YAxis stroke="#8b95b3" allowDecimals={false} /><Tooltip contentStyle={{ background: '#101731', border: 0 }} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{data.map((x, k) => <Cell key={k} fill={colors ? colors[x.name] : C[k % C.length]} />)}</Bar></BarChart></ResponsiveContainer></div>;
  return <div className="page"><div className="grid">{[['Avg Response (min)', avg], ['Resolution %', I.length ? Math.round(res / I.length * 100) : 0], ['Active', I.length - res], ['Today', td], ['This Week', wk]].map(([l, v]) => <div key={l} className="glass kpi"><div className="mut">{l}</div><div className="v">{v}</div></div>)}</div>
    <div className="grid2" style={{ marginTop: 14 }}>
      <div className="glass pad"><h3>Incident Types</h3><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={cnt('type', TYPES)} dataKey="value" nameKey="name" outerRadius={80} label>{TYPES.map((_, k) => <Cell key={k} fill={C[k]} />)}</Pie><Tooltip contentStyle={{ background: '#101731', border: 0 }} /><Legend /></PieChart></ResponsiveContainer></div>
      {bar('Severity', cnt('severity', SEVS), SEVC)}{bar('Status', cnt('status', ORDER))}{bar('Location', cnt('location', Object.keys(LOC)))}
      <div className="glass pad" style={{ gridColumn: '1/-1' }}><h3>Live Performance</h3><ResponsiveContainer width="100%" height={260}><LineChart data={d.series}><CartesianGrid stroke="#ffffff12" /><XAxis dataKey="t" stroke="#8b95b3" fontSize={11} /><YAxis stroke="#8b95b3" /><Tooltip contentStyle={{ background: '#101731', border: 0 }} /><Legend />
        <Line type="monotone" dataKey="reported" name="Reported" stroke="#ef4444" strokeWidth={2} /><Line type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" strokeWidth={2} /><Line type="monotone" dataKey="resp" name="Resp. time (min)" stroke="#8b5cf6" strokeWidth={2} /></LineChart></ResponsiveContainer></div></div>
    <h3 style={{ margin: '16px 0 8px' }}>Team Performance</h3><div className="grid">{d.teams.map(t => <div key={t.id} className="glass pad lift"><b>{t.name}</b><div className="v" style={{ fontSize: 24, fontWeight: 800 }}>{t.resolved} Resolved</div><div className="mut">{t.avgResp} min avg response</div></div>)}</div></div>;
}
function Audit({ d }) {
  const [f, setF] = useState({ user: '', action: '', inc: '', date: '' }), s = k => e => setF({ ...f, [k]: e.target.value }), has = (a, b) => a.toLowerCase().includes(b.toLowerCase());
  const rows = d.audit.filter(a => has(a.user, f.user) && has(a.action, f.action) && has(a.incident, f.inc) && (!f.date || a.t.slice(0, 10) === f.date));
  return <div className="page glass pad"><div className="row" style={{ marginBottom: 10 }}><input style={{ width: 150 }} placeholder="User" value={f.user} onChange={s('user')} /><input style={{ width: 170 }} placeholder="Action (e.g. denied)" value={f.action} onChange={s('action')} /><input style={{ width: 150 }} placeholder="Incident" value={f.inc} onChange={s('inc')} /><input type="date" style={{ width: 150 }} value={f.date} onChange={s('date')} /></div>
    <div className="scroll"><table><thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Incident</th></tr></thead><tbody>{rows.map(a => <tr key={a.id} style={{ cursor: 'default', color: a.action.startsWith('Permission') || a.action === 'Failed login' ? '#f87171' : undefined }}><td>{fmt(a.t)}</td><td>{a.user}</td><td>{a.role}</td><td>{a.action}</td><td>{a.incident}</td></tr>)}</tbody></table></div></div>;
}
function Emails({ d }) {
  const [o, setO] = useState(null);
  return <div className="page"><p className="mut">Simulated email service — swap <code>sendEmail()</code> in server/index.js for Nodemailer / SendGrid / Resend.</p>{d.emails.map(e => <div key={e.id} className="glass pad lift" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setO(o === e.id ? null : e.id)}><div className="row"><Mail size={16} /><b className="grow">{e.subject}</b><span className="mut">{fmt(e.t)}</span></div><div className="mut" style={{ fontSize: 13 }}>To: {e.to}</div>{o === e.id && <p>{e.body}</p>}</div>)}</div>;
}
function Denied({ go, home }) { return <div className="page glass pad" style={{ textAlign: 'center' }}><h1>403 — Access Denied</h1><p className="mut">Your role is not permitted to view this page.</p><button className="btn" onClick={() => go(home)}>Back to my dashboard</button></div>; }

/* ---------------- app shell ---------------- */
export default function App() {
  const [page, setPage] = useState('landing'), [arg, setArg] = useState(''), [user, setUser] = useState(() => JSON.parse(localStorage.getItem('rr_user') || 'null'));
  const [d, setD] = useState({ incidents: [], teams: [], notifs: [], emails: [], audit: [], series: [] }), [toasts, setToasts] = useState([]), [tracked, setTracked] = useState(null), [modal, setModal] = useState(null);
  const [q, setQ] = useState(''), [bell, setBell] = useState(false), [seen, setSeen] = useState(0), sock = useRef(null), tid = useRef('');
  toast = (m, l = 'blue') => { const id = Math.random(); setToasts(t => [...t, { id, m, l }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500); };
  useEffect(() => {
    const s = io({ auth: { token: user ? TOKEN : '' } }); sock.current = s;
    s.on('sync', setD); s.on('toast', n => toast(`${n.title} — ${n.msg}`, n.level)); s.on('incident', i => { setTracked(i); });
    s.on('connect', () => tid.current && s.emit('track', tid.current));
    return () => s.close();
  }, [user]);
  const watch = async id => { tid.current = id.toUpperCase(); sock.current?.emit('track', tid.current); try { setTracked(await api('/track/' + id)); } catch (e) { setTracked(null); toast(e.message, 'orange'); } };
  const go = (p, a) => { if (p === 'cc') p = user ? HOME[user.role] : 'login'; if (p === 'track' && a) setArg(a); setPage(p); setQ(''); };
  const onAuth = ({ token, user }) => { TOKEN = token; localStorage.setItem('rr_token', token); localStorage.setItem('rr_user', JSON.stringify(user)); setUser(user); setPage(HOME[user.role]); toast(`Welcome, ${user.name} (${user.role})`, 'green'); };
  const logout = async () => { await call('/logout', 'POST'); TOKEN = ''; localStorage.clear(); setUser(null); setPage('landing'); };
  const PUB = ['landing', 'report', 'track', 'login'];
  const Toasts = <div className="toasts">{toasts.map(t => <div key={t.id} className="toast" style={{ borderColor: LV[t.l] }}>{t.m}</div>)}</div>;
  if (PUB.includes(page) || !user) {
    const p = PUB.includes(page) ? page : 'login';
    return <>{p === 'landing' && <Landing go={go} />}{p === 'report' && <Report go={go} />}{p === 'track' && <Track go={go} id0={arg} tracked={tracked} watch={watch} />}{p === 'login' && <Login go={go} onAuth={onAuth} />}{Toasts}</>;
  }
  const nav = NAV[user.role], hits = q.length > 1 ? d.incidents.filter(i => [i.id, i.location, i.type, i.status, d.teams.find(t => t.id === i.team)?.name || ''].join(' ').toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const unread = d.notifs.filter(n => n.id > seen).length, canSim = ['ADMIN', 'DISPATCHER'].includes(user.role);
  const sim = async () => { const r = await call('/simulate', 'POST'); r && toast(`Simulated ${r.id}`, 'purple'); };
  const demo = async () => { const r = await call('/demo', 'POST'); r && toast(`🎬 Demo started with ${r.id} — runs ~3 min. Track it on the Track page.`, 'purple'); };
  const Body = !nav.includes(page) ? <Denied go={go} home={HOME[user.role]} /> : { dash: <Dash d={d} open={setModal} />, dispatch: <Dispatch d={d} open={setModal} />, responder: <Responder d={d} user={user} open={setModal} />, map: <MapView d={d} open={setModal} />, analytics: <Analytics d={d} />, audit: <Audit d={d} />, emails: <Emails d={d} /> }[page];
  return <div className="shell"><aside className="side"><div className="brand" style={{ marginBottom: 12 }}><Siren color="#ef4444" /> Rapid<b>ResQ</b></div>
    {nav.map(k => { const [l, Ic] = PAGES[k]; return <button key={k} className={'nav' + (page === k ? ' on' : '')} onClick={() => go(k)}><Ic size={18} />{l}</button>; })}
    <button className="nav" onClick={() => go('track')}><Shield size={18} />Citizen Tracking</button><div className="grow" /><button className="nav" onClick={logout}><LogOut size={18} />Logout</button></aside>
    <main className="main"><div className="top"><h2>{PAGES[page]?.[0]}</h2><span className="chip" style={{ color: '#8b5cf6', borderColor: 'currentColor' }}>{user.role} · {user.name}</span><div className="grow" />
      <div style={{ position: 'relative' }}><div className="row glass" style={{ padding: '2px 10px', gap: 6 }}><Search size={16} /><input style={{ border: 0, background: 'none', width: 190 }} placeholder="Search ID, place, team…" value={q} onChange={e => setQ(e.target.value)} /></div>
        {hits.length > 0 && <div className="pop glass pad" style={{ top: 46 }}>{hits.map(i => <div key={i.id} className="lift pad" style={{ cursor: 'pointer' }} onClick={() => { setModal(i.id); setQ(''); }}><b>{i.id}</b> · {i.type} · {i.location} <Stat s={i.status} /></div>)}</div>}</div>
      {canSim && <button className="btn ghost sm" onClick={sim}>⚡ Simulate Emergency</button>}{user.role === 'ADMIN' && <button className="btn red sm" onClick={demo}><Clapperboard size={16} />DEMO MODE</button>}
      <div className="bell"><button className="btn ghost sm" onClick={() => { setBell(!bell); setSeen(d.notifs[0]?.id || 0); }}><Bell size={16} /></button>{unread > 0 && <em>{unread}</em>}
        {bell && <div className="pop glass pad">{d.notifs.length ? d.notifs.map(n => <div key={n.id} style={{ borderLeft: `3px solid ${LV[n.level]}`, padding: '6px 10px', marginBottom: 8 }}><b>{n.title}</b><div className="mut" style={{ fontSize: 13 }}>{n.msg} · {fmt(n.t)}</div></div>) : 'No notifications'}</div>}</div></div>
      {Body}</main>
    {modal && <IncidentModal id={modal} d={d} close={() => setModal(null)} />}{Toasts}</div>;
}
