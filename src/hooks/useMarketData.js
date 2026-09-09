import { useState, useCallback, useRef, useEffect } from 'react';
import { JSE_STOCKS, MACRO_SYMBOLS, ALL_YAHOO_SYMBOLS } from '../data/stocks.js';

const CACHE_KEY  = 'jse_cw_v7_cache';
const CACHE_TTL  = 5  * 60 * 1000;  // 5 min — fresh
const STALE_TTL  = 30 * 60 * 1000;  // 30 min — still usable
const FOCUS_LAG  = 5  * 60 * 1000;  // refetch when tab returns after 5 min

/* ─── environment detection ──────────────────────────────────────── */
function getEnv() {
  const h = window.location.hostname;
  if (h.includes('stackblitz') || h.includes('webcontainer')) return 'stackblitz';
  if (h === 'localhost' || h === '127.0.0.1') return 'local';
  return 'vercel';
}

/* ─── empty baselines (no fake prices) ───────────────────────────── */
function makeEmptyAssets() {
  return Object.fromEntries(
    Object.entries(MACRO_SYMBOLS).map(([key, meta]) => [
      key,
      {
        ...meta,
        price: null, changePct: null, change: null, prevClose: null,
        changePct5D: null, changePct20D: null,
        isLive: false,
      },
    ])
  );
}

function makeEmptyStocks() {
  return JSE_STOCKS.map(s => ({
    ...s,
    price: null, changePct: null, change: null, prevClose: null,
    changePct5D: null, changePct20D: null,
    isLive: false,
  }));
}

/* ─── apply Yahoo Finance quotes onto asset/stock baseline ─────── */
function applyQuotes(quotes, baseAssets, baseStocks) {
  const ASSET_MAP = {
    'BZ=F':     'brent',
    'GC=F':     'gold',
    'PL=F':     'platinum',
    'PA=F':     'palladium',
    'USDZAR=X': 'usdZar',
    'MTF=F':    'coal',
    '^TNX':     'us10y',
  };

  const assets = { ...baseAssets };
  for (const [sym, key] of Object.entries(ASSET_MAP)) {
    const q = quotes[sym];
    if (q?.price != null) {
      assets[key] = {
        ...assets[key],
        price:     q.price,
        changePct: q.changePct,
        change:    q.change,
        prevClose: q.prevClose,
        marketState: q.marketState,
        timestamp: q.timestamp,
        name:      q.name || assets[key].name,
        isLive:    true,
        source:    q.source || 'Yahoo',
      };
    }
  }

  const stocks = baseStocks.map(s => {
    const q = quotes[s.ticker];
    return q?.price != null
      ? { ...s, price: q.price, changePct: q.changePct, change: q.change, prevClose: q.prevClose, isLive: true, source: q.source || 'Yahoo' }
      : s;
  });

  return { assets, stocks };
}

/* ─── merge history data (5D/20D) onto assets/stocks ────────────── */
function applyHistory(history, assets, stocks) {
  const ASSET_MAP = {
    'BZ=F':     'brent',
    'GC=F':     'gold',
    'PL=F':     'platinum',
    'PA=F':     'palladium',
    'USDZAR=X': 'usdZar',
    'MTF=F':    'coal',
    '^TNX':     'us10y',
  };

  const nextAssets = { ...assets };
  for (const [sym, key] of Object.entries(ASSET_MAP)) {
    const h = history[sym];
    if (h) {
      nextAssets[key] = {
        ...nextAssets[key],
        changePct5D:  h.changePct5D,
        changePct20D: h.changePct20D,
      };
    }
  }

  const nextStocks = stocks.map(s => {
    const h = history[s.ticker];
    return h
      ? { ...s, changePct5D: h.changePct5D, changePct20D: h.changePct20D }
      : s;
  });

  return { assets: nextAssets, stocks: nextStocks };
}

/* ─── localStorage cache ─────────────────────────────────────────── */
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (Date.now() - c.ts > STALE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return c;
  } catch { return null; }
}

function saveCache(quotes, history, sourceHealth) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      quotes,
      history: history ?? null,
      sourceHealth: sourceHealth ?? null,
    }));
  } catch { /* storage full — ignore */ }
}

