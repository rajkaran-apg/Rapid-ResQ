import http from 'node:http';
import { config } from './config.js';
import { initDb, q } from './db.js';
import { createApp } from './app.js';
import { initRealtime } from './realtime.js';
import { hashPassword } from './auth.js';
import { uid } from './http.js';

await initDb();

// First run: create the initial admin from ADMIN_EMAIL / ADMIN_PASSWORD
const [{ n }] = await q('select count(*) as n from users');
if (Number(n) === 0) {
  const a = config.bootstrapAdmin;
  if (a.email && a.password) {
    await q('insert into users(id,name,email,password_hash,role,email_verified) values($1,$2,$3,$4,$5,true)', [uid(), a.name, a.email, await hashPassword(a.password), 'ADMIN']);
    console.log(`✔ Initial admin created: ${a.email}`);
  } else console.warn('⚠ No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env and restart to create the first admin.');
}

const server = http.createServer(createApp());
initRealtime(server);
server.listen(config.port, () => console.log(`RapidResQ API + realtime listening on :${config.port} (${config.env})`));
