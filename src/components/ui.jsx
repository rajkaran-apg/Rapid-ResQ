import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEV_CLASS, STATUS_CLASS, STATUS_LABEL, TYPE_ICON } from '../lib/constants.js';
import { timeAgo } from '../lib/hooks.js';

export const toast = (message, level = 'info') => window.dispatchEvent(new CustomEvent('rq-toast', { detail: { message, level } }));

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const on = e => {
      const t = { id: Math.random(), ...e.detail };
      setItems(x => [...x.slice(-3), t]);
      setTimeout(() => setItems(x => x.filter(i => i.id !== t.id)), 5000);
    };
    window.addEventListener('rq-toast', on); return () => window.removeEventListener('rq-toast', on);
  }, []);
  const color = { error: 'border-red-500', critical: 'border-red-500', warn: 'border-orange-500', success: 'border-green-500', info: 'border-blue-500' };
  return (
    <div className="pointer-events-none fixed inset-x-3 z-[2000] flex flex-col gap-2 md:left-auto md:right-4 md:w-96" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
      {items.map(t => <div key={t.id} className={`pointer-events-auto rounded-xl border-l-4 bg-slate-800 px-4 py-3 text-sm shadow-xl ${color[t.level] || color.info}`}>{t.message}</div>)}
    </div>
  );
}

export const SeverityBadge = ({ s }) => s
  ? <span className={`chip ${SEV_CLASS[s]}`}>{s}</span>
  : <span className="chip border-slate-500/50 bg-slate-500/10 text-slate-400">Priority pending</span>;
export const StatusBadge = ({ s }) => <span className={`chip ${STATUS_CLASS[s]}`}>{STATUS_LABEL[s]}</span>;
export const Spinner = () => <div className="flex justify-center p-8"><div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-red-400" /></div>;
export const ErrorBox = ({ message }) => message ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{message}</div> : null;
export const Empty = ({ children }) => <div className="card text-center text-slate-400">{children}</div>;
export const PageTitle = ({ children, right }) => <div className="mb-4 flex items-center justify-between gap-3"><h1 className="text-xl font-bold">{children}</h1>{right}</div>;

export function IncidentCard({ i, draggable, onDragStart, selected, onClick, to }) {
  const body = (
    <div
      draggable={draggable} onDragStart={onDragStart} onClick={onClick}
      className={`card block transition hover:border-white/30 ${selected ? 'ring-2 ring-red-400' : ''}`}
      style={{ borderLeft: `4px solid ${{ Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e' }[i.severity] || '#64748b'}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-xs text-slate-400">{i.id}</div>
          <div className="mt-0.5 font-semibold">{TYPE_ICON[i.type]} {i.type}</div>
        </div>
        <div className="flex flex-col items-end gap-1"><SeverityBadge s={i.severity} /><StatusBadge s={i.status} /></div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-300">{i.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400">
        <span className="truncate">📍 {i.address}</span><span className="shrink-0">{timeAgo(i.createdAt)}</span>
      </div>
      {!i.severity && i.aiSeverity && <div className="mt-2 text-xs text-purple-300">✦ AI suggests {i.aiSeverity} ({Math.round(i.aiConfidence * 100)}%)</div>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export function Timeline({ events, showNotes = true }) {
  return (
    <ol className="ml-2 border-l border-white/15">
      {events.map((e, n) => (
        <li key={e.id || n} className="relative ml-4 pb-4">
          <span className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full ${e.status ? 'bg-red-400' : 'bg-slate-500'}`} />
          <div className="text-sm font-medium">{e.label}</div>
          <div className="text-xs text-slate-400">{new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{e.actorName ? ` · ${e.actorName}` : ''}</div>
          {showNotes && e.note && <div className="mt-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-300">{e.note}</div>}
        </li>
      ))}
    </ol>
  );
}
