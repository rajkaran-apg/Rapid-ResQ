import 'dotenv/config';
import crypto from 'node:crypto';

const e = process.env;
const env = e.NODE_ENV || 'development';

if (env === 'production' && (!e.JWT_SECRET || e.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set (min 32 chars) in production');
}

export const config = {
  env,
  port: Number(e.PORT) || 4000,
  jwtSecret: e.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  databaseUrl: e.DATABASE_URL || '',
  clientUrl: e.CLIENT_URL || '',            // public URL of the app (used in email links + CORS)
  allowedOrigins: (e.ALLOWED_ORIGINS || e.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean),
  smtp: { host: e.SMTP_HOST || '', port: Number(e.SMTP_PORT) || 587, user: e.SMTP_USER || '', pass: e.SMTP_PASS || '', from: e.SMTP_FROM || e.SMTP_USER || 'RapidResQ <no-reply@rapidresq.app>' },
  bootstrapAdmin: { name: e.ADMIN_NAME || 'System Admin', email: (e.ADMIN_EMAIL || '').toLowerCase(), password: e.ADMIN_PASSWORD || '' }
};
