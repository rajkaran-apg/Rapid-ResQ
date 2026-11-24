import pg from 'pg';
import { config } from './config.js';

let pool;
const camel = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v]));

/** Run a query; rows come back with camelCase keys. */
export const q = async (text, params = []) => (await pool.query(text, params)).rows.map(camel);

const SCHEMA = [
  `create table if not exists users (
    id text primary key, name text not null, email text not null unique, phone text,
    password_hash text not null, role text not null, team_id text,
    email_verified boolean not null default false, active boolean not null default true,
    failed_attempts integer not null default 0, locked_until timestamptz,
    created_at timestamptz not null default now())`,
  `create table if not exists teams (
    id text primary key, name text not null unique, base text, status text not null default 'AVAILABLE',
    created_at timestamptz not null default now())`,
  `create table if not exists incidents (
    id text primary key, type text not null, severity text, status text not null default 'REPORTED',
    title text not null, description text not null default '', address text not null,
    lat double precision, lng double precision,
    reporter_name text not null, reporter_phone text not null, reporter_email text,
    team_id text, ai_type text, ai_severity text, ai_confidence double precision, ai_decision text,
    created_at timestamptz not null default now(),
    verified_at timestamptz, assigned_at timestamptz, accepted_at timestamptz,
    en_route_at timestamptz, on_site_at timestamptz, resolved_at timestamptz,
    rating integer, review text)`,
  `create table if not exists incident_images (incident_id text primary key, data text not null)`,
  `create table if not exists incident_events (
    id text primary key, incident_id text not null, at timestamptz not null default now(),
    status text, label text not null, actor_name text, actor_role text, note text)`,
  `create table if not exists audit_logs (
    id text primary key, at timestamptz not null default now(), actor_id text, actor_name text, actor_role text,
    action text not null, incident_id text, detail text, outcome text not null default 'SUCCESS', ip text)`,
  `create table if not exists notifications (
    id text primary key, at timestamptz not null default now(), audience text not null,
    title text not null, body text not null, level text not null default 'info', incident_id text)`,
  `create table if not exists otps (
    id text primary key, user_id text not null, purpose text not null, code_hash text not null,
    expires_at timestamptz not null, attempts integer not null default 0)`,
  `create index if not exists idx_incidents_status on incidents (status)`,
  `create index if not exists idx_events_incident on incident_events (incident_id)`
];

export async function initDb() {
  if (config.databaseUrl) {
    const local = /localhost|127\.0\.0\.1/.test(config.databaseUrl);
    pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: local ? false : { rejectUnauthorized: true },
  max: 10
});
  } else if (config.env !== 'production') {
    const { newDb } = await import('pg-mem');
    const { Pool } = newDb().adapters.createPg();
    pool = new Pool();
    if (config.env !== 'test') console.warn('\n⚠  DATABASE_URL not set → using a TEMPORARY in-memory database. Data is lost on restart.\n   Set DATABASE_URL (free Neon/Supabase Postgres) for real persistence.\n');
  } else {
    throw new Error('DATABASE_URL is required in production');
  }
  for (const sql of SCHEMA) await pool.query(sql);
}
export const closeDb = () => pool?.end();
