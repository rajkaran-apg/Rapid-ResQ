import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AtSign, Eye, EyeOff, LockKeyhole, ShieldCheck, Siren, Activity, Radio } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { HOME } from '../lib/constants.js';
import { ErrorBox, toast } from '../components/ui.jsx';

const Shell = ({ title, sub, children }) => (
  <div className="rr-auth-page">
    <aside className="rr-auth-story" aria-label="RapidResQ operations">
      <Link to="/" className="rr-auth-brand"><img src="/rapidresq-logo.png" alt="" /><span><strong>RapidResQ</strong><small>RESPONSE NETWORK</small></span></Link>
      <div className="rr-auth-story-copy">
        <span className="rr-auth-kicker"><span /> EMERGENCY RESPONSE, CONNECTED</span>
        <h2>One network.<br /><em>Every second counts.</em></h2>
        <p>Coordinate reports, field teams and response updates from one secure operations space.</p>
      </div>
      <div className="rr-auth-visual" aria-hidden="true">
        <span className="rr-auth-orbit orbit-a" /><span className="rr-auth-orbit orbit-b" />
        <span className="rr-auth-map-dot dot-a" /><span className="rr-auth-map-dot dot-b" /><span className="rr-auth-map-dot dot-c" />
        <span className="rr-auth-visual-mark"><img src="/rapidresq-logo.png" alt="" /></span>
        <span className="rr-auth-live-card"><i /><span><b>Network status</b><small>All systems operational</small></span></span>
      </div>
      <div className="rr-auth-story-foot"><ShieldCheck size={16} /> Protected access for authorized staff</div>
    </aside>
    <main className="rr-auth-main">
      <Link to="/" className="rr-auth-back"><ArrowLeft size={16} /> Home</Link>
      <section className="rr-auth-card">
        <div className="rr-auth-mobile-brand"><img src="/rapidresq-logo.png" alt="" /><span><strong>RapidResQ</strong><small>STAFF PORTAL</small></span><span className="rr-auth-secure"><ShieldCheck size={14} /> Secure</span></div>
        <span className="rr-auth-kicker rr-auth-form-kicker"><span /> STAFF ACCESS</span>
        <h1>{title}</h1>
        <p className="rr-auth-sub">{sub}</p>
        {children}
        <div className="rr-auth-footnote"><ShieldCheck size={15} /> Authorized RapidResQ personnel only</div>
      </section>
      <p className="rr-auth-copyright">RapidResQ <span>·</span> Report. Respond. Resolve.</p>
    </main>
  </div>
);

const CodeInput = ({ value, onChange }) => (
  <input className="inp rr-code-input" aria-label="Six digit verification code" inputMode="numeric" maxLength={6} autoFocus value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
);

