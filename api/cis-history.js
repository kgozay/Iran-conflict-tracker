/**
 * JSE Conflict Watch — shared CIS history
 *
 * GET /api/cis-history?days=14         → stored readings, oldest first
 * GET /api/cis-history?record=1        → also take a reading now (at most one
 *                                        every 10 min across all visitors)
 * Vercel Cron calls this daily after the JSE close to guarantee one reading a day.
 *
 * The server scores its own live quotes; it never stores numbers sent by a browser.
 * Needs a Redis store (KV_REST_API_URL / KV_REST_API_TOKEN). Without one it answers
 * { configured: false } and the dashboard keeps using browser-only history.
 * Optional: ALERT_EMAIL (+ RESEND_API_KEY) emails when the CIS regime changes.
 */

const { storeConfigured, redis, pipeline } = require('./_lib/store.js');
const { fetchLiveSnapshot, toReading } = require('./_lib/market.js');
const { sendEmail } = require('./_lib/email.js');
const { isCronRequest } = require('./_lib/cron.js');

const LIST_KEY    = 'cis:readings';
const LOCK_KEY    = 'cis:record-lock';
const MAX_KEEP    = 6000;      // ≈ 6 weeks of continuous 10-minute readings
const MIN_GAP_SEC = 600;
const PER_DAY_CAP = 150;

function parseReadings(raw) {
  return (raw || []).map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
}

async function maybeNotifyRegimeChange(prev, reading) {
  const to = process.env.ALERT_EMAIL;
  if (!to || !process.env.RESEND_API_KEY || !prev || prev.regime === reading.regime) return false;
  const fmt = v => v == null ? 'n/a' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
  const text = [
    `The Conflict Impact Score moved from ${prev.regime} (${prev.total}) to ${reading.regime} (${reading.total}).`,
    '',
    `Brent ${fmt(reading.brent)} | USD/ZAR ${fmt(reading.usdZar)} | Gold ${fmt(reading.gold)} | US 10Y ${fmt(reading.us10y)}`,
    `Quote coverage: ${reading.coverage}%`,
    '',
    'The CIS is a heuristic monitoring indicator, not a forecast.',
  ].join('\n');
  await sendEmail({ to, subject: `CIS regime change: ${reading.regime} (${reading.total})`, text });
  return true;
}

async function record(source) {
  const got = await redis(['SET', LOCK_KEY, String(Date.now()), 'NX', 'EX', String(MIN_GAP_SEC)]);
  if (got !== 'OK') return { recorded: false, reason: 'A reading was taken in the last 10 minutes' };

  const snapshot = await fetchLiveSnapshot();
  const reading = toReading(snapshot, source);
  const [prevRaw] = await pipeline([
    ['LINDEX', LIST_KEY, '-1'],
    ['RPUSH', LIST_KEY, JSON.stringify(reading)],
    ['LTRIM', LIST_KEY, String(-MAX_KEEP), '-1'],
  ]);
  const prev = prevRaw ? parseReadings([prevRaw])[0] : null;

  let alerted = false;
  try { alerted = await maybeNotifyRegimeChange(prev, reading); }
  catch (e) { console.error('[cis-history] regime alert failed:', e.message); }

  return { recorded: true, reading, alerted };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET required' });

  if (!storeConfigured()) {
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(200).json({ configured: false, readings: [] });
  }

  const qs = req.query || {};
  const cron = isCronRequest(req);
  const wantsRecord = cron || qs.record === '1';
  const days = Math.min(400, Math.max(1, parseInt(qs.days, 10) || 14));

  try {
    let result = null;
    if (wantsRecord) {
      try { result = await record(cron ? 'cron' : 'visit'); }
      catch (e) {
        console.error('[cis-history] record failed:', e.message);
        result = { recorded: false, reason: e.message };
      }
    }

    const count = Math.min(MAX_KEEP, days * PER_DAY_CAP);
    const since = Date.now() - days * 86_400_000;
    const readings = parseReadings(await redis(['LRANGE', LIST_KEY, String(-count), '-1']))
      .filter(r => r.ts >= since);

    res.setHeader('Cache-Control', wantsRecord ? 'no-store' : 'public, max-age=60, s-maxage=60');
    return res.status(200).json({ configured: true, readings, record: result, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error('[cis-history] error:', e.message);
    return res.status(502).json({ configured: true, error: e.message, readings: [] });
  }
};
