import { useState } from 'react';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { useAuth } from '../lib/auth.jsx';
import { ErrorBox, PageTitle, Spinner, toast } from '../components/ui.jsx';

const ROLES = ['ADMIN', 'DISPATCHER', 'RESPONDER', 'VIEWER'];
export default function AdminPage() {
  const { user: me } = useAuth();
  const users = useFetch(() => api('/admin/users'), [], []);
  const teams = useFetch(() => api('/teams'), [], ['team:update']);
  const [nu, setNu] = useState({ name: '', email: '', role: 'DISPATCHER', teamId: '' }), [nt, setNt] = useState({ name: '', base: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false);

  const patch = async (u, body) => { try { await api('/admin/users/' + u.id, { method: 'PATCH', body }); users.reload(); toast('User updated', 'success'); } catch (e) { toast(e.message, 'error'); } };
  const invite = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const body = { ...nu }; if (body.role !== 'RESPONDER') delete body.teamId; await api('/admin/users', { method: 'POST', body }); toast('Invite emailed. They set a password via "Forgot password".', 'success'); setNu({ name: '', email: '', role: 'DISPATCHER', teamId: '' }); users.reload(); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const addTeam = async e => { e.preventDefault(); try { await api('/admin/teams', { method: 'POST', body: nt }); setNt({ name: '', base: '' }); teams.reload(); toast('Team created', 'success'); } catch (x) { toast(x.message, 'error'); } };

  return (
    <div>
      <PageTitle>Users &amp; teams</PageTitle>
      <div className="grid gap-3 lg:grid-cols-2">
        <form className="card" onSubmit={invite}><h3 className="font-bold">Invite staff member</h3>
          <input className="inp mt-2" placeholder="Full name" required value={nu.name} onChange={e => setNu({ ...nu, name: e.target.value })} />
          <input className="inp mt-2" type="email" placeholder="Email" required value={nu.email} onChange={e => setNu({ ...nu, email: e.target.value })} />
          <select className="inp mt-2" value={nu.role} onChange={e => setNu({ ...nu, role: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
          {nu.role === 'RESPONDER' && <select className="inp mt-2" required value={nu.teamId} onChange={e => setNu({ ...nu, teamId: e.target.value })}><option value="">Select team…</option>{teams.data?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
          <div className="mt-2"><ErrorBox message={err} /></div><button className="btn mt-3 w-full" disabled={busy}>Send invite email</button></form>
        <form className="card" onSubmit={addTeam}><h3 className="font-bold">Create response team</h3>
          <input className="inp mt-2" placeholder="Team name (e.g. Ambulance Alpha)" required value={nt.name} onChange={e => setNt({ ...nt, name: e.target.value })} />
          <input className="inp mt-2" placeholder="Base location" value={nt.base} onChange={e => setNt({ ...nt, base: e.target.value })} />
          <button className="btn mt-3 w-full">Create team</button>
          <div className="mt-3 space-y-1 text-sm text-slate-300">{teams.data?.map(t => <div key={t.id} className="flex justify-between rounded-lg bg-white/5 px-3 py-2"><span>{t.name}</span><span className="text-slate-400">{t.members} members · {t.status}</span></div>)}</div></form>
      </div>
      <h2 className="mb-2 mt-6 text-lg font-bold">Users</h2>
      {!users.data ? <Spinner /> : <div className="grid gap-2">{users.data.map(u => (
        <div key={u.id} className="card py-3 text-sm">
          <div className="flex items-center justify-between gap-2"><div className="min-w-0"><b>{u.name}</b>{u.id === me.id && ' (you)'}<div className="truncate text-xs text-slate-400">{u.email} · {u.emailVerified ? 'verified' : 'not verified'}</div></div>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={u.active} disabled={u.id === me.id} onChange={e => patch(u, { active: e.target.checked })} />Active</label></div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select className="inp py-2" value={u.role} disabled={u.id === me.id} onChange={e => patch(u, { role: e.target.value, ...(e.target.value === 'RESPONDER' && !u.teamId && teams.data?.[0] ? { teamId: teams.data[0].id } : {}) })}>{ROLES.map(r => <option key={r}>{r}</option>)}</select>
            <select className="inp py-2" value={u.teamId || ''} disabled={u.role !== 'RESPONDER'} onChange={e => patch(u, { teamId: e.target.value })}><option value="">No team</option>{teams.data?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        </div>))}</div>}
    </div>
  );
}
