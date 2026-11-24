# Free demo deployment

RapidResQ is configured as one Render Web Service that serves the React app, API, and Socket.IO from one HTTPS URL. PostgreSQL must be hosted separately.

## Email for Render Free

Render Free blocks outbound SMTP ports, so use the included Google Apps Script HTTPS mail bridge.

1. Create a project at https://script.google.com/ and paste `deployment/google-apps-script/Code.gs` into `Code.gs`.
2. In **Project Settings → Script properties**, add `RAPIDRESQ_MAIL_SECRET` with a random secret of at least 32 characters.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as** to your account and **Who has access** to **Anyone**. Deploy and authorize Gmail access.
4. In Render, set `GOOGLE_SCRIPT_URL` to the deployed web app URL and `GOOGLE_SCRIPT_SECRET` to the same secret. Do not put the secret in source control or any `VITE_*` variable.

## Website

1. Push the project to its GitHub repository and create a Render Blueprint from `render.yaml`.
2. Supply a PostgreSQL `DATABASE_URL`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and the two Google Script values. Use private, unique credentials.
3. Render sets `CLIENT_URL` from the service's own `RENDER_EXTERNAL_URL`. The service builds with `npm install && npm run build`, starts with `npm start`, and checks `/api/health`.
4. Open the generated `https://…onrender.com` link and confirm `/api/health` returns `ok: true` before staff login.

## Android APK

Install Android Studio and its recommended Android SDK packages on the build computer. In PowerShell, set `$env:VITE_API_URL="https://YOUR-SERVICE.onrender.com"`, then run `npm run cap:sync` and `npm run cap:open`. In Android Studio, after Gradle sync, select **Build → Build APK(s)**. A Play Store release needs a signed release build and a developer account.

## Free-tier behavior

This is suitable for a demo, not real emergency coordination. The free web service can sleep after inactivity and take about a minute to wake; data storage and email quotas depend on the separate providers.