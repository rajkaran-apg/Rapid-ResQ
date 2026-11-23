import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { HOME } from '../lib/constants.js';
import { ErrorBox, toast } from '../components/ui.jsx';

const Shell = ({ title, sub, children }) => (
  <div className="mx-auto max-w-md p-4"><Link to="/" className="text-sm text-slate-400">← Home</Link>
    <div className="card mt-6"><h1 className="text-2xl font-bold">{title}</h1>{sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}{children}</div></div>);
const CodeInput = ({ value, onChange }) => <input className="inp text-center text-2xl tracking-[0.5em]" inputMode="numeric" maxLength={6} autoFocus value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ''))} placeholder="······" />;

export function Login() {
  const { user, signIn } = useAuth(); const nav = useNavigate();
  const [step, setStep] = useState('creds'), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [code, setCode] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  if (user) return <Navigate to={HOME[user.role]} replace />;

  const run = fn => async e => { e?.preventDefault(); setErr(''); setBusy(true); try { await fn(); } catch (x) { setErr(x.message); } setBusy(false); };
  const creds = run(async () => { const r = await api('/auth/login', { method: 'POST', body: { email, password } }); setStep(r.step); setCode(''); });
  const verifyEmail = run(async () => {
    await api('/auth/verify-email', { method: 'POST', body: { email, code } }); toast('Email verified', 'success');
    const r = await api('/auth/login', { method: 'POST', body: { email, password } }); setStep(r.step); setCode('');
  });
  const otp = run(async () => { const r = await api('/auth/login/verify', { method: 'POST', body: { email, code } }); signIn(r.token, r.user); nav(HOME[r.user.role], { replace: true }); });

  return (
    <Shell title={step === 'creds' ? 'Staff login' : step === 'verify' ? 'Verify your email' : 'Enter login code'}
      sub={step === 'creds' ? 'Sign in with your RapidResQ account.' : `We emailed a 6-digit code to ${email}.`}>
      {step === 'creds' ? (
        <form onSubmit={creds}>
          <label className="lbl">Email</label><input className="inp" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
          <label className="lbl">Password</label><input className="inp" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
          <div className="mt-3"><ErrorBox message={err} /></div>
          <button className="btn mt-4 w-full" disabled={busy}>{busy ? 'Please wait…' : 'Continue'}</button>
          <div className="mt-4 flex justify-between text-sm text-blue-300"><Link to="/forgot">Forgot password?</Link><Link to="/register">Create account</Link></div>
        </form>
      ) : (
        <form onSubmit={step === 'verify' ? verifyEmail : otp}>
          <div className="mt-4"><CodeInput value={code} onChange={setCode} /></div>
          <div className="mt-3"><ErrorBox message={err} /></div>
          <button className="btn mt-4 w-full" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : step === 'verify' ? 'Verify email' : 'Log in'}</button>
          <button type="button" className="mt-3 w-full text-sm text-slate-400" onClick={() => { setStep('creds'); setErr(''); }}>← Start over</button>
        </form>)}
    </Shell>);
}

export function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' }), [code, setCode] = useState(''), [sent, setSent] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const run = fn => async e => { e.preventDefault(); setErr(''); setBusy(true); try { await fn(); } catch (x) { setErr(x.message); } setBusy(false); };
  const reg = run(async () => { await api('/auth/register', { method: 'POST', body: f }); setSent(true); });
  const ver = run(async () => { await api('/auth/verify-email', { method: 'POST', body: { email: f.email, code } }); toast('Email verified — you can log in now', 'success'); nav('/login'); });
  return (
    <Shell title="Create account" sub={sent ? `Enter the code we emailed to ${f.email}.` : 'New accounts get read-only access. An admin can upgrade your role.'}>
      {!sent ? (
        <form onSubmit={reg}>
          <label className="lbl">Full name</label><input className="inp" required value={f.name} onChange={set('name')} />
          <label className="lbl">Email</label><input className="inp" type="email" required value={f.email} onChange={set('email')} />
          <label className="lbl">Phone (optional)</label><input className="inp" type="tel" value={f.phone} onChange={set('phone')} />
          <label className="lbl">Password</label><input className="inp" type="password" required value={f.password} onChange={set('password')} placeholder="8+ chars, letter and number" />
          <div className="mt-3"><ErrorBox message={err} /></div>
          <button className="btn mt-4 w-full" disabled={busy}>Create account</button>
          <div className="mt-4 text-center text-sm"><Link className="text-blue-300" to="/login">Already have an account?</Link></div>
        </form>) : (
        <form onSubmit={ver}><div className="mt-4"><CodeInput value={code} onChange={setCode} /></div><div className="mt-3"><ErrorBox message={err} /></div>
          <button className="btn mt-4 w-full" disabled={busy || code.length !== 6}>Verify email</button></form>)}
    </Shell>);
}

export function Forgot() {
  const nav = useNavigate();
  const [email, setEmail] = useState(''), [code, setCode] = useState(''), [password, setPassword] = useState(''), [sent, setSent] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const run = fn => async e => { e.preventDefault(); setErr(''); setBusy(true); try { await fn(); } catch (x) { setErr(x.message); } setBusy(false); };
  const send = run(async () => { await api('/auth/forgot', { method: 'POST', body: { email } }); setSent(true); });
  const reset = run(async () => { await api('/auth/reset', { method: 'POST', body: { email, code, password } }); toast('Password updated. Please log in.', 'success'); nav('/login'); });
  return (
    <Shell title="Set / reset password" sub={sent ? 'Enter the emailed code and choose a new password.' : 'We will email you a one-time code. (New staff invited by an admin: use this too.)'}>
      {!sent ? (
        <form onSubmit={send}><label className="lbl">Email</label><input className="inp" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          <div className="mt-3"><ErrorBox message={err} /></div><button className="btn mt-4 w-full" disabled={busy}>Send code</button></form>
      ) : (
        <form onSubmit={reset}><div className="mt-4"><CodeInput value={code} onChange={setCode} /></div>
          <label className="lbl">New password</label><input className="inp" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="8+ chars, letter and number" />
          <div className="mt-3"><ErrorBox message={err} /></div><button className="btn mt-4 w-full" disabled={busy || code.length !== 6}>Update password</button></form>)}
    </Shell>);
}
