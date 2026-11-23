import { api } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { useAuth } from '../lib/auth.jsx';
import { Empty, ErrorBox, IncidentCard, PageTitle, Spinner, toast } from '../components/ui.jsx';

export default function Assignments() {
  const { user } = useAuth();
  const inc = useFetch(() => api('/incidents?status=all&limit=100'), []);
  const teams = useFetch(() => api('/teams'), [], ['team:update']);
  const mine = teams.data?.find(t => t.id === user.teamId);
  const active = (inc.data?.items || []).filter(i => !['RESOLVED', 'REJECTED'].includes(i.status));
  const done = (inc.data?.items || []).filter(i => ['RESOLVED', 'REJECTED'].includes(i.status));

  const toggle = async () => {
    try { await api(`/teams/${mine.id}/status`, { method: 'PATCH', body: { status: mine.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE' } }); teams.reload(); }
    catch (e) { toast(e.message, 'error'); }
  };
  if (!user.teamId) return <Empty>You are not assigned to a team yet. Ask an admin to add you to one.</Empty>;
  return (
    <div>
      <PageTitle>My assignments</PageTitle>
      {mine && <div className="card mb-4 flex items-center justify-between"><div><b>{mine.name}</b><div className={`text-sm ${mine.status === 'AVAILABLE' ? 'text-green-400' : mine.status === 'BUSY' ? 'text-orange-400' : 'text-slate-400'}`}>● {mine.status}</div></div>
        {mine.status !== 'BUSY' && <button className="btn-ghost btn btn-sm" onClick={toggle}>{mine.status === 'AVAILABLE' ? 'Go offline' : 'Go available'}</button>}</div>}
      <ErrorBox message={inc.error} />
      {inc.loading && !inc.data ? <Spinner /> : <>
        <h2 className="mb-2 font-bold">Active ({active.length})</h2>
        <div className="grid gap-3 md:grid-cols-2">{active.length === 0 && <Empty>No active assignment. You will be alerted instantly when dispatch assigns one.</Empty>}
          {active.map(i => <IncidentCard key={i.id} i={i} to={`/app/incident/${i.id}`} />)}</div>
        {done.length > 0 && <><h2 className="mb-2 mt-6 font-bold">History</h2><div className="grid gap-3 md:grid-cols-2">{done.map(i => <IncidentCard key={i.id} i={i} to={`/app/incident/${i.id}`} />)}</div></>}
      </>}
    </div>
  );
}
