import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { corsOrigin } from './realtime.js';
import authRoutes from './routes/auth.js';
import incidentRoutes from './routes/incidents.js';
import opsRoutes from './routes/ops.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://nominatim.openstreetmap.org'], fontSrc: ["'self'", 'data:']
    } }
  }));
  app.use(cors({ origin: corsOrigin() }));
  app.use(express.json({ limit: '3mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'RapidResQ', env: config.env }));
  app.use('/api/auth', authRoutes);
  app.use('/api', incidentRoutes);
  app.use('/api', opsRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // Serve the built web app (single-service deployment)
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/socket.io') ? res.sendFile(path.join(dist, 'index.html')) : next()));
  }

  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Image too large (max ~1.5 MB)' });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message, ...err.extra });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  });
  return app;
}
