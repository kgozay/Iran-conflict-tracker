/**
 * Minimal Upstash Redis REST client (also what Vercel's Redis/KV integration
 * provisions). No dependency: one HTTPS call per command or pipeline.
 *
 * Env: KV_REST_API_URL + KV_REST_API_TOKEN (Vercel integration names), or
 *      UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 */

function config() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

function storeConfigured() { return config() != null; }

async function call(path, body) {
  const cfg = config();
  if (!cfg) throw new Error('History store not configured');
  const res = await fetch(cfg.url + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Store error ${res.status}: ${json?.error || 'unknown'}`);
  return json;
}

/* One command, e.g. redis(['SET', 'k', 'v']) → result */
async function redis(command) {
  const json = await call('', command);
  if (json?.error) throw new Error(json.error);
  return json?.result;
}

/* Several commands in one round trip → array of results */
async function pipeline(commands) {
  const json = await call('/pipeline', commands);
  return (json || []).map(r => {
    if (r?.error) throw new Error(r.error);
    return r?.result;
  });
}

module.exports = { storeConfigured, redis, pipeline };
