import nodemailer from 'nodemailer';
import { config } from './config.js';

export const outbox = []; // used by automated tests only
let transport;

/** Sends a real email through SMTP. Returns true on success. */
export async function sendMail(to, subject, text) {
  if (config.env === 'test') { outbox.push({ to, subject, text }); return true; }
  if (!config.smtp.host) {
    console.log(`\n📧 [SMTP not configured — email NOT sent]\n   To: ${to}\n   Subject: ${subject}\n   ${text.replace(/\n/g, '\n   ')}\n`);
    return true; // dev convenience: visible in server console
  }
  try {
    const { host, port, user, pass, from } = config.smtp;
    transport ??= nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass } : undefined });
    await transport.sendMail({ from, to, subject, text });
    return true;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return false;
  }
}
export const fireMail = (to, subject, text) => { if (to) sendMail(to, subject, text).catch(() => {}); };
