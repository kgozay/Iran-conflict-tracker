import { useState, useCallback, useRef } from 'react';

const CACHE_KEY = 'jse_cw_fundamentals_v1';
const REFRESH_AFTER = 6 * 60 * 60 * 1000; // P/E and market cap move slowly; refetch every 6h

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return c?.data && Number.isFinite(c.ts) ? c : null;
  } catch { return null; }
}

function saveCache(snapshot) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot)); } catch {}
}

/**
 * Live P/E and market cap. Returns `live` (fetched this session) and `cached` (last
 * successful fetch from localStorage); `mergeFundamentals` decides which to show.
 * Failures are silent so the cards fall back to cached, then static, figures.
 */
export function useFundamentals() {
  const [cached] = useState(loadCache);
  const [live, setLive] = useState(null);
  const startedRef = useRef(false);

  const fetchFundamentals = useCallback(async (symbols) => {
    if (!symbols?.length || startedRef.current) return;
    startedRef.current = true;
    if (cached && Date.now() - cached.ts < REFRESH_AFTER) return;

    try {
      const res = await fetch(`/api/fundamentals?symbols=${encodeURIComponent(symbols.join(','))}`);
      if (!res.ok) return;
      const body = await res.json();
      if (!body?.fundamentals || !Object.keys(body.fundamentals).length) return;
      const snapshot = { ts: Date.now(), data: body.fundamentals };
      setLive(snapshot);
      saveCache(snapshot);
    } catch (e) {
      console.warn('[useFundamentals]', e.message);
    }
  }, [cached]);

  return { liveFundamentals: live, cachedFundamentals: cached, fetchFundamentals };
}
