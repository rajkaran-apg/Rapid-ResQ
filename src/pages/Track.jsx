import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { trackIncident } from '../lib/socket.js';
import { STATUS_LABEL } from '../lib/constants.js';
import { ErrorBox, SeverityBadge, Spinner, Timeline, toast } from '../components/ui.jsx';

const STEPS = ['REPORTED', 'VERIFIED', 'ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'RESOLVED'];
const rank = s => ({ REPORTED: 0, VERIFIED: 1, ASSIGNED: 2, ACCEPTED: 2, EN_ROUTE: 3, ON_SITE: 4, RESOLVED: 5 })[s] ?? 0;

export default function Track() {
  const { id } = useParams();
  const [inc, setInc] = useState(null), [err, setErr] = useState(''), [rating, setRating] = useState(0), [review, setReview] = useState('');
  const load = useCallback(() => api('/track/' + id).then(setInc).catch(e => setErr(e.message)), [id]);
  useEffect(() => { load(); return trackIncident(id.toUpperCase(), setInc); }, [id, load]);

  const sendReview = async () => {
    try { await api(`/track/${id}/review`, { method: 'POST', body: { rating, review } }); toast('Thank you for your feedback', 'success'); load(); }
    catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="mx-auto max-w-lg p-4">
      <Link to="/" className="text-sm text-slate-400">← Back</Link>
      <h1 className="mt-2 text-xl font-bold">Incident status</h1>
      {err && <div className="mt-3"><ErrorBox message={err} /></div>}
      {!inc && !err && <Spinner />}
      {inc && <>
        <div className="card mt-3">
          <div className="flex items-center justify-between"><span className="font-mono text-lg font-bold">{inc.id}</span><SeverityBadge s={inc.severity} /></div>
          <div className="mt-1 text-sm text-slate-300">{inc.type} · 📍 {inc.address}</div>
          <div className="mt-3 inline-block rounded-full bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-300">{STATUS_LABEL[inc.status]}{inc.teamName && inc.status !== 'RESOLVED' ? ` · ${inc.teamName}` : ''}</div>
          {inc.status !== 'REJECTED' && <div className="mt-4 flex">{STEPS.map((s, n) => (
            <div key={s} className="flex-1 text-center"><div className={`mx-auto h-3 w-3 rounded-full ${n <= rank(inc.status) ? 'bg-green-400' : 'bg-slate-700'}`} />
              <div className="mt-1 text-[10px] text-slate-400">{STATUS_LABEL[s]}</div></div>))}</div>}
          <p className="mt-3 text-xs text-green-400">● Live — this page updates automatically</p>
        </div>
        <div className="card mt-3"><h3 className="mb-3 font-bold">Timeline</h3><Timeline events={inc.events.map(e => ({ ...e, id: e.at + e.status }))} showNotes={false} /></div>
        {inc.status === 'RESOLVED' && !inc.rating && (
          <div className="card mt-3"><h3 className="font-bold">How was the response?</h3>
            <div className="my-2 flex gap-2 text-3xl">{[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setRating(n)} className={n <= rating ? 'text-yellow-400' : 'text-slate-600'}>★</button>)}</div>
            <textarea className="inp" rows={2} placeholder="Optional comment" value={review} onChange={e => setReview(e.target.value)} />
            <button className="btn mt-2 w-full" disabled={!rating} onClick={sendReview}>Submit review</button></div>)}
        {inc.rating && <div className="card mt-3 text-center text-sm text-slate-300">You rated this response {'★'.repeat(inc.rating)}</div>}
      </>}
    </div>
  );
}
