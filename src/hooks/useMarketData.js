import { useState, useCallback, useRef, useEffect } from 'react';
import { JSE_STOCKS, MACRO_SYMBOLS, ALL_YAHOO_SYMBOLS } from '../data/stocks.js';

const CACHE_KEY  = 'jse_cw_v6_cache';
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
    '^ZA10Y':   'r2035',
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
        name:      q.name || assets[key].name,
        isLive:    true,
      };
    }
  }

  const stocks = baseStocks.map(s => {
    const q = quotes[s.ticker];
    return q?.price != null
      ? { ...s, price: q.price, changePct: q.changePct, change: q.change, prevClose: q.prevClose, isLive: true }
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
    '^ZA10Y':   'r2035',
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

function saveCache(quotes, bond, r2035History, history) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      quotes,
      bond: bond ?? null,
      r2035History: r2035History ?? null,
      history: history ?? null,
    }));
  } catch { /* storage full — ignore */ }
}

/* ─── hook ───────────────────────────────────────────────────────── */
export function useMarketData() {
  const [assets,       setAssets]       = useState(makeEmptyAssets);
  const [stocks,       setStocks]       = useState(makeEmptyStocks);
  const [r2035History, setR2035History] = useState([]);   // [{month,yield,date},…]
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
    if (cached.bond?.price != null) {
      a.r2035 = { ...a.r2035, ...cached.bond, isLive: true };
    }

    setAssets(a);
    setStocks(s);
    setR2035History(cached.r2035History || []);
    setStatus(isStale ? 'cached' : 'live');
    setLastFetch(new Date(cached.ts));
    lastFetchTs.current = cached.ts;
    return isStale ? 'stale' : 'fresh';
  }, []);

  /* Main fetch — runs /api/quotes, /api/sarb, /api/history in parallel */
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
      setProgress('Fetching market data (quotes, bond yield, historical)…');

      const fetchOpts = { signal: ctrl.signal };
      const symbolStr = ALL_YAHOO_SYMBOLS.join(',');

      const [rYahoo, rSarb, rHistory] = await Promise.allSettled([
        fetch(`/api/quotes?symbols=${encodeURIComponent(symbolStr)}`, fetchOpts).then(async r => {
          if (!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
          return r.json();
        }),
        fetch(`/api/sarb`, fetchOpts).then(async r => {
          if (!r.ok) throw new Error(`SARB HTTP ${r.status}`);
          return r.json();
        }),
        fetch(`/api/history?symbols=${encodeURIComponent(symbolStr)}`, fetchOpts).then(async r => {
          if (!r.ok) throw new Error(`History HTTP ${r.status}`);
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

      /* ── SARB bond yield + 12M history ── */
      let bond = null;
      let r2035Hist = [];
      if (rSarb.status === 'fulfilled') {
        bond = rSarb.value?.bond ?? null;
        r2035Hist = rSarb.value?.history ?? [];
        if (bond) console.log(`[useMarketData] Bond: ${bond.price}% from ${bond.source} · ${r2035Hist.length} history points`);
      } else {
        console.error('[useMarketData] SARB failed:', rSarb.reason?.message);
      }

      /* ── History (5D/20D for every symbol) ── */
      let history = {};
      if (rHistory.status === 'fulfilled') {
        history = rHistory.value?.history ?? {};
        console.log(`[useMarketData] History: ${Object.keys(history).length} symbols`);
      } else {
        console.error('[useMarketData] History failed:', rHistory.reason?.message);
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

      if (bond && bond.price != null) {
        a.r2035 = {
          ...a.r2035,
          ...bond,
          isLive: true,
          // Preserve 5D/20D from history endpoint if bond endpoint didn't supply them
          changePct5D:  a.r2035.changePct5D,
          changePct20D: a.r2035.changePct20D,
        };
      }

      setAssets(a);
      setStocks(s);
      setR2035History(r2035Hist);
      setStatus('live');
      setLastFetch(new Date());
      setError(null);
      setProgress('');
      lastFetchTs.current = Date.now();

      saveCache(quotes, bond, r2035Hist, history);
      return { success: true, assets: a, stocks: s };

    } catch (e) {
      if (e.name === 'AbortError') return { success: false };
      const msg = e.message || 'Unknown fetch error';
      console.error('[useMarketData]', msg);
      if (!silent) { setError(msg); setStatus('error'); }
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
    assets, stocks, r2035History,
    status, error, lastFetch, progress, env,
    fetchLive, initFromCache,
    clearError: () => { setError(null); setStatus('empty'); },
  };
}
