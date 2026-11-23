
import { config } from './config.js';

export const outbox = []; // used by automated tests only

/**
 * Sends email through Google Apps Script.
 * Returns true on success, false on failure.
 */
export async function sendMail(to, subject, text) {
  if (config.env === 'test') {
    outbox.push({ to, subject, text });
    return true;
  }

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const scriptSecret = process.env.GOOGLE_SCRIPT_SECRET;

  if (!scriptUrl || !scriptSecret) {
    if (config.env !== 'production') {
      console.log('Email NOT sent: Google Apps Script is not configured.');
      return true;
    }

    console.error('Email failed: Google Apps Script configuration missing.');
    return false;
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: scriptSecret,
        to,
        subject,
        text
      }),
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

export const fireMail = (to, subject, text) => {
  if (to) {
    sendMail(to, subject, text).catch(err => {
      console.error('Email send failed:', err.message);
    });
  }
};
