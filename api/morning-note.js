/**
 * JSE Conflict Watch — AI Morning Note Generator (v3 prompt, 2026-05)
 *
 * Uses Google Gemini 2.5 Pro for high-quality sell-side brief formatting.
 * Get a key at: https://aistudio.google.com/app/apikey
 * Add GEMINI_API_KEY to Vercel → Project Settings → Environment Variables
 *
 * POST /api/morning-note
 *
 * Generates a structured markdown brief: market dashboard table,
 * per-stock flash notes with ratings, portfolio positioning, and a
 * Macro Note for the Open. Free-tier limit: 25 requests/day for Pro.
 */

const https = require('https');
const zlib  = require('zlib');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const setCors = function(res) {
  for (const [key, value] of Object.entries(CORS)) res.setHeader(key, value);
};
const ok  = function(res, body)   { setCors(res); return res.status(200).json(body); };
const err = function(res, msg, c) { setCors(res); return res.status(c || 500).json({ error: msg }); };

/* ── HTTPS POST with gzip decompression ─────────────────────────── */
function post(hostname, path, headers, body) {
  return new Promise(function(resolve, reject) {
    const payload = JSON.stringify(body);
    const options = {
      hostname, path, method: 'POST',
      headers: Object.assign({
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
  if (val == null || Number.isNaN(val)) return 'n/a';
  return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
}
function fmt(val, decimals, prefix, suffix) {
  if (val == null || Number.isNaN(val)) return 'n/a';
  return (prefix || '') + val.toFixed(decimals) + (suffix || '');
}

/* ── Extract signal patterns that matter for insight generation ──── */
function extractPatterns({ assets, sectors, stocks }) {
  const patterns = [];

  const brent  = assets.brent?.changePct   ?? null;
  const gold   = assets.gold?.changePct    ?? null;
  const zar    = assets.usdZar?.changePct  ?? null;
  const r2035  = assets.r2035?.changePct   ?? null;
  const miners = sectors['Gold Miners']?.chg ?? null;
  const energy = sectors.Energy?.chg        ?? null;
  const banks  = sectors.Banks?.chg         ?? null;
  const retail = sectors.Retailers?.chg     ?? null;
  const top40  = sectors.top40?.chg         ?? null;

  // Divergence: oil up but ZAR strong (usually they move together in risk-off)
  if (brent != null && zar != null && brent > 1 && zar < -0.3) {
    patterns.push('Brent + ZAR DIVERGENCE: oil rising but ZAR strengthening — suggests SA-specific bid (carry flows / EM catch-up) overriding classic oil-shock channel.');
  }
  // Confirmation: gold + miners + weak ZAR = textbook safe-haven transmission
  if (gold != null && miners != null && zar != null && gold > 1 && miners > 1.5 && zar > 0.3) {
    patterns.push('CLASSIC HAVEN TRADE: gold bid + ZAR weak + miners outperforming — all three conflict-transmission channels firing in the same direction.');
  }
  // Anti-pattern: banks outperforming despite rising yields
  if (banks != null && r2035 != null && banks > 0.5 && r2035 > 0.15) {
    patterns.push('BANKS VS BONDS DIVERGENCE: SA 10Y yield rising BUT banks up — market pricing spread widening as a positive (NIM > volume concern).');
  }
  // Energy outperforming without oil move
  if (energy != null && brent != null && energy > 2 && brent < 1) {
    patterns.push('ENERGY RALLY WITHOUT OIL: JSE energy basket up meaningfully while Brent quiet — likely Sasol-specific catalyst or coal-tracking move.');
  }
  // Retailers holding up despite ZAR weakness
  if (retail != null && zar != null && retail > 0 && zar > 0.5) {
    patterns.push('RETAIL RESILIENCE: ZAR weaker but retailers flat/up — either pass-through fading or offshore-revenue names (TFG, Mr Price) leading the cohort.');
  }
  // JSE up in a clear risk-off macro
  if (top40 != null && brent != null && zar != null && top40 > 0.5 && brent > 2 && zar > 0.5) {
    patterns.push('RISK-OFF RALLY PARADOX: conflict-shock macro (oil up, ZAR weak) BUT JSE Top 40 higher — composition matters, commodity heavyweights masking domestic weakness.');
  }

  // Specific stock dispersion within a sector
  const live = (stocks || []).filter(s => s.isLive && s.changePct != null);
  const sectorsOfInterest = ['Gold Miners','PGMs','Energy','Banks','Retailers'];
  for (const sec of sectorsOfInterest) {
    const ss = live.filter(s => s.sector === sec);
    if (ss.length < 2) continue;
    const sorted = ss.slice().sort((a,b) => b.changePct - a.changePct);
    const spread = sorted[0].changePct - sorted[sorted.length - 1].changePct;
    if (spread > 3) {
      patterns.push(`${sec.toUpperCase()} DISPERSION (${spread.toFixed(1)}pt): ${sorted[0].display} ${pct(sorted[0].changePct)} vs ${sorted[sorted.length-1].display} ${pct(sorted[sorted.length-1].changePct)} — single-name rather than sector-wide theme.`);
    }
  }

  return patterns;
}

/* ── Build the prompt ───────────────────────────────────────────── */
function buildPrompt(assets, sectors, cis, stocks, alerts, dataHealth) {
  const now  = new Date();
  const date = now.toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = now.toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' });

  const b  = assets.brent     || {};
  const g  = assets.gold      || {};
  const u  = assets.usdZar    || {};
  const r  = assets.r2035     || {};
  const pt = assets.platinum  || {};
  const c  = assets.coal      || {};

  const top40  = sectors.top40          || {};
  const miners = sectors['Gold Miners'] || {};
  const pgms   = sectors.PGMs           || {};
  const energy = sectors.Energy         || {};
  const banks  = sectors.Banks          || {};
  const retail = sectors.Retailers      || {};
  const ind    = sectors.Industrials    || {};

  const liveStocks = (stocks || []).filter(s => s.isLive && s.changePct != null);
  const topGainers = liveStocks.slice().sort((a, b) => b.changePct - a.changePct).slice(0, 5);
  const topLosers  = liveStocks.slice().sort((a, b) => a.changePct - b.changePct).slice(0, 5);
  const moversText = liveStocks.length > 0
    ? `Top gainers: ${topGainers.map(s => `${s.display} (${s.ticker}) ${pct(s.changePct)}`).join(', ')}
Top losers:  ${topLosers.map(s  => `${s.display} (${s.ticker}) ${pct(s.changePct)}`).join(', ')}`
    : 'Individual stock data unavailable';

  const SECTOR_ORDER = ['Gold Miners','PGMs','Energy','Banks','Retailers','Industrials','Mining','Telecoms'];
  const sectorMovers = SECTOR_ORDER.map(sec => {
    const ss = liveStocks.filter(s => s.sector === sec);
    if (!ss.length) return null;
    ss.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    const leader = ss[0];
    return `${sec}: ${leader.display} (${leader.ticker}) ${pct(leader.changePct)} leads`;
  }).filter(Boolean).join('\n');

  const activeAlerts = alerts || [];
  const alertsText = activeAlerts.length > 0
    ? activeAlerts.map(a => `[${(a.lvl || '').toUpperCase()}] ${a.label}: ${a.text}`).join('\n')
    : 'No threshold alerts triggered';

  const patterns = extractPatterns({ assets, sectors, stocks });
  const patternsText = patterns.length > 0
    ? patterns.map((p, i) => `${i+1}. ${p}`).join('\n')
    : 'No obvious cross-asset divergences — market is quiet or noise-dominated.';

  const health = dataHealth || {};
  const healthText = `Quote coverage: ${health.quoteCoverage ?? 'n/a'}%  |  Live stocks: ${health.liveStocks ?? 'n/a'}/${health.totalStocks ?? 'n/a'}  |  SA 10Y source: ${health.bondSource || r.source || 'unknown'}${health.bondIsStatic ? ' (STATIC)' : ''}${health.bondIsProxy ? ' (PROXY)' : ''}  |  Warnings: ${(health.warnings || []).join('; ') || 'None'}`;

  return `You are a senior South African equity strategist writing the JSE Morning Intelligence note for JSE Conflict Watch — a dashboard tracking macro and geopolitical risk transmission into South African markets.

Your reader is an institutional PM or sophisticated JSE trader. They have seen the raw numbers. Your job is to tell them WHAT IS INTERESTING, WHAT IT MEANS, and WHAT TO DO ABOUT IT. Be specific. Reference named stocks, exact price levels, and real percentage moves from the data below.

OUTPUT FORMAT: Use the exact markdown structure shown in the template below. Use ## for main headers, ### for sub-headers, **bold** for key names/numbers, markdown tables for the dashboard, and bullet points (- ) for lists. DO NOT use any other formatting.

═══════════════════════════════════════════
INPUT DATA
═══════════════════════════════════════════

DATE: ${date} · ${time} SAST
CIS SCORE: ${cis.total ?? '—'} (${cis.regime ?? 'NO DATA'}) | range: -100 = max bearish → +100 = max bullish
CIS COMPONENTS → Macro shock 40%: ${cis.components?.macro?.score?.toFixed(1) ?? '—'} | JSE reaction 35%: ${cis.components?.jse?.score?.toFixed(1) ?? '—'} | Confirmation 25%: ${cis.components?.conf?.score?.toFixed(1) ?? '—'}

MACRO
Brent Crude: ${fmt(b.price, 2, '$', '/bbl')} (${pct(b.changePct)})
Gold:        ${fmt(g.price, 0, '$', '/oz')} (${pct(g.changePct)})
Platinum:    ${fmt(pt.price, 0, '$', '/oz')} (${pct(pt.changePct)})
USD/ZAR:     R${fmt(u.price, 3)} (${pct(u.changePct)})
SA 10Y Bond: ${fmt(r.price, 3, '', '%')} (${pct(r.changePct)}) [source: ${r.source || 'unknown'}${r.isStale ? ' STATIC' : ''}]
Coal:        ${fmt(c.price, 2, '$', '/t')} (${pct(c.changePct)})

JSE SECTORS (1D · vs market avg)
Market avg:  ${pct(top40.chg)}
Gold Miners: ${pct(miners.chg)} rel ${miners.rel != null ? pct(miners.rel) : 'n/a'}
PGMs:        ${pct(pgms.chg)}   rel ${pgms.rel != null ? pct(pgms.rel) : 'n/a'}
Energy:      ${pct(energy.chg)} rel ${energy.rel != null ? pct(energy.rel) : 'n/a'}
Banks:       ${pct(banks.chg)}  rel ${banks.rel != null ? pct(banks.rel) : 'n/a'}
Retailers:   ${pct(retail.chg)} rel ${retail.rel != null ? pct(retail.rel) : 'n/a'}
Industrials: ${pct(ind.chg)}    rel ${ind.rel != null ? pct(ind.rel) : 'n/a'}

STOCK MOVERS
${moversText}

SECTOR LEADERS
${sectorMovers || 'Unavailable'}

CROSS-ASSET PATTERNS
${patternsText}

ALERTS
${alertsText}

DATA QUALITY
${healthText}

═══════════════════════════════════════════
WRITE THE NOTE USING THIS EXACT TEMPLATE:
═══════════════════════════════════════════

## JSE Morning Intelligence: Geopolitical & Macro Risk Radar
**Date:** ${date}
**Analyst:** Global Macro & Equity Strategy
**CIS Regime:** [insert regime label and score]

---

### Market Dashboard

| Indicator | Spot | Daily Change | Conflict Risk Premium |
| :--- | :--- | :--- | :--- |
| **Brent Crude** | [price] | [change] | [High/Moderate/Low — one-line rationale] |
| **Gold** | [price] | [change] | [High/Moderate/Low — one-line rationale] |
| **USD/ZAR** | [price] | [change] | [High/Moderate/Low — one-line rationale] |
| **SA 10Y Bond** | [yield] | [change] | [High/Moderate/Low — one-line rationale] |
| **JSE Top 40** | [level] | [change] | [Mixed/Positive/Negative — one-line rationale] |

---

### The Lead: [Concise macro thesis headline — e.g. "Supply Shock vs. Rand Carry: A Bifurcating JSE"]

[2–3 paragraphs. State the dominant macro theme driving today's session. Connect geopolitical conflict drivers (Hormuz, Red Sea, oil supply, risk-off flows) to specific JSE transmission channels. Name the sectors and stocks at the epicentre. This section must include at least two specific percentage moves and one named stock.]

---

### Flash Notes: Stock-Specific Impact

#### 1. [Ticker] [Company Name] | Rating: [BUY / HOLD / SELL / UNDERWEIGHT / OVERWEIGHT]
- **Conflict Vector:** [Specific geopolitical linkage — e.g. Brent crude, shipping disruption, safe-haven flow]
- **The Thesis:** [2–3 sentences. Include a specific price level, % move, or earnings impact estimate. Reference the conflict transmission mechanism precisely.]
- **Key Risk / Opportunity:** [One sentence on the pivotal data point or price trigger to watch.]

#### 2. [Ticker] [Company Name] | Rating: [RATING]
- **Conflict Vector:** [linkage]
- **The Thesis:** [2–3 sentences with a number]
- **Key Risk / Opportunity:** [one sentence trigger]

#### 3. [Ticker] [Company Name] | Rating: [RATING]
- **Conflict Vector:** [linkage]
- **The Thesis:** [2–3 sentences with a number]
- **Key Risk / Opportunity:** [one sentence trigger]

---

### Conflict Heatmap & Portfolio Positioning

- **Overweight / Long:** [2–3 specific names or sectors with a one-line rationale each]
- **Underweight / Short:** [2–3 specific names or sectors with a one-line rationale each]
- **Monitor:** [1–2 names or indicators that are approaching inflection, with the specific trigger level]

> **Macro Note for the Open:** [Specific catalyst or data release to watch today. Include a precise price level or threshold — e.g. "A Brent break above $93 would force tactical rotation into JSE resource counters." One sentence, sharp.]

---

### Data Caveat
[One sentence: state whether note is based on live data, partial coverage, cached/stale data, or static bond proxy. Reference the coverage stats from the data above.]

---

*— JSE Conflict Watch · ${date}*

═══════════════════════════════════════════
RULES:
- Use only data provided. Do not invent news, analyst reports, or external facts not in the prompt.
- Every claim must be tied to a number, a named stock/sector, or a data-quality caveat.
- Stocks in the Flash Notes must come from the STOCK MOVERS or SECTOR LEADERS data above — do not invent tickers.
- If a data point is unavailable (n/a), skip it or note it briefly — do not fabricate a value.
- No filler phrases ("markets were mixed", "amid uncertainty", "it remains to be seen").
- No repetition of the raw data table. Synthesise and interpret.
═══════════════════════════════════════════`;
}

/* ── Handler ──────────────────────────────────────────────────────── */
module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') { setCors(res); return res.status(204).end(); }
  if (req.method !== 'POST')    return err(res, 'POST required', 405);

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
    if (payload.length > 150000) return err(res, 'Payload too large', 413);
    try { payload = JSON.parse(payload); }
    catch (e) { return err(res, 'Invalid JSON body', 400); }
  } else {
    const approxSize = Buffer.byteLength(JSON.stringify(payload || {}), 'utf8');
    if (approxSize > 150000) return err(res, 'Payload too large', 413);
  }

  const { assets, sectors, cis, stocks, alerts, dataHealth } = payload;
  if (!assets || !sectors || !cis) return err(res, 'Missing assets, sectors, or cis in request body', 400);

  const prompt = buildPrompt(assets, sectors, cis, stocks || [], alerts || [], dataHealth || null);
  const model  = 'gemini-2.5-pro';

  console.log('[morning-note] Calling Gemini API (' + model + ')…');

  try {
    const resHttp = await post(
      'generativelanguage.googleapis.com',
      '/v1beta/models/' + model + ':generateContent?key=' + apiKey,
      {},
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 3200,
          temperature: 0.65,
          topP: 0.90,
        },
      }
    );

    if (resHttp.status !== 200) {
      const detail = (resHttp.json && resHttp.json.error && resHttp.json.error.message) || resHttp.raw || 'Unknown Gemini error';
      console.error('[morning-note] Gemini error', resHttp.status, detail);

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
      model,
      tokens_in:  usage.promptTokenCount      || null,
      tokens_out: usage.candidatesTokenCount  || null,
      timestamp:  new Date().toISOString(),
    });

  } catch (e) {
    console.error('[morning-note] Unhandled error:', e.message);
    return err(res, 'Server error: ' + e.message);
  }
};
