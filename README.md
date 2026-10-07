# 🚨 RapidResQ — Report. Respond. Resolve — In Real Time.
College minor-project **prototype** (demo data only, no real emergency services).

## Run
```bash
npm install
cp .env.example .env     # optional, defaults work
npm run dev              # starts API+WebSocket (:4000) and Vite (:5173) together
```
Open http://localhost:5173. (Separately: `npm run server` and `npm run client`.)

## DEMO ACCOUNTS (password for all: `Demo@123`) — demo only
| Role | Email |
|---|---|
| ADMIN | admin@rapidresq.demo |
| DISPATCHER | dispatcher@rapidresq.demo |
| RESPONDER (Team Alpha) | responder@rapidresq.demo |
| VIEWER | viewer@rapidresq.demo |
Extra: admin2, dispatcher2, bravo (Team Bravo responder), charlie, viewer2 — all `@rapidresq.demo`.
Login shows a **DEMO OTP** on screen (also in the Email Simulator).

## 3–5 minute demo flow
Open 3 windows: (A) Admin, (B) Responder in a private window, (C) citizen Track page.
1. Login as Admin (show OTP step) → Command Center, click KPI cards / filters.
2. Click **⚡ Simulate Emergency** (toast + bell + chart update) — or report one from the landing page.
3. Open it → **Verify** (or on Dispatch Board). Drag the card onto **Team Alpha**.
4. Window B: login as responder → Accept → En Route → On Site → Responding → Resolve. Watch A and C update live.
5. Show Analytics (live graph), Audit Log (filter "denied"), Email Simulator.
6. RBAC: login as Viewer or Dispatcher, open an incident and press **Verify** → `403 — Access Denied` (enforced by the API, logged in audit).
7. Or just click **🎬 DEMO MODE** (Admin): a scripted incident runs the whole lifecycle automatically in ~3 min; paste its ID into Track.

## Architecture
- **Frontend**: React + Vite (`src/App.jsx`), Recharts, Lucide, custom CSS (glass/gradient theme).
- **Backend**: Express REST API + Socket.IO (`server/index.js`). Every change emits a `sync` event to logged-in staff; citizens get per-incident `incident` events.
- **Auth**: bcrypt-hashed passwords → step 1 password, step 2 6-digit OTP (simulated email) → JWT (8h).
- **RBAC**: `auth(...roles)` middleware on each route; failures return 403 and are written to the audit log. Client also guards pages.
- **Notifications / Email**: in-memory services (`notify`, `sendEmail`) — replace `sendEmail` with Nodemailer/SendGrid/Resend.
- **Database**: in-memory arrays seeded with 12 incidents, 5 teams, 9 users (resets on restart) — swap for MongoDB Atlas / Supabase.
- **Deploy**: Vercel (frontend, add API proxy/URL), Render/Railway (backend; set `JWT_SECRET`, `CLIENT_URL`), MongoDB Atlas/Supabase (DB).

## Future scope
Real emergency-service/government API integration, GPS tracking + live ambulance routes, SMS (Twilio), real email, push notifications, AI incident prioritisation, CCTV feeds, IoT sensors (smoke, crash, flood).
