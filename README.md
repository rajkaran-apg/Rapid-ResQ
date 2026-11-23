# RapidResQ — Real Emergency Response Platform (Web + Android app)

Report → Verify → Assign → Respond → Notify → Resolve. Ye prototype nahi hai: real database, real email OTP,
backend-enforced roles, audit trail, live WebSocket updates, GPS + map, aur Android APK.

## Slides ke hisaab se kya-kya real hai

| Slide requirement | Implementation |
|---|---|
| Citizen report + tracking | Public form (GPS / map pin / photo), unguessable ID `RR-XXXXXXXX`, live tracking page, review after resolve |
| Verify → Assign → Respond → Resolve | Server-side state machine; invalid jumps rejected; team double-booking impossible (atomic claim) |
| Real-time updates | Socket.IO with JWT auth; rooms per role/team/incident; dashboards, dispatch, tracking update without refresh |
| MFA + email | Password → 6-digit email OTP (HMAC-hashed, 10 min, 5 tries); email verification; password reset; incident emails to citizen + responders (SMTP) |
| RBAC | Admin / Dispatcher / Responder / Viewer checked in backend on every route; viewers never get reporter contact; responders only see their team's incidents |
| Drill-down filters | Date, location, type, severity, status, team, text search; KPI cards click-through |
| Audit trail | Actor, action, time, incident, IP, outcome; denied permissions + failed logins also logged |
| Drag-and-drop dispatch | HTML5 drag-drop (desktop) + tap-to-assign (phone) |
| Dashboards / graphs | Live KPIs, response & resolution time, resolution rate, ratings, Recharts graphs, team performance |
| AI triage | Naive-Bayes NLP model (type + priority + confidence); admin reviews; suggestion and final decision logged |
| Cloud deployment | Postgres (Neon/Supabase), Render single service (API + WebSocket + web), env-based secrets, HTTPS |
| Mobile app | Capacitor Android app from the same code |

Security: bcrypt passwords, JWT (8h), account lock after 5 failed logins, rate limiting, Zod validation, Helmet headers, CORS allow-list.

## 1. Local run (2 minutes)
    npm install
    cp .env.example .env      # fill ADMIN_EMAIL / ADMIN_PASSWORD
    npm run dev               # web: http://localhost:5173  api: :4000
Bina DATABASE_URL ke temporary in-memory DB chalta hai (restart pe data jata hai). Bina SMTP ke OTP/email server console me print hote hain.
Pehla admin automatically ban jata hai (.env ke ADMIN_EMAIL/PASSWORD se), login pe OTP milega.

## 2. Real services (free)
1. **Database** — neon.tech → new project → copy connection string → `DATABASE_URL`. Tables auto-create hote hain.
2. **Email** — Gmail: 2-Step Verification ON → Google Account → App passwords → 16-char password.
   `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app password>`, `SMTP_FROM=RapidResQ <you@gmail.com>`

## 3. Deploy (Render)
1. Code GitHub pe push karo (`.env` commit mat karo).
2. Render → New → Blueprint (render.yaml) ya Web Service: build `npm install && npm run build`, start `npm start`.
3. Env vars: `DATABASE_URL`, `ADMIN_*`, `SMTP_*`, `CLIENT_URL=https://<your-app>.onrender.com`. (`JWT_SECRET` auto-generate.)
4. Open `https://<your-app>.onrender.com` — web app live. Free plan idle pe sleep hota hai: demo se 1 min pehle URL khol lo.

## 4. Android app (APK)
Prerequisite: Android Studio + Node 18+.
    echo "VITE_API_URL=https://<your-app>.onrender.com" > .env.production
    npm run cap:add        # pehli baar
    npm run cap:sync
    npm run cap:open       # Android Studio
`android/app/src/main/AndroidManifest.xml` me add karo (<manifest> ke andar):

    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.CAMERA"/>
Build → Build APK(s) → phone me install. (Bina Android Studio ke: Chrome me app URL kholo → "Add to Home screen".)

## 5. Teacher demo flow
1. Admin login (OTP email aayega) → Users & teams: 2 teams banao, ek Dispatcher aur ek Responder invite karo (email me code → "Forgot password" se password set).
2. Phone 1 (citizen): Report → GPS + photo → tracking ID.
3. Admin: incident kholo → AI suggestion dikhao → priority set karke Verify.
4. Dispatcher: Dispatch board → drag/tap se team assign (responder ko email + live alert).
5. Responder phone: Accept → En route → On site → Resolve. Citizen ka Track page live badalta hai.
6. Admin: Audit trail (AI decision + sab actions), Analytics, Map, filters.
7. Viewer account se RBAC dikhao: contact hidden, admin pages blocked. (API se bhi 403 aata hai.)

## Tests / AI evaluation
    npm test            # 9 automated API tests (auth, MFA, RBAC, lifecycle, audit, lockout)
    npm run eval:ai     # cross-validation accuracy of triage model

## Honest limitations (viva me bata sakte ho)
- AI model chhote hand-written dataset (70 samples) pe train hai: 5-fold CV me type ≈ 76%, priority ≈ 44%. Isliye sirf *suggestion* hai, final decision human ka. Real labelled reports add karke `npm run eval:ai` dobara chalao.
- Photos DB me stored hain (max ~1.5 MB) — production me S3/Cloudinary better.
- Push notifications aur live GPS team tracking slide ke "Future Enhancements" me hain; abhi in-app live alerts + email hain.
- Render free plan sleep karta hai; Gmail SMTP daily limit hai.
