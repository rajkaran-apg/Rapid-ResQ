import { NavLink, Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Truck, Map as MapIcon, BarChart3, ScrollText, Users, Bell, Siren, MoreHorizontal, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useLive } from '../lib/socket.js';
import { toast } from './ui.jsx';

const ITEMS = {
  dashboard: { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  dispatch: { to: '/app/dispatch', label: 'Dispatch', icon: Truck },
  assignments: { to: '/app/assignments', label: 'Assignments', icon: ClipboardList },
  map: { to: '/app/map', label: 'Map', icon: MapIcon },
  analytics: { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  audit: { to: '/app/audit', label: 'Audit log', icon: ScrollText },
  admin: { to: '/app/admin', label: 'Users & teams', icon: Users },
  alerts: { to: '/app/alerts', label: 'Alerts', icon: Bell }
};
const NAV = {
  ADMIN: ['dashboard', 'dispatch', 'map', 'analytics', 'audit', 'admin', 'alerts'],
  DISPATCHER: ['dashboard', 'dispatch', 'map', 'analytics', 'alerts'],
  RESPONDER: ['assignments', 'map', 'alerts'],
  VIEWER: ['dashboard', 'map', 'analytics']
};

export default function Layout() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  useLive((ev, p) => { if (ev === 'notification') { setUnread(n => n + 1); toast(`${p.title} — ${p.body}`, p.level); } }, []);
  const keys = NAV[user.role];
  const main = keys.slice(0, 4), more = keys.slice(4);
  const link = (k, compact) => { const it = ITEMS[k], Icon = it.icon; return (
    <NavLink key={k} to={it.to} end={it.end} onClick={() => k === 'alerts' && setUnread(0)}
      className={({ isActive }) => `relative flex rounded-xl text-sm ${compact ? 'min-w-[60px] flex-col items-center gap-0.5 px-2 py-1.5 text-[11px]' : 'items-center gap-3 px-3 py-2.5 md:w-full'} ${isActive ? 'bg-red-500/20 text-red-300' : 'text-slate-400 hover:bg-white/5'}`}>
      <Icon size={compact ? 22 : 20} />{it.label}{k === 'alerts' && unread > 0 && <em className="absolute right-2 top-0.5 rounded-full bg-red-500 px-1.5 text-[10px] not-italic text-white">{unread}</em>}
    </NavLink>); };

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-white/10 p-4 md:flex">
        <Link to="/" className="mb-4 flex items-center gap-2 text-xl font-extrabold"><Siren className="text-red-400" /> RapidResQ</Link>
        {keys.map(k => link(k))}
        <div className="mt-auto rounded-xl bg-white/5 p-3 text-sm"><div className="font-semibold">{user.name}</div><div className="text-xs text-slate-400">{user.role}</div>
          <button className="btn-ghost btn-sm btn mt-2 w-full" onClick={logout}>Log out</button></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur md:hidden">
          <span className="flex items-center gap-2 font-extrabold"><Siren size={20} className="text-red-400" /> RapidResQ</span>
          <span className="text-xs text-slate-400">{user.role}</span>
        </header>
        <main className="mx-auto max-w-6xl p-4 pb-28 md:pb-8"><Outlet /></main>
      </div>
      <MobileBar main={main} more={more} link={link} logout={logout} user={user} />
    </div>
  );
}

function MobileBar({ main, more, link, logout, user }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setOpen(false)}>
        <div className="absolute inset-x-3 bottom-24 rounded-2xl border border-white/10 bg-slate-900 p-3" onClick={() => setOpen(false)}>
          {more.map(k => link(k))}
          <div className="mt-2 border-t border-white/10 pt-2 text-sm text-slate-400">{user.name} · {user.email}</div>
          <button className="btn-ghost btn mt-2 w-full" onClick={logout}>Log out</button>
        </div></div>}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-white/10 bg-slate-950/95 px-1 pt-1 backdrop-blur md:hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}>
        {main.map(k => link(k, true))}
        <button onClick={() => setOpen(o => !o)} className="flex min-w-[60px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] text-slate-400"><MoreHorizontal size={22} />More</button>
      </nav>
    </>
  );
}
