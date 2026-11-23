import { api } from '../lib/api.js';
import { useFetch, timeAgo } from '../lib/hooks.js';
import { Empty, PageTitle, Spinner } from '../components/ui.jsx';
import { Link } from 'react-router-dom';

export default function Alerts() {
  const { data } = useFetch(() => api('/notifications'), [], ['notification']);
  const dot = { critical: 'bg-red-400', warn: 'bg-orange-400', success: 'bg-green-400', info: 'bg-blue-400' };
  return (
    <div><PageTitle>Alerts</PageTitle>
      {!data ? <Spinner /> : data.length === 0 ? <Empty>No notifications yet.</Empty> :
        <div className="grid gap-2">{data.map(n => (
          <Link key={n.id} to={n.incidentId ? `/app/incident/${n.incidentId}` : '#'} className="card flex gap-3 py-3">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot[n.level] || dot.info}`} />
            <div className="min-w-0"><div className="font-semibold">{n.title}</div><div className="truncate text-sm text-slate-300">{n.body}</div><div className="text-xs text-slate-500">{timeAgo(n.at)}</div></div></Link>))}</div>}
    </div>
  );
}
