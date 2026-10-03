/**
 * JSE Conflict Watch — daily email digest (Vercel Cron, 06:00 UTC Mon–Fri)
 *
 * Takes a live market snapshot, asks Gemini for a short brief grounded ONLY in
 * those numbers, and emails it with the raw figures attached. If Gemini fails
 * the email still goes out with the figures alone.
 *
 * Env: CRON_SECRET (required — Vercel sends it as a Bearer token), RESEND_API_KEY,
 *      DIGEST_EMAIL (comma-separated recipients), GEMINI_API_KEY, optional DIGEST_FROM.
 * Manual test: curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/daily-digest
 */

const { fetchLiveSnapshot } = require('./_lib/market.js');
const { sendEmail } = require('./_lib/email.js');

const MODEL = 'gemini-2.5-flash-lite';

const pct = v => (v == null || !Number.isFinite(v)) ? 'n/a' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const num = (v, d, pre = '', suf = '') => (v == null || !Number.isFinite(v)) ? 'n/a' : `${pre}${v.toFixed(d)}${suf}`;

/* The figures block — both the model's only source and the email's appendix. */
function buildFigures({ assets, sectors, cis, alerts, coverage }) {
  const a = assets, s = sectors;
  return [
    `CIS: ${cis.total} (${cis.regime}) | macro ${cis.components.macro.score}, JSE ${cis.components.jse.score}, confirmation ${cis.components.conf.score}`,
    `Brent ${num(a.brent.price, 2, '$')} (${pct(a.brent.changePct)}) | Gold ${num(a.gold.price, 0, '$')} (${pct(a.gold.changePct)}) | USD/ZAR ${num(a.usdZar.price, 3, 'R')} (${pct(a.usdZar.changePct)}) | US 10Y ${num(a.us10y.price, 3, '', '%')} (${pct(a.us10y.changePct)})`,
    `JSE Top 40 (STX40) ${pct(a.jseTop40.changePct)} | Gold miners ${pct(s['Gold Miners']?.chg)} | PGMs ${pct(s.PGMs?.chg)} | Energy ${pct(s.Energy?.chg)} | Banks ${pct(s.Banks?.chg)} | Retailers ${pct(s.Retailers?.chg)} | Industrials ${pct(s.Industrials?.chg)}`,
    `Top drivers: ${(cis.drivers || []).slice(0, 4).map(d => `${d.label} ${d.weightedImpact > 0 ? '+' : ''}${d.weightedImpact}`).join(', ') || 'none'}`,
    `Alerts: ${(alerts || []).map(x => `${x.label}`).join('; ') || 'none'}`,
    `Quote coverage: ${coverage}%. Moves are the latest session vs the previous close.`,
  ].join('\n');
}

function buildPrompt(figures, date) {
  return `You are an analyst writing a concise daily brief (180–250 words) for a portfolio manager on how Iran/Middle East conflict risk is transmitting into South African markets on ${date}.

DATA (use only these numbers; do not invent prices, news or events):
${figures}

Cover, in plain text with short paragraphs and no markdown: the CIS regime and what is driving it, the Brent and USD/ZAR channel, which JSE sectors are absorbing or benefiting from it, and one or two specific levels or signals to watch. If a figure is n/a, leave it out.`;
}

async function generateBrief(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.5 },
    }),
    signal: AbortSignal.timeout(30000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${json?.error?.message || 'unknown'}`);
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned an empty brief');
  return text.trim();
}

async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ ok: false, error: 'CRON_SECRET not set — required so only Vercel Cron can send the digest.' });
  if ((req.headers?.authorization || '') !== `Bearer ${secret}`) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  if (!process.env.DIGEST_EMAIL) return res.status(503).json({ ok: false, error: 'DIGEST_EMAIL not set' });

  try {
    const snapshot = await fetchLiveSnapshot();
    const date = new Date().toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const figures = buildFigures(snapshot);

    let brief = null, briefError = null;
    try { brief = await generateBrief(buildPrompt(figures, date)); }
    catch (e) { briefError = e.message; console.error('[daily-digest] brief failed:', e.message); }

    const text = [
      brief || 'The AI brief could not be generated today; the market figures are below.',
      '',
      '— Figures (Yahoo Finance via JSE Conflict Watch) —',
      figures,
      '',
      'The CIS is a heuristic monitoring indicator, not investment advice.',
    ].join('\n');

    await sendEmail({
      to: process.env.DIGEST_EMAIL,
      subject: `JSE Conflict Watch — ${snapshot.cis.regime} (${snapshot.cis.total}) · ${date}`,
      text,
    });
    return res.status(200).json({ ok: true, cis: snapshot.cis.total, regime: snapshot.cis.regime, aiBrief: !!brief, briefError });
  } catch (e) {
    console.error('[daily-digest] error:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = handler;
module.exports.buildFigures = buildFigures;
module.exports.buildPrompt = buildPrompt;
