import { useState, useCallback, useEffect, useRef } from 'react';

const CACHE_KEY = 'jse_cw_news_v1';
const CACHE_TTL = 15 * 60 * 1000; // 15 min

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (Date.now() - c.ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return c;
  } catch { return null; }
}

function saveCache(articles) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), articles })); }
  catch { /* storage full */ }
}

export function useNews() {
  const cached = loadCache();
  const [news,        setNews]        = useState(cached?.articles ?? []);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError,   setNewsError]   = useState(null);
  const [lastFetched, setLastFetched] = useState(cached ? new Date(cached.ts) : null);
  const abortRef = useRef(null);

  const fetchNews = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setNewsLoading(true);
    setNewsError(null);
    try {
      const res = await fetch('/api/news', { signal: ctrl.signal });
      if (!res.ok) throw new Error(`News API returned ${res.status}`);
      const data = await res.json();
      const articles = data.articles ?? [];
      setNews(articles);
      setLastFetched(new Date());
      saveCache(articles);
    } catch (e) {
      if (e.name !== 'AbortError') {
        setNewsError(e.message || 'Failed to fetch headlines');
      }
    } finally {
      setNewsLoading(false);
    }
  }, []);

  // Auto-fetch on mount if cache is empty or stale
  useEffect(() => {
    if (!cached) fetchNews();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { news, newsLoading, newsError, lastFetched, refetchNews: fetchNews };
}
