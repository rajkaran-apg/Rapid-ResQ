import nodemailer from 'nodemailer';
import { config } from './config.js';

export const outbox = []; // used by automated tests only

let smtpTransport;

function getSmtpTransport() {
  if (!smtpTransport) {
    const { host, port, user, pass } = config.smtp;
    smtpTransport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return smtpTransport;
}

/** Send through configured SMTP first, with Google Apps Script as a fallback. */
export async function sendMail(to, subject, text) {
  if (config.env === 'test') {
    outbox.push({ to, subject, text });
    return true;
  }

  const { host, user, pass, from } = config.smtp;
  if (host && user && pass) {
    try {
      const result = await getSmtpTransport().sendMail({ from, to, subject, text });
      if (result.accepted?.length && !result.rejected?.length) return true;
      console.error('Email send failed: SMTP did not accept the recipient.');
    } catch (err) {
      console.error('Email send failed via SMTP:', err.message);
    }
  }

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const scriptSecret = process.env.GOOGLE_SCRIPT_SECRET;
  if (scriptUrl && scriptSecret) {
    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: scriptSecret, to, subject, text }),
        signal: AbortSignal.timeout(20000)
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        console.error('Email send failed:', result.error || response.status);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Email send failed:', err.message);
      return false;
    }
  }

  console.error('Email unavailable: configure SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  return false;
}

export const fireMail = (to, subject, text) => {
  if (to) {
    sendMail(to, subject, text).catch(err => {
      console.error('Email send failed:', err.message);
    });
  }
};