import { useState, useCallback, useRef, useEffect } from 'react';
import { JSE_STOCKS, MACRO_SYMBOLS, ALL_YAHOO_SYMBOLS } from '../data/stocks.js';

const CACHE_KEY  = 'jse_cw_v5_cache';
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
  const base = Object.fromEntries(
    Object.entries(MACRO_SYMBOLS).map(([key, meta]) => [
      key,
      { ...meta, price: null, changePct: null, change: null, prevClose: null, isLive: false },
    ])
  );
  // r2035 is now in MACRO_SYMBOLS — no separate override needed
  return base;
}

function makeEmptyStocks() {
  return JSE_STOCKS.map(s => ({
    ...s, price: null, changePct: null, change: null, prevClose: null, isLive: false,
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
    '^ZA10Y':   'r2035',   // SA 10Y govt bond yield — replaces SARB function
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

function saveCache(quotes, bond) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), quotes, bond: bond ?? null }));
  } catch { /* storage full — ignore */ }
}

/* ─── hook ───────────────────────────────────────────────────────── */
export function useMarketData() {
  const [assets,    setAssets]    = useState(makeEmptyAssets);
  const [stocks,    setStocks]    = useState(makeEmptyStocks);
  const [status,    setStatus]    = useState('empty');
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [progress,  setProgress]  = useState('');
  const [env,       setEnv]       = useState(null);

  const abortRef    = useRef(null);
  const lastFetchTs = useRef(null);
  const envRef      = useRef(null);  // always-current env without stale closure

  /* Show cached data immediately on mount.
   * Returns: 'empty' | 'stale' | 'fresh'
   */
  const initFromCache = useCallback(() => {
    const e = getEnv();
    setEnv(e);
    envRef.current = e;

    const cached = loadCache();
    if (!cached?.quotes) return 'empty';   // was: return false

    const isStale = Date.now() - cached.ts > CACHE_TTL;
    const empty   = { assets: makeEmptyAssets(), stocks: makeEmptyStocks() };
    const { assets: a, stocks: s } = applyQuotes(cached.quotes, empty.assets, empty.stocks);

    if (cached.bond?.price != null) {
      a.r2035 = { ...a.r2035, ...cached.bond, isLive: true };
    }

    setAssets(a);
    setStocks(s);
    setStatus(isStale ? 'cached' : 'live');
    setLastFetch(new Date(cached.ts));
    lastFetchTs.current = cached.ts;
    return isStale ? 'stale' : 'fresh';   // was: return isStale
  }, []);

  /* Main fetch — Yahoo Finance (stocks, commodities, ^ZA10Y bond yield) */
  const fetchLive = useCallback(async (silent = false) => {
    const environment = envRef.current ?? getEnv();

    if (environment === 'stackblitz') {
      setError('Live data requires Vercel deployment. Running on Stackblitz — functions are unavailable here.');
      setStatus('error');
      return { success: false };
    }

    /* Cancel any in-flight request */
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (!silent) { setStatus('loading'); setError(null); }
    setProgress('Connecting…');

    try {
      setProgress('Fetching Yahoo Finance data (stocks + bond yield)…');

      const fetchOpts = { signal: ctrl.signal };
      const symbolStr = ALL_YAHOO_SYMBOLS.join(',');

      /* Fetch Yahoo Finance and SARB/FRED (for bond yield) concurrently */
      let yahooResult;
      let sarbResult;
      try {
        const [rYahoo, rSarb] = await Promise.allSettled([
          fetch(`/api/quotes?symbols=${encodeURIComponent(symbolStr)}`, fetchOpts).then(async r => {
            if (!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
            return r.json();
          }),
          fetch(`/api/sarb`, fetchOpts).then(async r => {
            if (!r.ok) throw new Error(`SARB HTTP ${r.status}`);
            return r.json();
          })
        ]);
        yahooResult = rYahoo;
        sarbResult = rSarb;
      } catch(fetchErr) {
        yahooResult = { status: 'rejected', reason: fetchErr };
        sarbResult = { status: 'rejected', reason: fetchErr };
      }
      setProgress('Processing market data…');

      /* ── Yahoo Finance ── */
      let quotes = {};
      if (yahooResult.status === 'fulfilled') {
        quotes = yahooResult.value?.quotes ?? {};
        const count = Object.keys(quotes).length;
        if (count === 0) {
          console.warn('[useMarketData] Yahoo returned zero quotes');
        } else {
          console.log(`[useMarketData] Yahoo: ${count} quotes received`);
        }
      } else {
        console.error('[useMarketData] Yahoo failed:', yahooResult.reason?.message);
      }

      /* ── SARB Bond Yield ── */
      let bond = null;
      if (sarbResult.status === 'fulfilled') {
        bond = sarbResult.value?.bond ?? null;
      } else {
        console.error('[useMarketData] SARB/FRED failed:', sarbResult.reason?.message);
      }

      /* If Yahoo failed completely, throw */
      if (Object.keys(quotes).length === 0) {
        throw new Error(
          yahooResult.reason?.message
          ?? yahooResult.value?.error
          ?? 'Yahoo Finance fetch failed — check Vercel function logs'
        );
      }

      /* Apply to state */
      const emptyA = makeEmptyAssets();
      const emptyS = makeEmptyStocks();
      const { assets: a, stocks: s } = applyQuotes(quotes, emptyA, emptyS);

      if (bond && bond.price != null) {
        a.r2035 = { ...a.r2035, ...bond, isLive: true };
      }

      setAssets(a);
      setStocks(s);
      setStatus('live');
      setLastFetch(new Date());
      setError(null);
      setProgress('');
      lastFetchTs.current = Date.now();

      saveCache(quotes, bond);
      return { success: true, assets: a, stocks: s };

    } catch (e) {
      if (e.name === 'AbortError') return { success: false };
      const msg = e.message || 'Unknown fetch error';
      console.error('[useMarketData]', msg);
      if (!silent) { setError(msg); setStatus('error'); }
      setProgress('');
      return { success: false, error: msg };
    }
  }, []);  // no deps needed — uses refs for env and abort

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

  return { assets, stocks, status, error, lastFetch, progress, fetchLive, initFromCache, env,
           clearError: () => { setError(null); setStatus('empty'); } };
}
