import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Camera, Search, LogIn } from 'lucide-react';
import { api } from '../lib/api.js';
import { TYPES, TYPE_ICON } from '../lib/constants.js';
import { getPosition, reverseGeocode } from '../lib/geo.js';
import { MapPicker } from '../components/MapView.jsx';
import { ErrorBox, toast } from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function Report() {
  const nav = useNavigate(); const { user } = useAuth();
  const [f, setF] = useState({ type: 'Accident', description: '', address: '', lat: null, lng: null, reporterName: '', reporterPhone: '', reporterEmail: '', image: '' });
  const [busy, setBusy] = useState(false), [gpsBusy, setGpsBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(null), [trackId, setTrackId] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });

  const place = async (lat, lng) => {
    setF(x => ({ ...x, lat, lng }));
    const a = await reverseGeocode(lat, lng);
    if (a) setF(x => ({ ...x, address: a }));
  };
  const useGps = async () => {
    setGpsBusy(true);
    try { const p = await getPosition(); await place(p.lat, p.lng); toast('Location captured', 'success'); }
    catch { toast('Could not get GPS. Allow location permission or tap on the map.', 'error'); }
    setGpsBusy(false);
  };
  const photo = e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 1.5e6) return toast('Photo must be under 1.5 MB', 'error');
    const r = new FileReader(); r.onload = () => setF(x => ({ ...x, image: r.result })); r.readAsDataURL(file);
  };
  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const body = { ...f }; if (!body.reporterEmail) delete body.reporterEmail; if (!body.image) delete body.image; if (body.lat == null) { delete body.lat; delete body.lng; }
      const r = await api('/incidents', { method: 'POST', body });
      const mine = JSON.parse(localStorage.getItem('rq_mine') || '[]'); localStorage.setItem('rq_mine', JSON.stringify([r.id, ...mine].slice(0, 10)));
      setDone(r.id);
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };

  if (done) return (
    <div className="mx-auto max-w-lg p-4"><div className="card mt-10 text-center">
      <div className="text-5xl">✅</div><h2 className="mt-2 text-xl font-bold">Report submitted</h2>
      <p className="mt-1 text-sm text-slate-400">Our control room will verify and dispatch a team. Save your tracking ID:</p>
      <div className="my-4 rounded-xl bg-slate-800 py-4 font-mono text-2xl font-bold tracking-wider">{done}</div>
      <button className="btn w-full" onClick={() => nav('/track/' + done)}>Track live status</button>
      <button className="btn-ghost btn mt-2 w-full" onClick={() => { setDone(null); setF(x => ({ ...x, description: '', image: '' })); }}>Report another</button>
    </div></div>);

  return (
    <div className="mx-auto max-w-lg p-4 pb-10">
      <div className="flex items-center justify-between py-2">
        <div className="text-2xl font-extrabold">🚨 Rapid<span className="text-red-400">ResQ</span></div>
        <Link to={user ? '/app' : '/login'} className="btn-ghost btn btn-sm"><LogIn size={16} />{user ? 'Open app' : 'Staff login'}</Link>
      </div>
      <p className="mb-3 text-sm text-slate-400">Report. Respond. Resolve — in real time. For life-threatening emergencies also call 112.</p>

      <form className="card" onSubmit={submit}>
        <h2 className="text-lg font-bold">Report an emergency</h2>
        <label className="lbl">What happened?</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(t => <button type="button" key={t} onClick={() => setF({ ...f, type: t })}
            className={`rounded-xl border px-2 py-3 text-center text-xs font-medium ${f.type === t ? 'border-red-400 bg-red-500/20' : 'border-white/10 bg-slate-800'}`}>
            <div className="text-xl">{TYPE_ICON[t]}</div>{t}</button>)}
        </div>
        <label className="lbl">Describe the situation</label>
        <textarea required rows={3} className="inp" value={f.description} onChange={set('description')} placeholder="e.g. Car hit a divider, two people injured and bleeding" />

        <label className="lbl">Location</label>
        <button type="button" className="btn-ghost btn mb-2 w-full" onClick={useGps} disabled={gpsBusy}><MapPin size={18} />{gpsBusy ? 'Getting location…' : 'Use my current location (GPS)'}</button>
        <MapPicker lat={f.lat} lng={f.lng} onPick={place} />
        <p className="mt-1 text-xs text-slate-500">Or tap the map to drop a pin.</p>
        <input required className="inp mt-2" placeholder="Address / landmark" value={f.address} onChange={set('address')} />

        <label className="lbl">Photo (optional)</label>
        <label className="btn-ghost btn w-full cursor-pointer"><Camera size={18} />{f.image ? 'Photo added ✓ (tap to change)' : 'Take / choose photo'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={photo} /></label>

        <label className="lbl">Your name</label><input required className="inp" value={f.reporterName} onChange={set('reporterName')} />
        <label className="lbl">Phone</label><input required type="tel" inputMode="tel" className="inp" value={f.reporterPhone} onChange={set('reporterPhone')} placeholder="98765 43210" />
        <label className="lbl">Email (for status updates)</label><input type="email" className="inp" value={f.reporterEmail} onChange={set('reporterEmail')} />
        <div className="mt-3"><ErrorBox message={err} /></div>
        <button className="btn mt-4 w-full py-3 text-lg" disabled={busy}>{busy ? 'Submitting…' : 'Send emergency report'}</button>
      </form>

      <div className="card mt-4">
        <h3 className="font-bold">Track an incident</h3>
        <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); trackId && nav('/track/' + trackId.trim().toUpperCase()); }}>
          <input className="inp" placeholder="RR-XXXXXXXX" value={trackId} onChange={e => setTrackId(e.target.value)} />
          <button className="btn"><Search size={18} /></button>
        </form>
        {JSON.parse(localStorage.getItem('rq_mine') || '[]').slice(0, 3).map(id => <Link key={id} to={'/track/' + id} className="mt-2 block text-sm text-blue-300">↳ {id}</Link>)}
      </div>
    </div>
  );
}
