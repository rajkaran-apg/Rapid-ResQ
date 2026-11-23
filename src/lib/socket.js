import { io } from 'socket.io-client';
import { useEffect } from 'react';
import { API } from './api.js';

let socket;
const listeners = new Set();
const EVENTS = ['incident:new', 'incident:update', 'incident:removed', 'team:update', 'notification', 'audit:new'];

export function connectSocket(token) {
  disconnectSocket();
  socket = io(API || undefined, { auth: { token } });
  EVENTS.forEach(ev => socket.on(ev, p => listeners.forEach(l => l(ev, p))));
}
export function disconnectSocket() { socket?.close(); socket = null; }

/** Public (citizen) tracking socket — no token, joins one incident room. */
export function trackIncident(id, onUpdate) {
  const s = io(API || undefined);
  s.on('connect', () => s.emit('track', id));
  s.on('track:update', onUpdate);
  return () => s.close();
}

/** Run handler for every realtime event while the component is mounted. */
export function useLive(handler, deps = []) {
  useEffect(() => { listeners.add(handler); return () => listeners.delete(handler); }, deps); // eslint-disable-line
}
