/**
 * Shared Yahoo Finance helpers for the serverless functions.
 * Files under api/_lib are not exposed as routes by Vercel.
 */

const https = require('https');
const zlib  = require('zlib');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/* ── HTTP GET with automatic gzip/deflate/br decompression ────────── */
function get(url, reqHeaders, followRedirects) {
  if (followRedirects === undefined) followRedirects = 5;
  return new Promise((resolve, reject) => {
    const options = {
      headers: Object.assign({
        'User-Agent':      UA,
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      }, reqHeaders || {}),
    };

    const req = https.get(url, options, function(res) {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && followRedirects > 0) {
        res.resume();
        return get(res.headers.location, reqHeaders, followRedirects - 1).then(resolve).catch(reject);
      }

      const enc = (res.headers['content-encoding'] || '').toLowerCase();
      let stream = res;
      if (enc === 'gzip')         stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br')      stream = res.pipe(zlib.createBrotliDecompress());

      const chunks = [];
      stream.on('data', function(c) { chunks.push(c); });
      stream.on('end', function() {
        const body = Buffer.concat(chunks).toString('utf8');
        try   { resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, json: null, raw: body.slice(0, 500) }); }
      });
      stream.on('error', reject);
    });

    req.setTimeout(10000, function() { req.destroy(new Error('Yahoo Finance request timed out after 10s')); });
    req.on('error', reject);
  });
}

/* ── Cookie + crumb auth (needed by the quote and quoteSummary endpoints) ── */
let _crumbCache = null;
const CRUMB_TTL = 55 * 60 * 1000;

async function fetchCookies() {
  const res = await get('https://finance.yahoo.com/', {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });
  const raw = res.headers['set-cookie'] || [];
  if (!raw.length) return '';
  return raw.map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
}

async function fetchCrumb(cookie) {
  const res = await get('https://query2.finance.yahoo.com/v1/test/getcrumb',
                        { Cookie: cookie, Accept: 'text/plain, */*' });
  if (res.status !== 200) return '';
  const crumb = (res.raw || (res.json != null ? String(res.json) : '')).trim();
  return (crumb && crumb.length >= 2) ? crumb : '';
}

async function getOrRefreshCrumb() {
  const now = Date.now();
  if (_crumbCache && (now - _crumbCache.ts) < CRUMB_TTL) return _crumbCache;
  try {
    const cookie = await fetchCookies();
    if (!cookie) return null;
    const crumb = await fetchCrumb(cookie);
    if (!crumb) return null;
    _crumbCache = { cookie, crumb, ts: now };
    return _crumbCache;
  } catch (e) { return null; }
}

function invalidateCrumb() { _crumbCache = null; }

/* Headers Yahoo expects alongside an authenticated request */
function authHeaders(auth) {
  return {
    Cookie:  auth.cookie,
    Referer: 'https://finance.yahoo.com/',
    Origin:  'https://finance.yahoo.com',
  };
}

/* Run an async task per item with bounded concurrency; per-item failures are swallowed. */
async function mapWithConcurrency(items, concurrency, task) {
  const results = {};
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const item = items[idx++];
      try {
        const value = await task(item);
        if (value != null) results[item] = value;
      } catch (e) { /* per-item failure must not fail the batch */ }
    }
  }
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

module.exports = { UA, get, getOrRefreshCrumb, invalidateCrumb, authHeaders, mapWithConcurrency };
