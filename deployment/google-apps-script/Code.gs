function doPost(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('RAPIDRESQ_MAIL_SECRET');
  if (!expected) return json_({ ok: false, error: 'Mail service is not configured.' });

  let payload;
  try { payload = JSON.parse(e?.postData?.contents || '{}'); }
  catch { return json_({ ok: false, error: 'Invalid request.' }); }

  if (payload.token !== expected) return json_({ ok: false, error: 'Unauthorized.' });
  if (typeof payload.to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.to)) {
    return json_({ ok: false, error: 'Invalid recipient.' });
  }

  try {
    GmailApp.sendEmail(String(payload.to), String(payload.subject || 'RapidResQ update').slice(0, 180), String(payload.text || '').slice(0, 12000), { name: 'RapidResQ' });
    return json_({ ok: true });
  } catch {
    return json_({ ok: false, error: 'Email provider could not send the message.' });
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}