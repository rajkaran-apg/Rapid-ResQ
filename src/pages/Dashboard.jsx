import { useState } from 'react';
import {
  Activity, AlertTriangle, ClipboardCheck, CheckCircle2, Timer, Clock3,
  Star, FileText, ArrowUpRight, Filter, Users, Radio
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api, qs } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { TYPES, SEVERITIES, STATUSES, STATUS_LABEL } from '../lib/constants.js';
import { Empty, ErrorBox, IncidentCard, Spinner } from '../components/ui.jsx';

const BLANK = { status: 'active', type: '', severity: '', teamId: '', location: '', q: '', from: '', to: '' };

function Kpi({ label, value, sub, onClick, tone, icon: Icon }) {
  const Tag = onClick ? 'button' : 'article';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={['rr-kpi', 'tone-' + tone, onClick ? 'is-clickable' : ''].filter(Boolean).join(' ')}>
      <div className="rr-kpi-top">
        <span className="rr-kpi-icon"><Icon size={19} strokeWidth={1.8} /></span>
        {onClick && <ArrowUpRight className="rr-kpi-arrow" size={17} />}
      </div>
      <span className="rr-kpi-label">{label}</span>
      <strong className="rr-kpi-value">{value ?? '—'}</strong>
      <span className="rr-kpi-sub">{sub || 'Updated in real time'}</span>
    </Tag>
  );
}

