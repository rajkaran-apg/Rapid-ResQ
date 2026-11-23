import { useState } from 'react';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { Empty, IncidentCard, PageTitle, Spinner, toast } from '../components/ui.jsx';
import { Link } from 'react-router-dom';

export default function Dispatch() {
  const inc = useFetch(() => api('/incidents?status=active&limit=100'), []);
  const teams = useFetch(() => api('/teams'), [], ['team:update', 'incident:update']);
  const [pick, setPick] = useState(''), [over, setOver] = useState('');
  const items = inc.data?.items || [];
  const toVerify = items.filter(i => i.status === 'REPORTED'), toAssign = items.filter(i => i.status === 'VERIFIED'), inField = items.filter(i => !['REPORTED', 'VERIFIED'].includes(i.status));

  const assign = async (incidentId, teamId) => {
    try { await api(`/incidents/${incidentId}/assign`, { method: 'POST', body: { teamId } }); toast('Team assigned', 'success'); setPick(''); inc.reload(); }
    catch (e) { toast(e.message, 'error'); }
  };
  const drop = (e, teamId) => { e.preventDefault(); setOver(''); const id = e.dataTransfer.getData('text/plain'); if (id) assign(id, teamId); };

  return (
    <div>
      <PageTitle>Dispatch board</PageTitle>
      <p className="mb-3 text-sm text-slate-400">Desktop: drag a verified incident onto an available team. Phone: tap the incident, then tap “Assign here”.</p>
      {inc.loading && !inc.data ? <Spinner /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-2 font-bold">Ready to dispatch ({toAssign.length})</h2>
            <div className="grid gap-3">{toAssign.length === 0 && <Empty>Nothing waiting for a team.</Empty>}
              {toAssign.map(i => <IncidentCard key={i.id} i={i} draggable selected={pick === i.id} onClick={() => setPick(pick === i.id ? '' : i.id)} onDragStart={e => e.dataTransfer.setData('text/plain', i.id)} />)}</div>
            {toVerify.length > 0 && <><h2 className="mb-2 mt-5 font-bold">Awaiting admin verification ({toVerify.length})</h2>
              <div className="grid gap-3">{toVerify.map(i => <IncidentCard key={i.id} i={i} to={`/app/incident/${i.id}`} />)}</div></>}
          </div>
          <div>
            <h2 className="mb-2 font-bold">Teams</h2>
            <div className="grid gap-3">{teams.data?.length === 0 && <Empty>No teams yet — an admin must create them.</Empty>}
              {teams.data?.map(t => {
                const ok = t.status === 'AVAILABLE';
                return (
                  <div key={t.id} onDragOver={e => ok && (e.preventDefault(), setOver(t.id))} onDragLeave={() => setOver('')} onDrop={e => ok && drop(e, t.id)}
                    className={`card ${over === t.id ? 'ring-2 ring-green-400' : ''} ${ok ? '' : 'opacity-60'}`}>
                    <div className="flex items-center justify-between"><b>{t.name}</b>
                      <span className={ok ? 'text-green-400' : t.status === 'BUSY' ? 'text-orange-400' : 'text-slate-500'}>● {t.status}</span></div>
                    <div className="text-xs text-slate-400">{t.base || 'No base set'} · {t.members} members · {t.activeIncidents} active</div>
                    {pick && ok && <button className="btn btn-sm mt-3 w-full" onClick={() => assign(pick, t.id)}>Assign {pick} here</button>}
                  </div>);
              })}</div>
            {inField.length > 0 && <><h2 className="mb-2 mt-5 font-bold">In progress ({inField.length})</h2>
              <div className="grid gap-3">{inField.map(i => <IncidentCard key={i.id} i={i} to={`/app/incident/${i.id}`} />)}</div></>}
          </div>
        </div>)}
      <p className="mt-6 text-center text-xs text-slate-500">Assignments are atomic on the server — a team can never be double-booked. <Link to="/app" className="text-blue-300">Back to dashboard</Link></p>
    </div>
  );
}