export function Login() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState('creds'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [code, setCode] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [showPassword, setShowPassword] = useState(false);
  if (user) return <Navigate to={HOME[user.role]} replace />;

  const run = fn => async e => {
    e?.preventDefault();
    setErr('');
    setBusy(true);
    try { await fn(); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const creds = run(async () => { const r = await api('/auth/login', { method: 'POST', body: { email, password } }); setStep(r.step); setCode(''); });
  const verifyEmail = run(async () => {
    await api('/auth/verify-email', { method: 'POST', body: { email, code } });
    toast('Email verified', 'success');
    const r = await api('/auth/login', { method: 'POST', body: { email, password } });
    setStep(r.step);
    setCode('');
  });
  const otp = run(async () => {
    const r = await api('/auth/login/verify', { method: 'POST', body: { email, code } });
    signIn(r.token, r.user);
    nav(HOME[r.user.role], { replace: true });
  });

  return (
    <Shell title={step === 'creds' ? 'Welcome back' : step === 'verify' ? 'Verify your email' : 'Check your inbox'}
      sub={step === 'creds' ? 'Sign in to your RapidResQ staff account.' : 'We sent a six-digit code to ' + email + '.'}>
      {step === 'creds' ? (
        <form onSubmit={creds} className="rr-auth-form">
          <label className="rr-auth-label" htmlFor="rr-login-email">Work email</label>
          <div className="rr-auth-input-wrap"><AtSign size={18} /><input id="rr-login-email" className="inp" type="email" autoComplete="username" placeholder="name@organization.org" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <label className="rr-auth-label" htmlFor="rr-login-password">Password</label>
          <div className="rr-auth-input-wrap"><LockKeyhole size={18} /><input id="rr-login-password" className="inp rr-password-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="button" className="rr-password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          <div className="rr-auth-form-meta"><span><ShieldCheck size={14} /> Encrypted staff sign-in</span><Link to="/forgot">Forgot password?</Link></div>
          <div className="rr-auth-error"><ErrorBox message={err} /></div>
          <button className="btn rr-auth-submit" disabled={busy}>{busy ? <><span className="rr-button-spinner" /> Please wait…</> : <>Continue securely <ArrowRight size={18} /></>}</button>
          <p className="rr-auth-invite">Staff accounts are managed by your RapidResQ administrator.</p>
        </form>
      ) : (
        <form onSubmit={step === 'verify' ? verifyEmail : otp} className="rr-auth-form rr-code-form">
          <div className="rr-code-illustration"><span><Radio size={24} /></span><small>EMAIL VERIFICATION</small></div>
          <label className="rr-auth-label" htmlFor="rr-login-code">Six-digit code</label>
          <CodeInput value={code} onChange={setCode} />
          <div className="rr-auth-error"><ErrorBox message={err} /></div>
          <button className="btn rr-auth-submit" disabled={busy || code.length !== 6}>{busy ? <><span className="rr-button-spinner" /> Checking…</> : <>{step === 'verify' ? 'Verify email' : 'Sign in'} <ArrowRight size={18} /></>}</button>
          <button type="button" className="rr-auth-back-link" onClick={() => { setStep('creds'); setErr(''); }}><ArrowLeft size={15} /> Use a different account</button>
        </form>
      )}
    </Shell>
  );
}

export function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' }), [code, setCode] = useState(''), [sent, setSent] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const run = fn => async e => { e.preventDefault(); setErr(''); setBusy(true); try { await fn(); } catch (x) { setErr(x.message); } setBusy(false); };
  const reg = run(async () => { await api('/auth/register', { method: 'POST', body: f }); setSent(true); });
  const ver = run(async () => { await api('/auth/verify-email', { method: 'POST', body: { email: f.email, code } }); toast('Email verified — you can log in now', 'success'); nav('/login'); });
  return (
    <Shell title="Create account" sub={sent ? 'Enter the code we emailed to ' + f.email + '.' : 'New accounts get read-only access. An admin can upgrade your role.'}>
      {!sent ? (
        <form onSubmit={reg} className="rr-auth-form">
          <label className="lbl">Full name</label><input className="inp" required value={f.name} onChange={set('name')} />
          <label className="lbl">Email</label><input className="inp" type="email" required value={f.email} onChange={set('email')} />
          <label className="lbl">Phone (optional)</label><input className="inp" type="tel" value={f.phone} onChange={set('phone')} />
          <label className="lbl">Password</label><input className="inp" type="password" required value={f.password} onChange={set('password')} placeholder="8+ chars, letter and number" />
          <div className="rr-auth-error"><ErrorBox message={err} /></div><button className="btn rr-auth-submit" disabled={busy}>Create account <ArrowRight size={18} /></button>
          <div className="mt-4 text-center text-sm"><Link className="text-blue-300" to="/login">Already have an account?</Link></div>
        </form>) : (
        <form onSubmit={ver} className="rr-auth-form"><div className="mt-4"><CodeInput value={code} onChange={setCode} /></div><div className="rr-auth-error"><ErrorBox message={err} /></div>
          <button className="btn rr-auth-submit" disabled={busy || code.length !== 6}>Verify email <ArrowRight size={18} /></button></form>)}
    </Shell>
  );
}

export function Forgot() {
  const nav = useNavigate();
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [password, setPassword] = useState(''), [sent, setSent] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const run = fn => async e => { e.preventDefault(); setErr(''); setBusy(true); try { await fn(); } catch (x) { setErr(x.message); } setBusy(false); };
  const send = run(async () => { await api('/auth/forgot', { method: 'POST', body: { email } }); setSent(true); });
  const reset = run(async () => { await api('/auth/reset', { method: 'POST', body: { email, code, password } }); toast('Password updated. Please log in.', 'success'); nav('/login'); });
  return (
    <Shell title="Reset your password" sub={sent ? 'Enter the emailed code and choose a new password.' : 'We will email you a one-time code.'}>
      {!sent ? (
        <form onSubmit={send} className="rr-auth-form"><label className="rr-auth-label" htmlFor="rr-forgot-email">Work email</label>
          <div className="rr-auth-input-wrap"><AtSign size={18} /><input id="rr-forgot-email" className="inp" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@organization.org" /></div>
          <div className="rr-auth-error"><ErrorBox message={err} /></div><button className="btn rr-auth-submit" disabled={busy}>Send login code <ArrowRight size={18} /></button></form>
      ) : (
        <form onSubmit={reset} className="rr-auth-form"><label className="rr-auth-label" htmlFor="rr-reset-code">Six-digit code</label><CodeInput value={code} onChange={setCode} />
          <label className="rr-auth-label" htmlFor="rr-reset-password">New password</label><input id="rr-reset-password" className="inp" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="8+ chars, letter and number" />
          <div className="rr-auth-error"><ErrorBox message={err} /></div><button className="btn rr-auth-submit" disabled={busy || code.length !== 6}>Update password <ArrowRight size={18} /></button></form>)}
    </Shell>
  );
}