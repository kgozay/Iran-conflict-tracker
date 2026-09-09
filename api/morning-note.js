/**
 * JSE Conflict Watch — AI Morning Note Generator (v4, 2026-05)
 *
 * Model: gemini-1.5-flash — 15 RPM / 1,500 RPD free tier.
 * (gemini-2.0-flash was cut to 250 RPD in Dec 2025; 1.5-flash was NOT cut.)
 *
 * POST /api/morning-note
 */

const https = require('https');
const zlib  = require('zlib');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const setCors = r => { for (const [k,v] of Object.entries(CORS)) r.setHeader(k,v); };
const ok  = (res, b)    => { setCors(res); return res.status(200).json(b); };
const err = (res, m, c) => { setCors(res); return res.status(c||500).json({ error: m }); };

/* ── HTTPS POST ──────────────────────────────────────────────────── */
function post(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      { hostname, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers } },
      res => {
        const enc = (res.headers['content-encoding'] || '').toLowerCase();
        let stream = res;
        if (enc === 'gzip')    stream = res.pipe(zlib.createGunzip());
        if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
        if (enc === 'br')      stream = res.pipe(zlib.createBrotliDecompress());
        const chunks = [];
        stream.on('data', c => chunks.push(c));
        stream.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try   { resolve({ status: res.statusCode, json: JSON.parse(text) }); }
          catch { resolve({ status: res.statusCode, json: null, raw: text.slice(0, 500) }); }
        });
        stream.on('error', reject);
      }
    );
    req.setTimeout(30000, () => req.destroy(new Error('Gemini timed out after 30s')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── Format helpers ──────────────────────────────────────────────── */
const pct = v => (v == null || isNaN(v)) ? 'n/a' : (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
const fmt = (v, d, pre, suf) => (v == null || isNaN(v)) ? 'n/a' : (pre||'') + v.toFixed(d) + (suf||'');

/* ── Cross-asset pattern detection ──────────────────────────────── */
function detectPatterns({ assets, sectors, stocks }) {
  const p = [];
  const brent = assets.brent?.changePct ?? null;
  const gold  = assets.gold?.changePct  ?? null;
  const zar   = assets.usdZar?.changePct ?? null;
  const r2035 = assets.r2035?.changePct  ?? null;
  const miners = sectors['Gold Miners']?.chg ?? null;
  const energy = sectors.Energy?.chg ?? null;
  const banks  = sectors.Banks?.chg  ?? null;
  const retail = sectors.Retailers?.chg ?? null;
  const top40  = sectors.top40?.chg  ?? null;

  if (brent > 1 && zar < -0.3)                          p.push('Brent/ZAR DIVERGENCE: oil rising but ZAR strengthening — SA-specific bid overriding classic oil-shock channel.');
  if (gold > 1 && miners > 1.5 && zar > 0.3)            p.push('CLASSIC HAVEN TRADE: gold + weak ZAR + miners all firing — textbook conflict transmission.');
  if (banks > 0.5 && r2035 > 0.15)                      p.push('BANKS vs BONDS DIVERGENCE: yields up but banks outperforming — market pricing NIM expansion > volume concern.');
  if (energy > 2 && brent < 1)                           p.push('ENERGY WITHOUT OIL: JSE energy basket up while Brent quiet — likely Sasol-specific or coal-tracking move.');
  if (retail > 0 && zar > 0.5)                           p.push('RETAIL RESILIENCE: ZAR weak but retailers flat/up — offshore-revenue names (TFG, Mr Price) leading cohort.');
  if (top40 > 0.5 && brent > 2 && zar > 0.5)            p.push('RISK-OFF RALLY PARADOX: conflict macro (oil up, ZAR weak) but the equal-weight watchlist average is higher, with commodity shares masking domestic weakness.');

  const live = (stocks || []).filter(s => s.isLive && s.changePct != null);
  for (const sec of ['Gold Miners','PGMs','Energy','Banks','Retailers']) {
    const ss = live.filter(s => s.sector === sec).sort((a,b) => b.changePct - a.changePct);
    if (ss.length >= 2 && (ss[0].changePct - ss[ss.length-1].changePct) > 3) {
      p.push(`${sec.toUpperCase()} DISPERSION: ${ss[0].display} ${pct(ss[0].changePct)} vs ${ss[ss.length-1].display} ${pct(ss[ss.length-1].changePct)} — single-name theme, not sector-wide.`);
    }
  }
  return p;
}

/* ── Build prompt (lean version — ~40% fewer tokens) ────────────── */
function buildPrompt(assets, sectors, cis, stocks, alerts, dataHealth) {
  const now  = new Date();
  const date = now.toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg', weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const time = now.toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour:'2-digit', minute:'2-digit' });

  const b  = assets.brent    || {};
  const g  = assets.gold     || {};
  const u  = assets.usdZar   || {};
  const r  = assets.r2035    || {};
  const pt = assets.platinum || {};
  const c  = assets.coal     || {};

  const m    = sectors['Gold Miners'] || {};
  const pgm  = sectors.PGMs           || {};
  const en   = sectors.Energy         || {};
  const bk   = sectors.Banks          || {};
  const re   = sectors.Retailers      || {};
  const ind  = sectors.Industrials    || {};
  const top  = sectors.top40          || {};

  const live = (stocks || []).filter(s => s.isLive && s.changePct != null);
  const gainers = live.slice().sort((a,b)=>b.changePct-a.changePct).slice(0,5).map(s=>`${s.display}(${s.ticker}) ${pct(s.changePct)}`).join(', ');
  const losers  = live.slice().sort((a,b)=>a.changePct-b.changePct).slice(0,5).map(s=>`${s.display}(${s.ticker}) ${pct(s.changePct)}`).join(', ');

  const patterns = detectPatterns({ assets, sectors, stocks });
  const health   = dataHealth || {};

  return `You are a senior JSE equity strategist. Write the daily JSE Conflict Watch morning note — a concise sell-side style brief for an institutional PM tracking Iran/Middle East risk transmission into South African markets.

DATA (${date} · ${time} SAST)
CIS: ${cis.total ?? '—'} / ${cis.regime ?? 'N/A'} | Macro 40%: ${cis.components?.macro?.score?.toFixed(1)??'—'} | JSE 35%: ${cis.components?.jse?.score?.toFixed(1)??'—'} | Conf 25%: ${cis.components?.conf?.score?.toFixed(1)??'—'}
Brent: ${fmt(b.price,2,'$','/bbl')} (${pct(b.changePct)}) | Gold: ${fmt(g.price,0,'$','/oz')} (${pct(g.changePct)}) | Platinum: ${fmt(pt.price,0,'$','/oz')} (${pct(pt.changePct)})
USD/ZAR: R${fmt(u.price,3)} (${pct(u.changePct)}) | SA 10Y: ${fmt(r.price,3,'','%')} (${pct(r.changePct)}) [${r.source||'unknown'}${r.isStale?' STATIC':''}] | Coal: ${fmt(c.price,2,'$','/t')} (${pct(c.changePct)})
Sectors: Top40 ${pct(top.chg)} | Miners ${pct(m.chg)} | PGMs ${pct(pgm.chg)} | Energy ${pct(en.chg)} | Banks ${pct(bk.chg)} | Retail ${pct(re.chg)} | Industrials ${pct(ind.chg)}
Top gainers: ${gainers || 'n/a'}
Top losers: ${losers || 'n/a'}
Patterns: ${patterns.length ? patterns.join(' / ') : 'No notable divergences.'}
Alerts: ${(alerts||[]).map(a=>`[${(a.lvl||'').toUpperCase()}] ${a.label}: ${a.text}`).join(' | ') || 'None'}
Data: ${health.quoteCoverage??'n/a'}% coverage, ${health.liveStocks??'n/a'}/${health.totalStocks??'n/a'} live stocks, bond source: ${health.bondSource||r.source||'unknown'}${health.bondIsStatic?' (STATIC)':''}

OUTPUT — write in this exact markdown structure:
## JSE Morning Intelligence: Geopolitical & Macro Risk Radar
**Date:** ${date} | **CIS Regime:** [label + score]

### Market Dashboard
[Markdown table: Indicator | Spot | Change | Conflict Risk Premium (High/Moderate/Low + one-line rationale). Rows: Brent, Gold, USD/ZAR, SA 10Y proxy, equal-weight watchlist average.]

### The Lead: [sharp one-line thesis headline]
[2–3 paragraphs. Name the dominant conflict transmission channel. Reference specific % moves and at least two named stocks. No filler phrases.]

### Flash Notes
[For the 3 most relevant stocks from the movers data above:]
#### [Ticker] [Name] | [BUY/HOLD/SELL/OW/UW]
- **Vector:** [conflict linkage]
- **Thesis:** [2–3 sentences, include a specific number]
- **Watch:** [one price level or catalyst trigger]

### Portfolio Positioning
- **Overweight:** [2–3 names/sectors + one-line rationale each]
- **Underweight:** [2–3 names/sectors + one-line rationale each]
- **Monitor:** [1–2 approaching inflection points with specific trigger levels]

> **Open Call:** [One sharp sentence with a precise price threshold or catalyst to watch today.]

### Data Caveat
[One sentence on coverage quality.]
*— JSE Conflict Watch · ${date}*

RULES: Use only the data above. No invented news or external facts. Every claim needs a number or named stock. If a value is n/a, skip it — do not fabricate.`;
}

/* ── Handler ──────────────────────────────────────────────────────── */
module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') { setCors(res); return res.status(204).end(); }
  if (req.method !== 'POST')    return err(res, 'POST required', 405);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return err(res,
      'GEMINI_API_KEY not set. Get a free key at https://aistudio.google.com/app/apikey ' +
      'then add it in Vercel → Project Settings → Environment Variables.',
      503
    );
  }

  let payload = req.body || {};
  if (typeof payload === 'string') {
    if (payload.length > 150000) return err(res, 'Payload too large', 413);
    try { payload = JSON.parse(payload); } catch { return err(res, 'Invalid JSON body', 400); }
  } else if (Buffer.byteLength(JSON.stringify(payload||{})) > 150000) {
    return err(res, 'Payload too large', 413);
  }

  const { assets, sectors, cis, stocks, alerts, dataHealth } = payload;
  if (!assets || !sectors || !cis) return err(res, 'Missing assets, sectors, or cis', 400);

  const prompt = buildPrompt(assets, sectors, cis, stocks||[], alerts||[], dataHealth||null);
  const model  = 'gemini-2.5-flash-lite'; // 15 RPM / 1,000 RPD free tier — highest limit available (May 2026)

  console.log('[morning-note] Calling', model, '— prompt chars:', prompt.length);

  const callGemini = () => post(
    'generativelanguage.googleapis.com',
    `/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {},
    { contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.65, topP: 0.90 } }
  );

  try {
    let r = await callGemini();

    // 1 retry with backoff on 429
    if (r.status === 429) {
      console.warn('[morning-note] 429 — retrying in 5s…');
      await sleep(5000);
      r = await callGemini();
    }

    if (r.status !== 200) {
      const detail = r.json?.error?.message || r.raw || 'Unknown error';
      console.error('[morning-note] Gemini error', r.status, detail);
      if (r.status === 400 && detail.includes('API_KEY')) return err(res, 'Invalid Gemini API key — check aistudio.google.com.', 401);
      if (r.status === 429) return err(res, 'Gemini rate limit reached (gemini-2.5-flash-lite free tier: 1,000 req/day). Try again in a moment.', 429);
      return err(res, `Gemini error (${r.status}): ${detail}`, 502);
    }

    const text = r.json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const reason = r.json?.candidates?.[0]?.finishReason;
      return err(res, `Gemini returned empty response (finishReason: ${reason||'unknown'}). Try again.`, 502);
    }

    const usage = r.json.usageMetadata || {};
    console.log('[morning-note] ✓', text.length, 'chars — tokens in:', usage.promptTokenCount, 'out:', usage.candidatesTokenCount);

    return ok(res, {
      note:       text,
      model,
      tokens_in:  usage.promptTokenCount     || null,
      tokens_out: usage.candidatesTokenCount || null,
      timestamp:  new Date().toISOString(),
    });

  } catch (e) {
    console.error('[morning-note] Error:', e.message);
    return err(res, 'Server error: ' + e.message);
  }
};
