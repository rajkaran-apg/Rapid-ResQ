import { useCallback, useEffect, useRef, useState } from 'react';
import { useLive } from './socket.js';

/** Fetch on mount / dep change; `live` events (names) trigger a debounced refetch. */
export function useFetch(fn, deps = [], live = ['incident:new', 'incident:update', 'incident:removed', 'team:update']) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const timer = useRef();
  const run = useCallback(async () => {
    try { setState(s => ({ ...s, data: s.data, error: '' })); const data = await fn(); setState({ data, loading: false, error: '' }); }
    catch (e) { setState(s => ({ ...s, loading: false, error: e.message })); }
  }, deps); // eslint-disable-line
  useEffect(() => { setState(s => ({ ...s, loading: true })); run(); }, [run]);
  useLive(ev => { if (live.includes(ev)) { clearTimeout(timer.current); timer.current = setTimeout(run, 400); } }, [run]);
  return { ...state, reload: run };
}

export const timeAgo = t => {
  if (!t) return '—';
  const s = Math.max(0, (Date.now() - new Date(t)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
export const fmtTime = t => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