/* ─── hook ───────────────────────────────────────────────────────── */
export function useMarketData() {
  const [assets,       setAssets]       = useState(makeEmptyAssets);
  const [stocks,       setStocks]       = useState(makeEmptyStocks);
  const [history,      setHistory]      = useState({});
  const [sourceHealth, setSourceHealth] = useState({ quotes: 'idle', history: 'idle' });
  const [status,       setStatus]       = useState('empty');
  const [error,        setError]        = useState(null);
  const [lastFetch,    setLastFetch]    = useState(null);
  const [progress,     setProgress]     = useState('');
  const [env,          setEnv]          = useState(null);

  const abortRef    = useRef(null);
  const lastFetchTs = useRef(null);
  const envRef      = useRef(null);

  /* Show cached data immediately on mount.
   * Returns: 'empty' | 'stale' | 'fresh'
   */
  const initFromCache = useCallback(() => {
    const e = getEnv();
    setEnv(e);
    envRef.current = e;

    const cached = loadCache();
    if (!cached?.quotes) return 'empty';

    const isStale = Date.now() - cached.ts > CACHE_TTL;
    const empty   = { assets: makeEmptyAssets(), stocks: makeEmptyStocks() };
    let { assets: a, stocks: s } = applyQuotes(cached.quotes, empty.assets, empty.stocks);

    if (cached.history) {
      const merged = applyHistory(cached.history, a, s);
      a = merged.assets; s = merged.stocks;
    }
    setAssets(a);
    setStocks(s);
    setHistory(cached.history || {});
    setSourceHealth(cached.sourceHealth || { quotes: 'cached', history: cached.history ? 'cached' : 'missing' });
    setStatus(isStale ? 'cached' : 'live');
    setLastFetch(new Date(cached.ts));
    lastFetchTs.current = cached.ts;
    return isStale ? 'stale' : 'fresh';
  }, []);

  /* Quote and history failures are isolated so partial data remains usable. */
  const fetchLive = useCallback(async (silent = false) => {
    const environment = envRef.current ?? getEnv();

    if (environment === 'stackblitz') {
      setError('Live data requires Vercel deployment. Running on Stackblitz — functions are unavailable here.');
      setStatus('error');
      return { success: false };
    }

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (!silent) { setStatus('loading'); setError(null); }
    setProgress('Connecting…');

    try {
      setProgress('Fetching current quotes and historical returns…');

      const fetchOpts = { signal: ctrl.signal };
      const symbolStr = ALL_YAHOO_SYMBOLS.join(',');

      const [rYahoo, rHistory, rTreasury] = await Promise.allSettled([
        fetch(`/api/quotes?symbols=${encodeURIComponent(symbolStr)}`, fetchOpts).then(async r => {
          if (!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
          return r.json();
        }),
        fetch(`/api/history?symbols=${encodeURIComponent(symbolStr)}`, fetchOpts).then(async r => {
          if (!r.ok) throw new Error(`History HTTP ${r.status}`);
          return r.json();
        }),
        fetch('/api/treasury', fetchOpts).then(async r => {
          if (!r.ok) throw new Error(`US Treasury HTTP ${r.status}`);
          return r.json();
        }),
      ]);

      setProgress('Processing market data…');

      /* ── Yahoo quotes (fast path, 1D data) ── */
      let quotes = {};
      if (rYahoo.status === 'fulfilled') {
        quotes = rYahoo.value?.quotes ?? {};
        console.log(`[useMarketData] Yahoo quotes: ${Object.keys(quotes).length} received`);
      } else {
        console.error('[useMarketData] Yahoo failed:', rYahoo.reason?.message);
      }

      /* ── History (5D/20D for every symbol) ── */
      let history = {};
      if (rHistory.status === 'fulfilled') {
        history = rHistory.value?.history ?? {};
        console.log(`[useMarketData] History: ${Object.keys(history).length} symbols`);
      } else {
        console.error('[useMarketData] History failed:', rHistory.reason?.message);
      }

      if (!quotes['^TNX'] && rTreasury.status === 'fulfilled' && rTreasury.value?.quote) {
        quotes['^TNX'] = rTreasury.value.quote;
      }
      if (!history['^TNX'] && rTreasury.status === 'fulfilled' && rTreasury.value?.history) {
        history['^TNX'] = rTreasury.value.history;
      }

      if (Object.keys(quotes).length === 0) {
        throw new Error(rYahoo.reason?.message ?? 'Yahoo Finance fetch failed — check Vercel function logs');
      }

      /* ── Apply all layers to state ── */
      const emptyA = makeEmptyAssets();
      const emptyS = makeEmptyStocks();
      let { assets: a, stocks: s } = applyQuotes(quotes, emptyA, emptyS);

      if (Object.keys(history).length > 0) {
        const merged = applyHistory(history, a, s);
        a = merged.assets; s = merged.stocks;
      }

      setAssets(a);
      setStocks(s);
      setHistory(history || {});
      setStatus('live');
      const fetchedAt = new Date();
      const returned = Object.keys(quotes).length;
      const requested = ALL_YAHOO_SYMBOLS.length;
      const health = {
        quotes: 'available',
        history: rHistory.status === 'fulfilled' ? 'available' : 'unavailable',
        treasury: rTreasury.status === 'fulfilled' ? 'available' : 'unavailable',
        returned,
        requested,
        fetchedAt: fetchedAt.toISOString(),
      };
      const warnings = [];
      if (returned < requested) warnings.push(`${requested - returned} instruments are temporarily unavailable.`);
      if (rHistory.status !== 'fulfilled') warnings.push('Historical returns are unavailable; current prices remain usable.');
      if (!quotes['^TNX']) warnings.push('US 10Y yield is temporarily unavailable from both Yahoo and US Treasury.');
      setLastFetch(fetchedAt);
      setSourceHealth(health);
      setError(warnings.join(' '));
      setProgress('');
      lastFetchTs.current = Date.now();

      saveCache(quotes, history, health);
      return { success: true, assets: a, stocks: s, warning: warnings.join(' ') };

    } catch (e) {
      if (e.name === 'AbortError') return { success: false };
      const msg = e.message || 'Unknown fetch error';
      console.error('[useMarketData]', msg);
      setError(msg);
      setSourceHealth(h => ({ ...h, quotes: 'unavailable', lastError: msg }));
      setStatus(lastFetchTs.current ? 'cached' : 'error');
      setProgress('');
      return { success: false, error: msg };
    }
  }, []);

  /* Refetch silently when tab becomes visible again after 5+ min away */
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      if (!lastFetchTs.current) return;
      if (Date.now() - lastFetchTs.current > FOCUS_LAG) {
        console.log('[useMarketData] Tab focused — background refresh');
        fetchLive(true);
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchLive]);

  return {
    assets, stocks, history, sourceHealth,
    status, error, lastFetch, progress, env,
    fetchLive, initFromCache,
    clearError: () => { setError(null); setStatus(s => s === 'error' ? (lastFetchTs.current ? 'cached' : 'empty') : s); },
  };
}
