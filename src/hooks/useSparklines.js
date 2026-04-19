import { useState, useCallback, useRef } from 'react';

const CACHE_KEY = 'jse_cw_sparklines_v1';
const CACHE_TTL = 8 * 60 * 1000; // 8 min — refreshes with each data fetch

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (Date.now() - c.ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return c.data;
  } catch { return null; }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

export function useSparklines() {
  const [sparklines, setSparklines] = useState(() => loadCache() ?? {});
  const [loading,    setLoading]    = useState(false);
  const abortRef = useRef(null);

  const fetchSparklines = useCallback(async (symbols) => {
    if (!symbols || !symbols.length) return;

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/sparklines?symbols=${encodeURIComponent(symbols.join(','))}`,
        { signal: ctrl.signal }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.sparklines && Object.keys(data.sparklines).length > 0) {
        setSparklines(data.sparklines);
        saveCache(data.sparklines);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('[useSparklines]', e.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { sparklines, loading, fetchSparklines };
}
