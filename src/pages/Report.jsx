
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Camera, Search, LogIn, Sun, Moon,
  ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2,
  AlertTriangle, ClipboardList, Activity, Zap, ChevronRight
} from 'lucide-react';

import { api } from '../lib/api.js';
import { TYPES, TYPE_ICON } from '../lib/constants.js';
import { getPosition, reverseGeocode } from '../lib/geo.js';
import { MapPicker } from '../components/MapView.jsx';
import { ErrorBox, toast } from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useTheme } from '../lib/theme.jsx';

export default function Report() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    type: 'Accident',
    description: '',
    address: '',
    lat: null,
    lng: null,
    reporterName: '',
    reporterPhone: '',
    reporterEmail: '',
    image: ''
  });

  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const [trackId, setTrackId] = useState('');

  const scrollToTracking = () => document.getElementById('track-report')?.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start'
  });

  const set = k => e => {
    setF(x => ({ ...x, [k]: e.target.value }));
  };

  const place = async (lat, lng) => {
    setF(x => ({ ...x, lat, lng }));

    try {
      const address = await reverseGeocode(lat, lng);
      if (address) {
        setF(x => ({ ...x, address }));
      }
    } catch {
      toast('Could not find address. Enter it manually.', 'error');
    }
  };

  const useGps = async () => {
    setGpsBusy(true);

    try {
      const p = await getPosition();
      await place(p.lat, p.lng);
      toast('Location captured successfully', 'success');
    } catch {
      toast(
        'Could not get GPS. Allow location permission or tap on the map.',
        'error'
      );
    } finally {
      setGpsBusy(false);
    }
  };

  const photo = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5e6) {
      toast('Photo must be under 1.5 MB', 'error');
      e.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast('Please select an image file', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setF(x => ({ ...x, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const nextStep = () => {
    setErr('');

    if (!f.description.trim()) {
      setErr('Please describe what happened.');
      return;
    }

    if (!f.address.trim()) {
      setErr('Please enter the incident address or landmark.');
      return;
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const previousStep = () => {
    setErr('');
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async e => {
    e.preventDefault();
    setErr('');
    setBusy(true);

    try {
      const body = { ...f };

      if (!body.reporterEmail) delete body.reporterEmail;
      if (!body.image) delete body.image;

      if (body.lat == null) {
        delete body.lat;
        delete body.lng;
      }

      const r = await api('/incidents', {
        method: 'POST',
        body
      });

      const mine = JSON.parse(
        localStorage.getItem('rq_mine') || '[]'
      );

      localStorage.setItem(
        'rq_mine',
        JSON.stringify([r.id, ...mine].slice(0, 10))
      );

      setDone(r.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const recentReports = JSON.parse(
    localStorage.getItem('rq_mine') || '[]'
  ).slice(0, 3);

  const surfaceStyle = {
    background: 'var(--surface)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)'
  };

  const secondaryStyle = {
    color: 'var(--text-secondary)'
  };

  if (done) {
    return (
      <div className="min-h-screen px-4 py-10" style={{ background: 'var(--app-bg)' }}>
        <div className="card mx-auto mt-8 max-w-md p-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10">
            <CheckCircle2 size={46} className="text-emerald-500" />
          </div>

          <h2 className="mt-5 text-2xl font-extrabold">
            Report submitted!
          </h2>

          <p className="mt-2 text-sm" style={secondaryStyle}>
            Your emergency report has been received. Our control room will
            verify the details and coordinate a response.
          </p>

          <div className="my-5 rounded-2xl p-4" style={{ background: 'var(--surface-soft)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={secondaryStyle}>
              Your tracking ID
            </p>
            <div className="mt-2 break-all font-mono text-2xl font-bold tracking-wider">
              {done}
            </div>
          </div>

          <button
            className="btn w-full"
            onClick={() => nav('/track/' + done)}
          >
            Track live status <ArrowRight size={18} />
          </button>

          <button
            className="btn-ghost btn mt-3 w-full"
            onClick={() => {
              setDone(null);
              setStep(1);
              setF({
                type: 'Accident',
                description: '',
                address: '',
                lat: null,
                lng: null,
                reporterName: '',
                reporterPhone: '',
                reporterEmail: '',
                image: ''
              });
            }}
          >
            Report another incident
          </button>

          <Link to="/" className="mt-5 inline-block text-sm" style={{ color: 'var(--accent)' }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rr-report-page min-h-screen px-4 pb-12"
      style={{ background: 'var(--app-bg)', color: 'var(--text-primary)' }}
    >
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <header className="flex items-center justify-between py-5">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/rapidresq-logo.png"
              alt="RapidResQ"
              className="h-11 w-11 object-contain"
            />
            <div>
              <div className="text-xl font-extrabold tracking-tight">
                Rapid<span style={{ color: 'var(--accent)' }}>ResQ</span>
              </div>
              <div className="text-[10px] font-semibold tracking-widest" style={secondaryStyle}>
                EVERY SECOND MATTERS
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-10 w-10 place-items-center rounded-xl border"
              style={surfaceStyle}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <Link
              to={user ? '/app' : '/login'}
              className="btn btn-sm"
            >
              <LogIn size={16} />
              {user ? 'Open app' : 'Staff login'}
            </Link>
          </div>
        </header>

        {/* Emergency banner */}
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <div className="rounded-xl bg-red-500/15 p-2 text-red-500">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="font-bold text-red-500">
              Emergency assistance
            </div>
            <p className="mt-1 text-sm" style={secondaryStyle}>
              Report an incident to our response team. For immediate
              life-threatening emergencies, call 112.
            </p>
          </div>
        </div>

        {/* Intro */}
        <section className="rr-report-hero mb-6">
          <div className="rr-report-hero-copy">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: 'var(--surface-soft)', color: 'var(--accent)' }}>
              <ShieldCheck size={15} />
              RapidResQ Emergency Network
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Report an <span style={{ color: 'var(--accent)' }}>emergency.</span>
            </h1>

            <p className="mt-2 text-sm" style={secondaryStyle}>
              Share the details. Help us get the right response to the right place.
            </p>

            <button type="button" onClick={scrollToTracking} className="rr-track-shortcut">
              Already reported? Track your update <ChevronRight size={16} />
            </button>
          </div>

          <div className="rr-response-visual" aria-hidden="true">
            <div className="rr-response-radar"><span /><span /><span /><i><Activity size={27} /></i></div>
            <div className="rr-response-orbit rr-orbit-a" />
            <div className="rr-response-orbit rr-orbit-b" />
            <div className="rr-response-point rr-point-a" />
            <div className="rr-response-point rr-point-b" />
            <div className="rr-response-status"><span className="rr-status-pulse" /><span><b>Response network</b><small>Ready to coordinate</small></span><Zap size={16} /></div>
          </div>
        </section>

        {/* Progress */}
        <div className="card rr-progress-card mb-5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">
                Step {step} of 2
              </div>
              <div className="mt-1 text-xs" style={secondaryStyle}>
                {step === 1 ? 'Incident information' : 'Your contact information'}
              </div>
            </div>

            <div className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
              {step === 1 ? '50%' : '100%'}
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-soft)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: step === 1 ? '50%' : '100%',
                background: 'var(--accent)'
              }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold"
              style={{ color: step === 1 ? 'var(--accent)' : 'var(--text-muted)' }}>
              <span className="grid h-7 w-7 place-items-center rounded-full"
                style={{ background: step === 1 ? 'var(--accent)' : 'var(--surface-soft)', color: step === 1 ? '#fff' : 'var(--text-secondary)' }}>
                {step > 1 ? <CheckCircle2 size={16} /> : '1'}
              </span>
              Incident details
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold"
              style={{ color: step === 2 ? 'var(--accent)' : 'var(--text-muted)' }}>
              <span className="grid h-7 w-7 place-items-center rounded-full"
                style={{ background: step === 2 ? 'var(--accent)' : 'var(--surface-soft)', color: step === 2 ? '#fff' : 'var(--text-secondary)' }}>
                2
              </span>
              Your details
            </div>
          </div>
        </div>

        <form className="card rr-report-form p-5 sm:p-6" onSubmit={submit}>

          {step === 1 && (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-extrabold">
                  What happened?
                </h2>
                <p className="mt-1 text-sm" style={secondaryStyle}>
                  Tell us about the emergency.
                </p>
              </div>

              <label className="lbl">Select incident type</label>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TYPES.map(t => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setF(x => ({ ...x, type: t }))}
                    aria-pressed={f.type === t}
                    className={`rr-incident-choice rounded-2xl border p-4 text-left transition active:scale-95 ${f.type === t ? 'is-selected' : ''}`}
                    style={{
                      background: f.type === t ? 'var(--accent)' : 'var(--surface-soft)',
                      borderColor: f.type === t ? 'var(--accent)' : 'var(--border-color)',
                      color: f.type === t ? '#fff' : 'var(--text-primary)'
                    }}
                  >
                    <div className="mb-2 text-2xl">{TYPE_ICON[t]}</div>
                    <div className="text-sm font-bold">{t}</div>
                    {f.type === t && (
                      <div className="mt-1 text-xs text-white/80">
                        Selected ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <label className="lbl">Describe the situation</label>
              <textarea
                required
                rows={4}
                className="inp"
                value={f.description}
                onChange={set('description')}
                placeholder="Describe what happened, how many people are affected, and any immediate danger..."
              />

              <label className="lbl">Incident location</label>

              <button
                type="button"
                className="btn w-full"
                onClick={useGps}
                disabled={gpsBusy}
              >
                <MapPin size={18} />
                {gpsBusy ? 'Getting your location...' : 'Use my current location'}
              </button>

              <div className="mt-3 overflow-hidden rounded-2xl border"
                style={{ borderColor: 'var(--border-color)' }}>
                <MapPicker lat={f.lat} lng={f.lng} onPick={place} />
              </div>

              <p className="mt-2 text-xs" style={secondaryStyle}>
                Or tap the map to drop a location pin.
              </p>

              <input
                required
                className="inp mt-3"
                placeholder="Address / street / nearby landmark"
                value={f.address}
                onChange={set('address')}
              />

              <label className="lbl">Incident photo (optional)</label>

              <label
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm font-semibold transition hover:opacity-80"
                style={{
                  background: 'var(--surface-soft)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                <Camera size={20} />
                {f.image ? 'Photo added — choose another' : 'Take or upload a photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={photo}
                />
              </label>

              {f.image && (
                <div className="mt-3">
                  <img
                    src={f.image}
                    alt="Incident preview"
                    className="max-h-48 rounded-xl object-cover"
                  />
                </div>
              )}

              <div className="mt-5">
                <ErrorBox message={err} />
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="btn mt-4 w-full py-3 text-base"
              >
                Continue to your details <ArrowRight size={18} />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-extrabold">
                  Who is reporting?
                </h2>
                <p className="mt-1 text-sm" style={secondaryStyle}>
                  We need your contact details for coordination and updates.
                </p>
              </div>

              <div className="mb-5 rounded-2xl p-4" style={{ background: 'var(--surface-soft)' }}>
                <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <ClipboardList size={18} style={{ color: 'var(--accent)' }} />
                  Incident summary
                </div>

                <div className="flex justify-between gap-3 text-sm">
                  <span style={secondaryStyle}>Incident type</span>
                  <strong>{TYPE_ICON[f.type]} {f.type}</strong>
                </div>

                <div className="mt-2 text-sm">
                  <span style={secondaryStyle}>Description</span>
                  <p className="mt-1">{f.description}</p>
                </div>

                <div className="mt-3 text-sm">
                  <span style={secondaryStyle}>Location</span>
                  <p className="mt-1">{f.address}</p>
                </div>

                <button
                  type="button"
                  onClick={previousStep}
                  className="mt-3 text-sm font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  Edit incident details
                </button>
              </div>

              <label className="lbl">Your full name</label>
              <input
                required
                className="inp"
                value={f.reporterName}
                onChange={set('reporterName')}
                placeholder="Enter your name"
              />

              <label className="lbl">Mobile number</label>
              <input
                required
                type="tel"
                inputMode="tel"
                className="inp"
                value={f.reporterPhone}
                onChange={set('reporterPhone')}
                placeholder="98765 43210"
              />

              <label className="lbl">Email address (optional)</label>
              <input
                type="email"
                className="inp"
                value={f.reporterEmail}
                onChange={set('reporterEmail')}
                placeholder="you@example.com"
              />

              <div className="mt-5">
                <ErrorBox message={err} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="btn-ghost btn"
                  onClick={previousStep}
                  disabled={busy}
                >
                  <ArrowLeft size={17} /> Back
                </button>

                <button
                  type="submit"
                  className="btn"
                  disabled={busy}
                >
                  {busy ? 'Submitting...' : 'Submit report'}
                  {!busy && <ArrowRight size={17} />}
                </button>
              </div>

              <p className="mt-4 text-center text-xs" style={secondaryStyle}>
                Your information will be shared with the response team for this incident.
              </p>
            </>
          )}
        </form>

        {/* Tracking */}
        <div id="track-report" className="card rr-track-card mt-5 p-5">
          <div className="flex items-center gap-2">
            <Search size={20} style={{ color: 'var(--accent)' }} />
            <h3 className="font-bold">Track an incident</h3>
          </div>

          <p className="mt-1 text-sm" style={secondaryStyle}>
            Already have a tracking ID? Enter it below.
          </p>

          <form
            className="mt-3 flex gap-2"
            onSubmit={e => {
              e.preventDefault();
              if (trackId.trim()) {
                nav('/track/' + trackId.trim().toUpperCase());
              }
            }}
          >
            <input
              className="inp min-w-0"
              placeholder="RR-XXXXXXXX"
              value={trackId}
              onChange={e => setTrackId(e.target.value)}
            />

            <button className="btn" type="submit">
              <Search size={18} />
            </button>
          </form>

          {recentReports.length > 0 && (
            <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={secondaryStyle}>
                Recent reports
              </p>

              {recentReports.map(id => (
                <Link
                  key={id}
                  to={'/track/' + id}
                  className="mb-2 block rounded-lg p-2 text-sm font-semibold"
                  style={{ background: 'var(--surface-soft)', color: 'var(--accent)' }}
                >
                  ↗ {id}
                </Link>
              ))}
            </div>
          )}
        </div>

        <footer className="py-7 text-center text-xs" style={secondaryStyle}>
          <ShieldCheck size={17} className="mx-auto mb-2" />
          RapidResQ · Report. Respond. Resolve.
        </footer>
      </div>
    </div>
  );
}
