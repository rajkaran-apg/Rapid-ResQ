import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Map as MapIcon, BarChart3, ScrollText, Users,
  Bell, MoreHorizontal, ClipboardList, Sun, Moon, LogOut, Activity, X
} from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useLive } from '../lib/socket.js';
import { toast } from './ui.jsx';
import { useTheme } from '../lib/theme.jsx';

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

function Brand({ compact = false }) {
  return (
    <span className={compact ? 'rr-brand rr-brand-compact' : 'rr-brand'}>
      <span className="rr-brand-mark"><img src="/rapidresq-logo.png" alt="" /></span>
      <span className="rr-brand-copy">
        <strong>RapidResQ</strong>
        {!compact && <small>RESPONSE NETWORK</small>}
      </span>
    </span>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [unread, setUnread] = useState(0);
  useLive((ev, p) => {
    if (ev === 'notification') {
      setUnread(n => n + 1);
      toast(p.title + ' — ' + p.body, p.level);
    }
  }, []);
  const keys = NAV[user.role] || NAV.VIEWER;
  const main = keys.slice(0, 4), more = keys.slice(4);
  const link = (k, compact = false) => {
    const it = ITEMS[k], Icon = it.icon;
    return (
      <NavLink key={k} to={it.to} end={it.end} onClick={() => k === 'alerts' && setUnread(0)}
        className={({ isActive }) => ['rr-nav-link', compact ? 'rr-nav-link-mobile' : '', isActive ? 'is-active' : ''].filter(Boolean).join(' ')}
        aria-label={compact ? it.label : undefined}>
        <span className="rr-nav-icon"><Icon size={compact ? 21 : 19} strokeWidth={1.8} /></span>
        <span className="rr-nav-label">{it.label}</span>
        {k === 'alerts' && unread > 0 && <em className="rr-unread-badge">{unread}</em>}
      </NavLink>
    );
  };

  return (
    <div className="rr-admin-shell">
      <aside className="rr-sidebar">
        <Link to="/" className="rr-sidebar-brand" aria-label="RapidResQ home"><Brand /></Link>
        <div className="rr-sidebar-live"><span className="rr-live-dot" /> Operations online</div>
        <div className="rr-nav-caption">WORKSPACE</div>
        <nav className="rr-sidebar-nav" aria-label="Main navigation">{keys.map(k => link(k))}</nav>
        <div className="rr-sidebar-bottom">
          <button type="button" onClick={toggleTheme} className="rr-theme-toggle">
            <span>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}{theme === 'dark' ? 'Light appearance' : 'Dark appearance'}</span>
            <span className="rr-theme-state">{theme === 'dark' ? 'DARK' : 'LIGHT'}</span>
          </button>
          <div className="rr-user-card">
            <span className="rr-user-avatar">{(user.name || 'R').trim().charAt(0).toUpperCase()}</span>
            <span className="rr-user-copy"><strong>{user.name}</strong><small>{user.role}</small></span>
            <button type="button" className="rr-logout-icon" onClick={logout} aria-label="Log out"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <div className="rr-admin-column">
        <header className="rr-mobile-header">
          <Link to="/" aria-label="RapidResQ home"><Brand /></Link>
          <div className="rr-mobile-actions">
            <Link to="/app/alerts" className="rr-header-action" aria-label={unread ? 'Alerts, unread notifications' : 'Alerts'} onClick={() => setUnread(0)}>
              <Bell size={19} />{unread > 0 && <span className="rr-header-dot" />}
            </Link>
            <span className="rr-role-pill">{user.role}</span>
          </div>
        </header>
        <main className="rr-admin-main"><Outlet /></main>
      </div>
      <MobileBar main={main} more={more} link={link} logout={logout} user={user} theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
}

function MobileBar({ main, more, link, logout, user, theme, toggleTheme }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="rr-more-backdrop" onClick={() => setOpen(false)}>
          <section className="rr-more-sheet" role="dialog" aria-modal="true" aria-label="More navigation" onClick={e => e.stopPropagation()}>
            <div className="rr-sheet-handle" />
            <div className="rr-sheet-heading"><div><small>YOUR WORKSPACE</small><strong>More options</strong></div><button type="button" className="rr-sheet-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
            <nav className="rr-more-links" aria-label="More navigation">{more.map(k => link(k))}</nav>
            <button type="button" onClick={toggleTheme} className="rr-sheet-action">
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
              <span>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
            </button>
            <div className="rr-sheet-user"><span className="rr-user-avatar">{(user.name || 'R').trim().charAt(0).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div>
            <button type="button" className="rr-sheet-logout" onClick={logout}><LogOut size={18} /> Log out</button>
          </section>
        </div>
      )}
      <nav className="rr-mobile-nav" aria-label="Primary navigation">
        {main.map(k => link(k, true))}
        <button type="button" onClick={() => setOpen(v => !v)} className={['rr-nav-link', 'rr-nav-link-mobile', open ? 'is-active' : ''].filter(Boolean).join(' ')} aria-expanded={open} aria-label="More options">
          <span className="rr-nav-icon"><MoreHorizontal size={22} /></span><span className="rr-nav-label">More</span>
        </button>
      </nav>
    </>
  );
}