/**
 * Send an email through Resend's REST API (no SDK needed).
 * Env: RESEND_API_KEY; sender DIGEST_FROM (defaults to Resend's shared test sender,
 * which can only deliver to the address that owns the Resend account).
 */
async function sendEmail({ to, subject, text, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  if (!to) throw new Error('No recipient address');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.DIGEST_FROM || 'JSE Conflict Watch <onboarding@resend.dev>',
      to: to.split(',').map(s => s.trim()).filter(Boolean),
      subject, text, html,
    }),
    signal: AbortSignal.timeout(10000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${json?.message || 'unknown'}`);
  return json;
}

module.exports = { sendEmail };