export default function Dashboard() {
  const [f, setF] = useState(BLANK), [open, setOpen] = useState(false), [limit, setLimit] = useState(20);
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setLimit(20); };
  const stats = useFetch(() => api('/analytics'), []);
  const teams = useFetch(() => api('/teams'), [], ['team:update']);
  const list = useFetch(() => api('/incidents' + qs({ ...f, limit })), [JSON.stringify(f), limit]);
  const k = stats.data?.kpis;
  const drill = patch => {
    setF({ ...BLANK, status: '', ...patch });
    setLimit(20);
    window.setTimeout(() => document.getElementById('rr-incidents')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  };

  return (
    <div className="rr-dashboard">
      <section className="rr-dashboard-hero">
        <div className="rr-dashboard-copy">
          <span className="rr-eyebrow"><Activity size={14} /> RAPIDRESQ OPERATIONS</span>
          <h1>Command centre</h1>
          <p>Your response network, at a glance.</p>
        </div>
        <div className="rr-live-pill"><span className="rr-live-dot" /> Live operations</div>
      </section>

      <section className="rr-kpi-grid" aria-label="Incident overview">
        <Kpi label="Active incidents" value={k?.active} sub="Tap to view active incidents" tone="orange" icon={Activity} onClick={() => drill({ status: 'active' })} />
        <Kpi label="Critical" value={k?.criticalActive} sub="High-priority response needed" tone="red" icon={AlertTriangle} onClick={() => drill({ status: 'active', severity: 'Critical' })} />
        <Kpi label="Needs review" value={k?.pendingReview} sub="Awaiting verification" tone="amber" icon={ClipboardCheck} onClick={() => drill({ status: 'REPORTED' })} />
        <Kpi label="Resolved" value={k?.resolved} sub={k ? k.resolutionRate + '% resolution rate' : 'All-time outcomes'} tone="green" icon={CheckCircle2} onClick={() => drill({ status: 'RESOLVED' })} />
        <Kpi label="Avg response" value={k?.avgResponseMin != null ? k.avgResponseMin + ' min' : '—'} sub="Report to responder on site" tone="blue" icon={Timer} />
        <Kpi label="Avg resolution" value={k?.avgResolutionMin != null ? k.avgResolutionMin + ' min' : '—'} sub="Report to incident resolved" tone="violet" icon={Clock3} />
        <Kpi label="Citizen rating" value={k?.avgRating != null ? k.avgRating + ' ★' : '—'} sub="From citizen reviews" tone="gold" icon={Star} />
        <Kpi label="Total reports" value={k?.total} sub="All reports, all time" tone="teal" icon={FileText} onClick={() => drill({ status: 'all' })} />
      </section>

      <section className="rr-dashboard-secondary">
        <article className="rr-panel rr-teams-panel">
          <div className="rr-panel-heading"><div><span className="rr-eyebrow">FIELD RESPONSE</span><h2>Teams</h2></div><span className="rr-panel-icon"><Users size={18} /></span></div>
          {!teams.data ? <Spinner /> : teams.data.length === 0 ? <Empty>No teams yet. Admin can create teams under Users &amp; teams.</Empty> :
            <div className="rr-team-grid">{teams.data.map(t => {
              const available = t.status === 'AVAILABLE';
              return (
                <button key={t.id} type="button" onClick={() => drill({ teamId: t.id, status: 'all' })} className="rr-team-card">
                  <span className="rr-team-initial">{(t.name || 'T').charAt(0).toUpperCase()}</span>
                  <span className="rr-team-details"><strong>{t.name}</strong><small>{t.activeIncidents} active · {t.members} members</small></span>
                  <span className={['rr-team-status', available ? 'available' : t.status === 'BUSY' ? 'busy' : 'offline'].join(' ')}><i />{t.status}</span>
                </button>
              );
            })}</div>}
        </article>

        <article className="rr-panel rr-chart-panel">
          <div className="rr-panel-heading"><div><span className="rr-eyebrow">LAST 14 DAYS</span><h2>Response activity</h2></div><span className="rr-panel-icon"><Radio size={18} /></span></div>
          <div className="rr-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.data?.daily || []} margin={{ top: 10, right: 5, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="rr-reported-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6b63" stopOpacity={0.32} /><stop offset="95%" stopColor="#ff6b63" stopOpacity={0} /></linearGradient>
                  <linearGradient id="rr-resolved-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#44d7ac" stopOpacity={0.25} /><stop offset="95%" stopColor="#44d7ac" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#71849a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#71849a" fontSize={10} tickLine={false} axisLine={false} width={26} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="reported" name="Reported" stroke="#ff6b63" strokeWidth={2.5} fill="url(#rr-reported-fill)" />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#44d7ac" strokeWidth={2.5} fill="url(#rr-resolved-fill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="rr-chart-legend"><span><i className="reported" /> Reported</span><span><i className="resolved" /> Resolved</span></div>
        </article>
      </section>

      <section className="rr-incidents-section" id="rr-incidents">
        <div className="rr-incidents-heading">
          <div><span className="rr-eyebrow">LIVE QUEUE</span><h2>Incidents <small>({list.data?.total ?? '…'})</small></h2></div>
          <button type="button" className={['rr-filter-button', open ? 'is-open' : ''].join(' ')} onClick={() => setOpen(!open)}><Filter size={16} />{open ? 'Hide filters' : 'Filters'}</button>
        </div>
        {open && <div className="rr-filter-panel">
          <select className="inp" aria-label="Filter by status" value={f.status} onChange={set('status')}><option value="active">Active</option><option value="all">All</option>{STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
          <select className="inp" aria-label="Filter by incident type" value={f.type} onChange={set('type')}><option value="">Any type</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
          <select className="inp" aria-label="Filter by severity" value={f.severity} onChange={set('severity')}><option value="">Any severity</option>{SEVERITIES.map(t => <option key={t}>{t}</option>)}</select>
          <select className="inp" aria-label="Filter by team" value={f.teamId} onChange={set('teamId')}><option value="">Any team</option>{(teams.data || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <input className="inp" aria-label="Filter by location" placeholder="Location contains…" value={f.location} onChange={set('location')} />
          <input className="inp" aria-label="Search incident" placeholder="Search ID / text" value={f.q} onChange={set('q')} />
          <input className="inp" aria-label="From date" type="date" value={f.from} onChange={set('from')} />
          <input className="inp" aria-label="To date" type="date" value={f.to} onChange={set('to')} />
          <button type="button" className="rr-reset-filters" onClick={() => setF(BLANK)}>Reset filters</button>
        </div>}
        <div className="rr-incident-grid">
          <ErrorBox message={list.error} />
          {list.loading && !list.data ? <Spinner /> : list.data?.items.map(i => <IncidentCard key={i.id} i={i} to={'/app/incident/' + i.id} />)}
        </div>
        {list.data && list.data.items.length === 0 && <Empty>No incidents match these filters.</Empty>}
        {list.data && list.data.total > list.data.items.length && <button type="button" className="rr-load-more" onClick={() => setLimit(limit + 20)}>Load more incidents</button>}
      </section>
    </div>
  );
}