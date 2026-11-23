import { useState } from 'react';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { IncidentMap } from '../components/MapView.jsx';
import { PageTitle, Spinner } from '../components/ui.jsx';

export default function MapPage() {
  const [all, setAll] = useState(false);
  const inc = useFetch(() => api(`/incidents?status=${all ? 'all' : 'active'}&limit=200`), [all]);
  const items = inc.data?.items || [];
  return (
    <div>
      <PageTitle right={<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> Include closed</label>}>Incident map</PageTitle>
      {inc.loading && !inc.data ? <Spinner /> : <IncidentMap incidents={items} height={Math.max(360, Math.round(window.innerHeight * 0.65))} />}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
        {[['Critical', '#ef4444'], ['High', '#f97316'], ['Medium', '#eab308'], ['Low', '#22c55e'], ['Pending', '#94a3b8']].map(([n, c]) => <span key={n}><i className="mr-1 inline-block h-3 w-3 rounded-full" style={{ background: c }} />{n}</span>)}
        <span>· {items.filter(i => i.lat != null).length} of {items.length} have GPS</span>
      </div>
    </div>
  );
}
