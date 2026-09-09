/**
 * Official US Treasury daily par-yield fallback for the 10-year rate.
 * Yahoo ^TNX remains the faster market indicator; this endpoint supplies a
 * dependable daily value when Yahoo does not return that symbol.
 */
const https = require('https');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400',
};

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'JSE-Conflict-Watch/3.1' } }, response => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`US Treasury HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.setTimeout(10000, () => req.destroy(new Error('US Treasury request timed out')));
    req.on('error', reject);
  });
}

function parseSeries(xml) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries.flatMap(entry => {
    const date = entry.match(/<d:NEW_DATE[^>]*>([^<]+)<\/d:NEW_DATE>/i)?.[1];
    const value = entry.match(/<d:BC_10YEAR[^>]*>([^<]+)<\/d:BC_10YEAR>/i)?.[1];
    const yieldValue = Number(value);
    return date && Number.isFinite(yieldValue) ? [{ date: date.slice(0, 10), value: yieldValue }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function pct(start, end) {
  return start && end != null ? +(((end - start) / start) * 100).toFixed(4) : null;
}

module.exports = async function handler(req, res) {
  for (const [key, value] of Object.entries(HEADERS)) res.setHeader(key, value);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const year = new Date().getUTCFullYear();
    const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${year}`;
    const series = parseSeries(await get(url));
    if (series.length < 2) return res.status(502).json({ error: 'US Treasury returned insufficient 10-year data' });

    const values = series.map(point => point.value);
    const latest = series[series.length - 1];
    const previous = series[series.length - 2];
    const change = +(latest.value - previous.value).toFixed(4);
    const quote = {
      symbol: '^TNX',
      name: 'US 10-Year Treasury Yield',
      price: latest.value,
      prevClose: previous.value,
      change,
      changePct: pct(previous.value, latest.value),
      source: 'US Treasury',
      timestamp: `${latest.date}T23:59:59.000Z`,
      marketState: 'CLOSED',
    };
    const n = values.length;
    const history = {
      symbol: '^TNX',
      price: latest.value,
      prevClose: previous.value,
      changePct1D: pct(values[n - 2], values[n - 1]),
      changePct5D: n >= 6 ? pct(values[n - 6], values[n - 1]) : null,
      changePct20D: n >= 21 ? pct(values[n - 21], values[n - 1]) : null,
      returns20D: values.slice(Math.max(0, n - 21)).slice(1).map((value, index) => (value - values[Math.max(0, n - 21) + index]) / values[Math.max(0, n - 21) + index]),
      barsAvailable: n,
    };

    return res.status(200).json({ quote, history, source: 'US Treasury', timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'US Treasury data unavailable' });
  }
};
