import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, MapPin, AlertTriangle, CalendarClock, ListChecks, History, Menu, Search, Plus, Bell, LogOut, Cloud, CloudOff } from 'lucide-react';
import { useInv } from '../store/InventoryContext.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { isLow } from '../lib/status.js';
import ItemForm from './ItemForm.jsx';

const NAV = [
  ['/', 'Overview', LayoutDashboard], ['/items', 'All Items', Package], ['/rooms', 'Rooms & Locations', MapPin],
  ['/low-stock', 'Low Stock', AlertTriangle], ['/expiry', 'Expiry Tracking', CalendarClock],
  ['/shopping', 'Shopping List', ListChecks], ['/activity', 'Activity History', History],
];

export default function Layout() {
  const { items, status, toasts, sync, retrySave } = useInv();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const alerts = items.filter((i) => isLow(i) || status(i) === 'expired').length;
  const title = NAV.find((n) => n[0] === pathname)?.[1] || 'Haven';

  return (
    <div className="shell">
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="brand">Haven<small>Home Inventory Manager</small></div>
        <nav>
          {NAV.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="top">
          <button className="icon menu" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <h1>{title}</h1>
          <form className="gsearch" onSubmit={(e) => { e.preventDefault(); nav(`/items${q ? `?q=${encodeURIComponent(q)}` : ''}`); }}>
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search inventory…" aria-label="Search inventory" />
          </form>
          {sync === 'error' ? (
            <button className="sync err" onClick={retrySave} title="Changes not saved. Click to retry."><CloudOff size={16} /> <span>Not saved · Retry</span></button>
          ) : (
            <span className="sync" role="status" title={sync === 'saving' ? 'Saving…' : 'All changes saved'}><Cloud size={16} /> <span>{sync === 'saving' ? 'Saving…' : 'Saved'}</span></span>
          )}
          <button className="icon bell" onClick={() => nav('/low-stock')} aria-label={`${alerts} stock or expiry alerts`} title="Stock/expiry alerts">
            <Bell size={18} />{alerts > 0 && <span className="dot">{alerts}</span>}
          </button>
          <button className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> Add Item</button>
          <div className="user" title={user.email}>
            <span className="avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
            <span className="uname">{user.name}</span>
          </div>
          <button className="icon" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={18} /></button>
        </header>
        <main className="page"><Outlet /></main>
      </div>
      {adding && <ItemForm onClose={() => setAdding(false)} />}
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}</div>
    </div>
  );
}
