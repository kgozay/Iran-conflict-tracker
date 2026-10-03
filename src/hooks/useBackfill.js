import { useState, useEffect } from 'react';

const CACHE_KEY = 'jse_cw_backfill_v1';
const FRESH_FOR = 12 * 60 * 60 * 1000;

function loadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
    return Array.isArray(c?.data?.series) && Number.isFinite(c.ts) ? c : null;
  } catch { return null; }
}

/**
 * Daily CIS rebuilt from historical closes (/api/cis-backfill), cached for 12h.
 * Pass `enabled` so the heavy request only runs when a view needs it.
 */
export function useBackfill(enabled) {
  const [state, setState] = useState(() => {
    const c = loadCache();
    return { data: c?.data ?? null, status: c ? 'cached' : 'idle', error: null };
  });

  useEffect(() => {
    if (!enabled) return;
    const c = loadCache();
    if (c && Date.now() - c.ts < FRESH_FOR) return;
    let cancelled = false;
    setState(s => ({ ...s, status: 'loading' }));
    fetch('/api/cis-backfill')
      .then(async res => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.series) throw new Error(json?.error || `History service returned ${res.status}`);
        return json;
      })
      .then(data => {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch { /* full */ }
        if (!cancelled) setState({ data, status: 'live', error: null });
      })
      .catch(e => { if (!cancelled) setState(s => ({ ...s, status: s.data ? 'cached' : 'error', error: e.message })); });
    return () => { cancelled = true; };
  }, [enabled]);

  return state;
}
