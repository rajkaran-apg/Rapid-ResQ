import { useState } from 'react';
import { Filter } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api, qs } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { TYPES, SEVERITIES, STATUSES, STATUS_LABEL } from '../lib/constants.js';
import { Empty, ErrorBox, IncidentCard, PageTitle, Spinner } from '../components/ui.jsx';

const BLANK = { status: 'active', type: '', severity: '', teamId: '', location: '', q: '', from: '', to: '' };

export default function Dashboard() {
  const [f, setF] = useState(BLANK), [open, setOpen] = useState(false), [limit, setLimit] = useState(20);
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setLimit(20); };
  const stats = useFetch(() => api('/analytics'), []);
  const teams = useFetch(() => api('/teams'), [], ['team:update']);
  const list = useFetch(() => api('/incidents' + qs({ ...f, limit })), [JSON.stringify(f), limit]);
  const k = stats.data?.kpis;
  const drill = patch => { setF({ ...BLANK, status: '', ...patch }); setLimit(20); window.scrollTo({ top: 520, behavior: 'smooth' }); };

  const Kpi = ({ label, value, sub, onClick, tone = '' }) => (
    <button onClick={onClick} className="card text-left transition hover:border-white/30"><div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-3xl font-extrabold ${tone}`}>{value ?? '—'}</div><div className="text-xs text-slate-500">{sub}</div></button>);

  return (
    <div>
      <PageTitle right={<span className="text-xs text-green-400">● Live</span>}>Command centre</PageTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Active" value={k?.active} sub="tap to drill down" tone="text-orange-300" onClick={() => drill({ status: 'active' })} />
        <Kpi label="Critical" value={k?.criticalActive} sub="active critical" tone="text-red-400" onClick={() => drill({ status: 'active', severity: 'Critical' })} />
        <Kpi label="Needs review" value={k?.pendingReview} sub="awaiting verification" tone="text-yellow-300" onClick={() => drill({ status: 'REPORTED' })} />
        <Kpi label="Resolved" value={k?.resolved} sub={k ? `${k.resolutionRate}% resolution rate` : ''} tone="text-green-400" onClick={() => drill({ status: 'RESOLVED' })} />
        <Kpi label="Avg response" value={k?.avgResponseMin != null ? k.avgResponseMin + ' min' : '—'} sub="report → on site" />
        <Kpi label="Avg resolution" value={k?.avgResolutionMin != null ? k.avgResolutionMin + ' min' : '—'} sub="report → resolved" />
        <Kpi label="Citizen rating" value={k?.avgRating != null ? k.avgRating + ' ★' : '—'} sub="from reviews" />
        <Kpi label="Total reports" value={k?.total} sub="all time" onClick={() => drill({ status: 'all' })} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="card"><h3 className="mb-2 font-bold">Teams</h3>
          {!teams.data ? <Spinner /> : teams.data.length === 0 ? <p className="text-sm text-slate-400">No teams yet. Admin can create teams under Users &amp; teams.</p> :
            <div className="grid grid-cols-2 gap-2">{teams.data.map(t => (
              <button key={t.id} onClick={() => drill({ teamId: t.id, status: 'all' })} className="rounded-xl bg-white/5 p-3 text-left text-sm">
                <div className="font-semibold">{t.name}</div>
                <div className={t.status === 'AVAILABLE' ? 'text-green-400' : t.status === 'BUSY' ? 'text-orange-400' : 'text-slate-500'}>● {t.status}</div>
                <div className="text-xs text-slate-400">{t.activeIncidents} active · {t.members} members</div></button>))}</div>}
        </div>
        <div className="card"><h3 className="mb-2 font-bold">Reported vs resolved (14 days)</h3>
          <div style={{ height: 160 }}><ResponsiveContainer><AreaChart data={stats.data?.daily || []}>
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} /><YAxis allowDecimals={false} stroke="#64748b" fontSize={11} width={24} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
            <Area dataKey="reported" stroke="#ef4444" fill="#ef444433" /><Area dataKey="resolved" stroke="#22c55e" fill="#22c55e33" /></AreaChart></ResponsiveContainer></div></div>
      </div>

      <div className="mt-6 flex items-center justify-between"><h2 className="text-lg font-bold">Incidents <span className="text-sm font-normal text-slate-400">({list.data?.total ?? '…'})</span></h2>
        <button className="btn-ghost btn btn-sm" onClick={() => setOpen(!open)}><Filter size={16} />Filters</button></div>
      {open && <div className="card mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
        <select className="inp" value={f.status} onChange={set('status')}><option value="active">Active</option><option value="all">All</option>{STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <select className="inp" value={f.type} onChange={set('type')}><option value="">Any type</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
        <select className="inp" value={f.severity} onChange={set('severity')}><option value="">Any severity</option>{SEVERITIES.map(t => <option key={t}>{t}</option>)}</select>
        <select className="inp" value={f.teamId} onChange={set('teamId')}><option value="">Any team</option>{(teams.data || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <input className="inp" placeholder="Location contains…" value={f.location} onChange={set('location')} />
        <input className="inp" placeholder="Search ID / text" value={f.q} onChange={set('q')} />
        <input className="inp" type="date" value={f.from} onChange={set('from')} /><input className="inp" type="date" value={f.to} onChange={set('to')} />
        <button className="btn-ghost btn col-span-2 md:col-span-4" onClick={() => setF(BLANK)}>Reset filters</button></div>}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ErrorBox message={list.error} />
        {list.loading && !list.data ? <Spinner /> : list.data?.items.map(i => <IncidentCard key={i.id} i={i} to={`/app/incident/${i.id}`} />)}
      </div>
      {list.data && list.data.items.length === 0 && <Empty>No incidents match these filters.</Empty>}
      {list.data && list.data.total > list.data.items.length && <button className="btn-ghost btn mt-3 w-full" onClick={() => setLimit(limit + 20)}>Load more</button>}
    </div>
  );
}
