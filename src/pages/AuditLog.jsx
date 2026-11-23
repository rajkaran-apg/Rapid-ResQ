import { useState } from 'react';
import { api, qs } from '../lib/api.js';
import { useFetch, fmtTime } from '../lib/hooks.js';
import { Empty, PageTitle, Spinner } from '../components/ui.jsx';
import { Link } from 'react-router-dom';

const OUT = { SUCCESS: 'text-green-400', DENIED: 'text-orange-400', FAILED: 'text-red-400' };
export default function AuditLog() {
  const [f, setF] = useState({ q: '', outcome: '', from: '', to: '' }), [limit, setLimit] = useState(50);
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setLimit(50); };
  const { data, loading } = useFetch(() => api('/admin/audit' + qs({ ...f, limit })), [JSON.stringify(f), limit], ['audit:new']);
  return (
    <div>
      <PageTitle right={<span className="text-xs text-green-400">● Live</span>}>Audit trail</PageTitle>
      <div className="card grid grid-cols-2 gap-2 md:grid-cols-4">
        <input className="inp col-span-2 md:col-span-1" placeholder="Search action / user / incident" value={f.q} onChange={set('q')} />
        <select className="inp" value={f.outcome} onChange={set('outcome')}><option value="">All outcomes</option><option value="SUCCESS">Success</option><option value="DENIED">Permission denied</option><option value="FAILED">Failed</option></select>
        <input className="inp" type="date" value={f.from} onChange={set('from')} /><input className="inp" type="date" value={f.to} onChange={set('to')} />
      </div>
      {loading && !data ? <Spinner /> : <div className="mt-3 grid gap-2">
        {data?.items.length === 0 && <Empty>No audit records match.</Empty>}
        {data?.items.map(a => (
          <div key={a.id} className="card py-3 text-sm">
            <div className="flex justify-between gap-2"><b>{a.action}</b><span className={`text-xs font-semibold ${OUT[a.outcome]}`}>{a.outcome}</span></div>
            <div className="text-slate-400">{a.actorName} <span className="text-xs">({a.actorRole})</span> · {fmtTime(a.at)}{a.ip ? ` · ${a.ip}` : ''}</div>
            {a.incidentId && <Link className="font-mono text-xs text-blue-300" to={`/app/incident/${a.incidentId}`}>{a.incidentId}</Link>}
            {a.detail && <div className="mt-1 text-slate-300">{a.detail}</div>}
          </div>))}
        {data && data.total > data.items.length && <button className="btn-ghost btn" onClick={() => setLimit(limit + 50)}>Load more ({data.total - data.items.length} older)</button>}
      </div>}
    </div>
  );
}
