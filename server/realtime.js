import { Server } from 'socket.io';
import { userFromToken } from './auth.js';
import { config } from './config.js';

let io;
export function initRealtime(httpServer) {
  io = new Server(httpServer, { cors: { origin: corsOrigin() } });
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      const u = await userFromToken(token);
      if (!u) return next(new Error('unauthorized'));
      socket.data.user = u;
    }
    next(); // tokenless sockets are citizens tracking an incident
  });
  io.on('connection', socket => {
    const u = socket.data.user;
    if (u) { socket.join('role:' + u.role); if (u.teamId) socket.join('team:' + u.teamId); }
    socket.on('track', id => {
      if (typeof id === 'string' && /^RR-[A-Z0-9]{8}$/.test(id.toUpperCase())) socket.join('track:' + id.toUpperCase());
    });
  });
  return io;
}
export const emit = (room, event, payload) => io?.to(room).emit(event, payload);

export function corsOrigin() {
  const fixed = ['https://localhost', 'capacitor://localhost', 'http://localhost', ...config.allowedOrigins];
  return (origin, cb) => {
    if (!origin || config.env !== 'production' || fixed.includes(origin)) return cb(null, true);
    cb(null, false);
  };
}
