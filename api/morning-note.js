/**
 * JSE Conflict Watch — AI Morning Note Generator
 * Vercel Serverless Function — CommonJS
 *
 * Uses Google Gemini Flash (FREE tier — no billing required).
 * Get a free key at: https://aistudio.google.com/app/apikey
 * Add GEMINI_API_KEY to Vercel → Project Settings → Environment Variables
 *
 * POST /api/morning-note
 */

const https = require('https');
const zlib  = require('zlib');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
};

const setCors = function(res) {
  for (const [key, value] of Object.entries(CORS)) {
    res.setHeader(key, value);
  }
};

const ok  = function(res, body)   { setCors(res); return res.status(200).json(body); };
const err = function(res, msg, c) { setCors(res); return res.status(c || 500).json({ error: msg }); };

/* ── HTTPS POST with gzip decompression ─────────────────────────── */
function post(hostname, path, headers, body) {
  return new Promise(function(resolve, reject) {
    const payload = JSON.stringify(body);
    const options = {
      hostname: hostname,
      path:     path,
      method:   'POST',
      headers:  Object.assign({
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }, headers),
    };

    const req = https.request(options, function(res) {
      const enc = (res.headers['content-encoding'] || '').toLowerCase();
      let stream = res;
      if (enc === 'gzip')         stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br')      stream = res.pipe(zlib.createBrotliDecompress());

      const chunks = [];
      stream.on('data', function(c) { chunks.push(c); });
      stream.on('end', function() {
        const text = Buffer.concat(chunks).toString('utf8');
        try   { resolve({ status: res.statusCode, json: JSON.parse(text) }); }
        catch { resolve({ status: res.statusCode, json: null, raw: text.slice(0, 500) }); }
      });
      stream.on('error', reject);
    });

    req.setTimeout(30000, function() { req.destroy(new Error('Gemini API timed out after 30s')); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/* ── Format helpers ──────────────────────────────────────────────── */
function pct(val) {
  if (val == null) return 'unavailable';
  return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
}
function fmt(val, decimals, prefix, suffix) {
  if (val == null) return 'unavailable';
  return (prefix || '') + val.toFixed(decimals) + (suffix || '');
}

/* ── Build structured prompt ─────────────────────────────────────── */
function buildPrompt(assets, sectors, cis, stocks) {
  const now  = new Date();
  const date = now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = now.toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' });

  const b  = assets.brent     || {};
  const g  = assets.gold      || {};
  const u  = assets.usdZar    || {};
  const r  = assets.r2035     || {};
  const pt = assets.platinum  || {};
  const c  = assets.coal      || {};

  const top40  = sectors.top40          || {};
  const miners = sectors['Gold Miners'] || {};
  const pgms   = sectors.PGMs          || {};
  const energy = sectors.Energy        || {};
  const banks  = sectors.Banks         || {};
  const retail = sectors.Retailers     || {};
  const ind    = sectors.Industrials   || {};

  const liveStocks = (stocks || []).filter(function(s) { return s.isLive && s.changePct != null; });
  const topGainers = liveStocks.slice().sort(function(a, b) { return b.changePct - a.changePct; }).slice(0, 3);
  const topLosers  = liveStocks.slice().sort(function(a, b) { return a.changePct - b.changePct; }).slice(0, 3);
  const moversText = liveStocks.length > 0
    ? 'Top gainers: ' + topGainers.map(function(s) { return s.display + ' (' + pct(s.changePct) + ')'; }).join(', ') + '\n' +
      'Top losers:  ' + topLosers.map(function(s)  { return s.display + ' (' + pct(s.changePct) + ')'; }).join(', ')
    : 'Individual stock data unavailable';

  return `You are a senior South African equity strategist writing the morning market note for JSE Conflict Watch — a dashboard tracking Iran-Middle East geopolitical risk transmission into South African markets.

Write a concise, intelligent morning note of 5–7 short paragraphs. Your audience is institutional investors and sophisticated retail traders on the JSE. Tone: analytical, direct, slightly Bloomberg-terminal style. No bullet points. No fluff. Real insights only.

CURRENT DATE/TIME: ${date} · ${time} SAST
CONFLICT IMPACT SCORE (CIS): ${cis.total ?? '—'} — ${cis.regime ?? 'NO DATA'} (scale: -100 bear to +100 bull)

━━ MACRO DATA ━━
Brent Crude:      ${fmt(b.price, 2, '$', '/bbl')}  ${pct(b.changePct)}
Gold:             ${fmt(g.price, 0, '$', '/oz')}    ${pct(g.changePct)}
Platinum:         ${fmt(pt.price, 0, '$', '/oz')}   ${pct(pt.changePct)}
USD/ZAR:          R${fmt(u.price, 3)}               ${pct(u.changePct)}
R2035 Bond Yield: ${fmt(r.price, 3, '', '%')}        ${pct(r.changePct)} [${r.source || 'SARB'}]${r.isStale ? ' — STATIC ESTIMATE' : ''}
Coal Futures:     ${fmt(c.price, 2, '$', '/t')}     ${pct(c.changePct)}

━━ JSE SECTOR PERFORMANCE ━━
Market Average:  ${pct(top40.chg)}
Gold Miners:     ${pct(miners.chg)}  (rel to mkt: ${miners.rel != null ? pct(miners.rel) : '—'})
PGMs:            ${pct(pgms.chg)}    (rel to mkt: ${pgms.rel != null ? pct(pgms.rel) : '—'})
Energy:          ${pct(energy.chg)}  (rel to mkt: ${energy.rel != null ? pct(energy.rel) : '—'})
Banks:           ${pct(banks.chg)}   (rel to mkt: ${banks.rel != null ? pct(banks.rel) : '—'})
Retailers:       ${pct(retail.chg)}  (rel to mkt: ${retail.rel != null ? pct(retail.rel) : '—'})
Industrials:     ${pct(ind.chg)}     (rel to mkt: ${ind.rel != null ? pct(ind.rel) : '—'})

━━ INDIVIDUAL MOVERS ━━
${moversText}

━━ CIS COMPONENTS ━━
Macro Shock Score (40%):     ${cis.components?.macro?.score?.toFixed(1) ?? '—'}
JSE Reaction Score (35%):    ${cis.components?.jse?.score?.toFixed(1) ?? '—'}
Confirmation Score (25%):    ${cis.components?.conf?.score?.toFixed(1) ?? '—'}

Address these themes:
1. Oil price transmission into JSE via Sasol, energy sector, and ZAR weakness
2. ZAR move vs gold hedge — are miners offsetting EM risk-off pressure?
3. Bond yield direction and implications for bank sector valuations
4. Which sector is best positioned as a hedge or most exposed today?
5. One specific risk or trading setup to watch into the close

End with: "— JSE Conflict Watch · ${date}"`;
}

/* ── Handler ──────────────────────────────────────────────────────── */
module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    return res.status(204).end();
  }
  if (req.method !== 'POST') return err(res, 'POST required', 405);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return err(res,
      'GEMINI_API_KEY environment variable not set. ' +
      'Get a free key at https://aistudio.google.com/app/apikey then add it in ' +
      'Vercel → Project Settings → Environment Variables → GEMINI_API_KEY.',
      503
    );
  }

  let payload = req.body || {};
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); }
    catch (e) { return err(res, 'Invalid JSON body', 400); }
  }

  const { assets, sectors, cis, stocks } = payload;
  if (!assets || !sectors || !cis) return err(res, 'Missing assets, sectors, or cis in request body', 400);

  const prompt = buildPrompt(assets, sectors, cis, stocks || []);
  const model  = 'gemini-2.5-flash';

  console.log('[morning-note] Calling Gemini API (' + model + ')…');

  try {
    const resHttp = await post(
      'generativelanguage.googleapis.com',
      '/v1beta/models/' + model + ':generateContent?key=' + apiKey,
      {},
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 800,
          temperature:     0.7,
        },
      }
    );

    if (resHttp.status !== 200) {
      const detail = (resHttp.json && resHttp.json.error && resHttp.json.error.message) || resHttp.raw || 'Unknown Gemini error';
      console.error('[morning-note] Gemini error', resHttp.status, detail);

      /* Friendly message for common errors */
      if (resHttp.status === 400 && detail.includes('API_KEY')) {
        return err(res, 'Invalid Gemini API key. Check the key at aistudio.google.com.', 401);
      }
      if (resHttp.status === 429) {
        return err(res, 'Gemini rate limit hit. Wait a moment and try again.', 429);
      }
      return err(res, 'Gemini API error (' + resHttp.status + '): ' + detail, 502);
    }

    const text = resHttp.json &&
      resHttp.json.candidates &&
      resHttp.json.candidates[0] &&
      resHttp.json.candidates[0].content &&
      resHttp.json.candidates[0].content.parts &&
      resHttp.json.candidates[0].content.parts[0] &&
      resHttp.json.candidates[0].content.parts[0].text;

    if (!text) {
      const reason = resHttp.json && resHttp.json.candidates && resHttp.json.candidates[0] && resHttp.json.candidates[0].finishReason;
      console.error('[morning-note] Empty Gemini response. finishReason:', reason);
      return err(res, 'Gemini returned an empty response (finishReason: ' + (reason || 'unknown') + '). Try again.', 502);
    }

    const usage = resHttp.json.usageMetadata || {};
    console.log('[morning-note] ✓ Generated', text.length, 'chars — tokens in:', usage.promptTokenCount, 'out:', usage.candidatesTokenCount);

    return ok(res, {
      note:       text,
      model:      model,
      tokens_in:  usage.promptTokenCount  || null,
      tokens_out: usage.candidatesTokenCount || null,
      timestamp:  new Date().toISOString(),
    });

  } catch (e) {
    console.error('[morning-note] Unhandled error:', e.message);
    return err(res, 'Server error: ' + e.message);
  }
};
