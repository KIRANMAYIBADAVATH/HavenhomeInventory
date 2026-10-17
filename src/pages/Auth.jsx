import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Package, MapPin, CalendarClock, ListChecks, MailCheck } from 'lucide-react';
import { useAuth } from '../store/AuthContext.jsx';

const FEATURES = [
  [Package, 'Know exactly what you own'],
  [MapPin, 'Remember where everything is stored'],
  [CalendarClock, 'Never miss an expiry date'],
  [ListChecks, 'Restock before you run out'],
];

export default function Auth({ mode }) {
  const isReg = mode === 'register';
  const { user, login, register } = useAuth();
  const loc = useLocation();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState({});
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  if (user) return <Navigate to={loc.state?.from || '/'} replace />;

  const validate = () => {
    const e = {};
    if (isReg && !f.name.trim()) e.name = 'Enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address';
    if (!f.password) e.password = 'Enter your password';
    else if (isReg && f.password.length < 8) e.password = 'Use at least 8 characters';
    if (isReg && f.confirm !== f.password) e.confirm = 'Passwords do not match';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    const er = validate();
    setErr(er);
    setFormErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      if (isReg) {
        const r = await register(f.name.trim(), f.email.trim(), f.password);
        if (r.needsConfirm) { setConfirmSent(true); setBusy(false); }
      } else {
        await login(f.email.trim(), f.password);
      }
      // when a session exists, AuthContext sets the user and the <Navigate> above redirects
    } catch (e) {
      setFormErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand">Haven<small>Home Inventory Manager</small></div>
        <h2>Know what you own.<br />Find it when you need it.</h2>
        <ul>{FEATURES.map(([Icon, text]) => <li key={text}><Icon size={18} /> {text}</li>)}</ul>
      </aside>

      <main className="auth-main">
        {confirmSent ? (
          <div className="auth-card">
            <MailCheck size={32} color="var(--p)" />
            <h1>Check your email</h1>
            <p className="muted">We sent a confirmation link to <b>{f.email}</b>. Open it, then come back and log in.</p>
            <Link className="btn primary block" to="/login">Go to log in</Link>
          </div>
        ) : (
        <form className="auth-card" onSubmit={submit} noValidate>
          <h1>{isReg ? 'Create your account' : 'Welcome back'}</h1>
          <p className="muted">{isReg ? 'Start tracking your household items.' : 'Log in to open your home inventory.'}</p>

          {formErr && <div className="alert" role="alert">{formErr}</div>}

          {isReg && (
            <label className="field"><span>Full name</span>
              <input value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" autoFocus aria-invalid={!!err.name} />
              {err.name && <small className="err" role="alert">{err.name}</small>}
            </label>
          )}

          <label className="field"><span>Email</span>
            <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" autoFocus={!isReg} aria-invalid={!!err.email} />
            {err.email && <small className="err" role="alert">{err.email}</small>}
          </label>

          <label className="field"><span>Password</span>
            <div className="pw">
              <input type={show ? 'text' : 'password'} value={f.password} onChange={(e) => set('password', e.target.value)}
                autoComplete={isReg ? 'new-password' : 'current-password'} aria-invalid={!!err.password} />
              <button type="button" className="icon" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {err.password && <small className="err" role="alert">{err.password}</small>}
            {isReg && !err.password && <small>At least 8 characters.</small>}
          </label>

          {isReg && (
            <label className="field"><span>Confirm password</span>
              <input type={show ? 'text' : 'password'} value={f.confirm} onChange={(e) => set('confirm', e.target.value)} autoComplete="new-password" aria-invalid={!!err.confirm} />
              {err.confirm && <small className="err" role="alert">{err.confirm}</small>}
            </label>
          )}

          <button className="btn primary block" disabled={busy}>
            {busy && <Loader2 size={16} className="spin" />} {isReg ? 'Create account' : 'Log in'}
          </button>

          <p className="switch">
            {isReg ? <>Already have an account? <Link to="/login" state={loc.state}>Log in</Link></>
                   : <>New to Haven? <Link to="/register" state={loc.state}>Create an account</Link></>}
          </p>
        </form>
        )}
      </main>
    </div>
  );
}
