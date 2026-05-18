/**
 * JSE Conflict Watch — Geopolitical News RSS Proxy
 * Vercel Serverless Function — CommonJS — NO API KEY REQUIRED
 *
 * Fetches 3 free RSS feeds, filters for conflict/Iran-relevant headlines,
 * deduplicates, sorts by date, and returns the top 20 articles.
 *
 * Sources:
 *   1. Reuters top news
 *   2. BBC Middle East
 *   3. Al Jazeera
 *
 * Cache-Control: 15 minutes (news changes slowly relative to market data)
 */

const https = require('https');
const zlib  = require('zlib');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control':               'public, max-age=900, s-maxage=900',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const SOURCES = [
  { name: 'Reuters',     url: 'https://feeds.reuters.com/reuters/topNews' },
  { name: 'BBC',         url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'BusinessTech', url: 'https://businesstech.co.za/news/feed/' },
  { name: 'SABC News',   url: 'https://www.sabcnews.com/sabcnews/feed/' },
];

const KEYWORDS = [
  'iran','israel','gaza','hezbollah','lebanon','hamas','syria','houthi',
  'oil','crude','brent','opec','geopolit','middle east','sanctions','nuclear',
  'conflict','missile','attack','war','ceasefire','hostage',
  'jse','south africa','rand','sarb','gold','commodity',
  'inflation','interest rate','mpc','zar','johannesburg','commodity prices',
  'loadshedding','eskom','pretoria','south african',
];

/* ── HTTP GET with gzip/deflate/br decompression ─────────────────── */
function get(url, hops) {
  hops = hops == null ? 3 : hops;
  return new Promise(function(resolve, reject) {
    const options = {
      headers: {
        'User-Agent':      UA,
        'Accept':          'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    };
    const req = https.get(url, options, function(res) {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location && hops > 0) {
        res.resume();
        return get(res.headers.location, hops - 1).then(resolve).catch(reject);
      }
      const enc = (res.headers['content-encoding'] || '').toLowerCase();
      let stream = res;
      if (enc === 'gzip')         stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br')      stream = res.pipe(zlib.createBrotliDecompress());

      const chunks = [];
      stream.on('data', function(c) { chunks.push(c); });
      stream.on('end',  function()  { resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }); });
      stream.on('error', reject);
    });
    req.setTimeout(8000, function() { req.destroy(new Error('RSS fetch timed out')); });
    req.on('error', reject);
  });
}

/* ── Strip CDATA + HTML tags from a string ──────────────────────── */
function clean(s) {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

/* ── Extract value of an XML tag ───────────────────────────────── */
function getTag(block, tag) {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
  return m ? clean(m[1]) : '';
}

/* ── Parse RSS XML → array of article objects ───────────────────── */
function parseRSS(xml, sourceName) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title       = getTag(block, 'title');
    const description = getTag(block, 'description').slice(0, 220);
    const link        = getTag(block, 'link') || getTag(block, 'guid');
    const pubDate     = getTag(block, 'pubDate');

    if (!title || !link) continue;

    let isoDate = null;
    try { isoDate = new Date(pubDate).toISOString(); } catch { isoDate = new Date().toISOString(); }

    items.push({ title, description, link, pubDate, isoDate, source: sourceName });
  }
  return items;
}

/* ── Check if an article is conflict/Iran relevant ──────────────── */
function isRelevant(article) {
  const haystack = (article.title + ' ' + article.description).toLowerCase();
  return KEYWORDS.some(kw => haystack.includes(kw));
}

/* ── Deduplicate by normalised title (first 55 chars) ───────────── */
function deduplicate(articles) {
  const seen = new Set();
  return articles.filter(a => {
    const key = a.title.toLowerCase().slice(0, 55).replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ── AI Sentiment Scoring ───────────────────────────────────────── */
async function scoreHeadlines(articles) {
  if (!process.env.GEMINI_API_KEY) return articles; // fallback: return as-is
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const headlines = articles.map(a => a.title);
    const prompt = `You are a financial sentiment analyst. For each headline below, return ONLY a JSON array (same order) of objects with keys "sentiment" ("bearish"|"neutral"|"bullish") and "score" (0.0–1.0 confidence). No explanation.\n\nHeadlines:\n${JSON.stringify(headlines)}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Extract the JSON array robustly — avoids backtick-stripping corrupting headline content
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in Gemini response');
    const scores = JSON.parse(jsonMatch[0]);
    return articles.map((a, i) => ({ ...a, sentiment: scores[i]?.sentiment ?? a.sentiment ?? 'neutral', aiScore: scores[i]?.score ?? null }));
  } catch (err) {
    console.error('[news] scoreHeadlines failed:', err.message);
    // Ensure sentiment and aiScore fields always exist so the widget doesn't get undefined
    return articles.map(a => ({ ...a, sentiment: a.sentiment ?? 'neutral', aiScore: null }));
  }
}

/* ── Handler ──────────────────────────────────────────────────────── */
const setCors = function(res) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
};
const ok  = function(res, body)   { setCors(res); return res.status(200).json(body); };
const err = function(res, msg, c) { setCors(res); return res.status(c || 500).json({ error: msg }); };

module.exports = async function(req, res) {
  if (req.method === 'OPTIONS') { setCors(res); return res.status(204).end(); }

  try {
    const results = await Promise.allSettled(
      SOURCES.map(src =>
        get(src.url).then(r => {
          if (r.status !== 200 || !r.text) return [];
          return parseRSS(r.text, src.name);
        })
      )
    );

    let all = [];
    for (const r of results) {
      if (r.status === 'fulfilled') all = all.concat(r.value);
    }

    let filtered = deduplicate(all.filter(isRelevant))
      .sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate))
      .slice(0, 30);

    filtered = await scoreHeadlines(filtered);

    console.log(`[news] ✓ ${filtered.length} relevant articles from ${all.length} total`);

    return ok(res, {
      articles:  filtered,
      total:     filtered.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[news] Unhandled error:', e.message);
    return err(res, 'News fetch failed: ' + e.message);
  }
};
