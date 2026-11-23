import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useFetch, fmtTime } from '../lib/hooks.js';
import { useAuth } from '../lib/auth.jsx';
import { NEXT_STATUS, NEXT_LABEL, SEVERITIES, SEV_CLASS, TYPES, TYPE_ICON } from '../lib/constants.js';
import { ErrorBox, Spinner, SeverityBadge, StatusBadge, Timeline, toast } from '../components/ui.jsx';
import { SinglePin } from '../components/MapView.jsx';

export default function IncidentDetail() {
  const { id } = useParams(); const { user } = useAuth();
  const { data, error, loading, reload } = useFetch(() => api('/incidents/' + id), [id]);
  const teams = useFetch(() => api('/teams'), [], ['team:update']);
  const [sev, setSev] = useState(''), [type, setType] = useState(''), [teamId, setTeamId] = useState(''), [note, setNote] = useState(''), [reason, setReason] = useState(''), [busy, setBusy] = useState(false);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <div><Link to="/app" className="text-sm text-slate-400">← Back</Link><div className="mt-3"><ErrorBox message={error} /></div></div>;
  const { incident: i, events, image, team } = data;
  const role = user.role;
  const act = async (path, body, msg, method = 'POST') => {
    setBusy(true);
    try { await api(`/incidents/${id}/${path}`, { method, body }); toast(msg, 'success'); setNote(''); await reload(); }
    catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  };
  const canOps = ['ADMIN', 'DISPATCHER'].includes(role);
  const closed = ['RESOLVED', 'REJECTED'].includes(i.status);
  const chosen = sev || i.severity || i.aiSeverity || '';
  const availableTeams = (teams.data || []).filter(t => t.status === 'AVAILABLE' && t.id !== i.teamId);
  const next = NEXT_STATUS[i.status];
  const canRespond = (role === 'RESPONDER' || role === 'ADMIN') && next;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={role === 'RESPONDER' ? '/app/assignments' : '/app'} className="text-sm text-slate-400">← Back</Link>
      <div className="card mt-2">
        <div className="flex items-start justify-between gap-2">
          <div><div className="font-mono text-sm text-slate-400">{i.id}</div><h1 className="text-xl font-bold">{TYPE_ICON[i.type]} {i.type}</h1></div>
          <div className="flex flex-col items-end gap-1"><SeverityBadge s={i.severity} /><StatusBadge s={i.status} /></div>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-slate-200">{i.description}</p>
        <div className="mt-3 text-sm text-slate-400">📍 {i.address}<br />🕒 Reported {fmtTime(i.createdAt)}{team && <><br />🚑 {team.name}</>}</div>
        {i.lat != null && <div className="mt-3"><SinglePin lat={i.lat} lng={i.lng} />
          <a className="mt-2 inline-block text-sm text-blue-300" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${i.lat},${i.lng}`}>Open navigation in Google Maps →</a></div>}
        {image && <img src={image} alt="Incident" className="mt-3 max-h-72 w-full rounded-xl object-cover" />}
        {i.reporterPhone && <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm"><b>Reporter:</b> {i.reporterName}<br /><a className="text-blue-300" href={`tel:${i.reporterPhone}`}>📞 {i.reporterPhone}</a>{i.reporterEmail && <> · {i.reporterEmail}</>}</div>}
        {i.rating && <div className="mt-3 text-sm text-yellow-300">Citizen review: {'★'.repeat(i.rating)}{i.review && <span className="text-slate-300"> — {i.review}</span>}</div>}
      </div>

      {canOps && i.aiSeverity && (
        <div className="card mt-3 border-purple-500/30"><div className="text-sm font-bold text-purple-300">✦ AI triage suggestion (needs human review)</div>
          <div className="mt-1 text-sm text-slate-300">Type: <b>{i.aiType}</b> · Priority: <b>{i.aiSeverity}</b> · Confidence: {Math.round(i.aiConfidence * 100)}%</div>
          {i.aiDecision && <div className="mt-1 text-xs text-slate-400">Decision logged: {i.aiDecision === 'ACCEPTED' ? 'AI suggestion accepted' : 'AI suggestion overridden by operator'}</div>}</div>)}

      {role === 'ADMIN' && i.status === 'REPORTED' && (
        <div className="card mt-3"><h3 className="font-bold">Verify incident</h3>
          <label className="lbl">Set priority {i.aiSeverity && <span className="normal-case text-purple-300">(AI suggests {i.aiSeverity})</span>}</label>
          <div className="grid grid-cols-4 gap-2">{SEVERITIES.map(s => <button key={s} onClick={() => setSev(s)} className={`rounded-xl border py-2 text-sm font-semibold ${chosen === s ? SEV_CLASS[s] + ' ring-2 ring-white/40' : 'border-white/10 bg-slate-800'}`}>{s}</button>)}</div>
          <label className="lbl">Incident type</label>
          <select className="inp" value={type || i.type} onChange={e => setType(e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
          <button disabled={busy || !chosen} className="btn mt-4 w-full" onClick={() => act('verify', { severity: chosen, type: type || i.type }, 'Incident verified')}>✓ Verify with {chosen || '…'} priority</button>
          <input className="inp mt-3" placeholder="Reason (if rejecting as false report)" value={reason} onChange={e => setReason(e.target.value)} />
          <button disabled={busy || reason.length < 3} className="btn-ghost btn mt-2 w-full" onClick={() => act('reject', { reason }, 'Report rejected')}>Reject report</button></div>)}

      {canOps && ['VERIFIED', 'ASSIGNED'].includes(i.status) && (
        <div className="card mt-3"><h3 className="font-bold">{i.status === 'ASSIGNED' ? 'Reassign team' : 'Assign response team'}</h3>
          {availableTeams.length === 0 ? <p className="mt-2 text-sm text-orange-300">No team is available right now.</p> : <>
            <select className="inp mt-2" value={teamId} onChange={e => setTeamId(e.target.value)}><option value="">Select available team…</option>{availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}{t.base ? ` — ${t.base}` : ''}</option>)}</select>
            <button disabled={busy || !teamId} className="btn mt-3 w-full" onClick={() => act('assign', { teamId }, 'Team assigned')}>Assign team</button></>}</div>)}

      {canOps && !closed && i.status !== 'REPORTED' && (
        <div className="card mt-3"><h3 className="font-bold">Change priority</h3>
          <div className="mt-2 grid grid-cols-4 gap-2">{SEVERITIES.map(s => <button key={s} disabled={busy || s === i.severity} onClick={() => act('priority', { severity: s }, 'Priority updated', 'PATCH')} className={`rounded-xl border py-2 text-sm ${s === i.severity ? SEV_CLASS[s] : 'border-white/10 bg-slate-800'}`}>{s}</button>)}</div></div>)}

      {canRespond && (
        <div className="card mt-3 border-red-500/40"><h3 className="font-bold">Update progress</h3>
          <input className="inp mt-2" placeholder="Optional note" value={note} onChange={e => setNote(e.target.value)} />
          <button disabled={busy} className="btn mt-3 w-full py-3 text-lg" onClick={() => act('status', { status: next, note: note || undefined }, 'Status updated')}>{NEXT_LABEL[next]}</button></div>)}

      {['ADMIN', 'DISPATCHER', 'RESPONDER'].includes(role) && !closed && (
        <div className="card mt-3"><h3 className="font-bold">Add note</h3>
          <div className="mt-2 flex gap-2"><input className="inp" value={note} onChange={e => setNote(e.target.value)} placeholder="Visible to staff only" />
            <button className="btn" disabled={busy || !note.trim()} onClick={() => act('notes', { note }, 'Note added')}>Add</button></div></div>)}

      <div className="card mt-3"><h3 className="mb-3 font-bold">Timeline</h3><Timeline events={events} /></div>
    </div>
  );
}
