/**
 * CIS time-series helpers: rebuilding a daily CIS from historical closes,
 * weekly crisis trajectories, a simple forward-return backtest, and merging
 * the browser's and the server's stored readings.
 *
 * Pure functions only, so the serverless backfill and the UI share them and
 * tests/ can cover them without the network.
 */
import { JSE_STOCKS, MACRO_SYMBOLS } from '../data/stocks.js';
import { deriveSectors } from './sectors.js';
import { buildCISInput } from './cisInput.js';
import { computeCIS } from './scoring.js';

const DAY = 86_400_000;
const MAX_DAILY_MOVE = 40;   // % — bigger one-day moves are treated as bad ticks
const MAX_STALE_DAYS = 4;    // a close older than this is not used for a session

const toDayMs = date => Date.parse(`${date}T00:00:00Z`);

/* Index of the last bar dated on or before `date`, or -1. Bars are sorted. */
function lastAtOrBefore(bars, date) {
  let lo = 0, hi = bars.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].date <= date) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return found;
}

/* % change of a symbol from session `prev` to session `date`, or null. */
function sessionChange(bars, date, prev, isJse) {
  if (!bars || bars.length < 2) return null;
  const a = lastAtOrBefore(bars, date);
  const b = lastAtOrBefore(bars, prev);
  if (a < 0 || b < 0) return null;
  if ((toDayMs(date) - toDayMs(bars[a].date)) / DAY > MAX_STALE_DAYS) return null;
  // A JSE share with no bar for a JSE session is missing data, not a flat day.
  if (a === b) return isJse ? null : 0;
  const chg = (bars[a].close / bars[b].close - 1) * 100;
  if (!Number.isFinite(chg) || Math.abs(chg) > MAX_DAILY_MOVE) return null;
  return chg;
}

/**
 * Daily CIS rebuilt from daily closes, one row per JSE session.
 * @param barsBySymbol { [yahooSymbol]: [{ date: 'YYYY-MM-DD', close }] } sorted by date
 * @returns [{ date, cis, regimeClass, close }] where close is the Top 40 (STX40) close
 */
export function computeDailyCISSeries(barsBySymbol) {
  const top40Bars = barsBySymbol[MACRO_SYMBOLS.jseTop40.symbol] || [];
  let calendar = top40Bars.map(b => b.date);
  if (calendar.length < 2) {
    const dates = new Set();
    for (const s of JSE_STOCKS) for (const b of barsBySymbol[s.ticker] || []) dates.add(b.date);
    calendar = [...dates].sort();
  }

  const out = [];
  for (let i = 1; i < calendar.length; i++) {
    const date = calendar[i];
    const prev = calendar[i - 1];

    const assets = {};
    for (const [key, meta] of Object.entries(MACRO_SYMBOLS)) {
      const chg = sessionChange(barsBySymbol[meta.symbol], date, prev, meta.symbol.endsWith('.JO'));
      assets[key] = { changePct: chg, isLive: chg != null };
    }
    const stocks = JSE_STOCKS.map(s => {
      const chg = sessionChange(barsBySymbol[s.ticker], date, prev, true);
      return { sector: s.sector, changePct: chg, isLive: chg != null };
    });
    if (!assets.jseTop40.isLive && !stocks.some(s => s.isLive)) continue;

    const cis = computeCIS(buildCISInput(assets, deriveSectors(stocks)));
    const t = lastAtOrBefore(top40Bars, date);
    const close = t >= 0 && top40Bars[t].date === date ? top40Bars[t].close : null;
    out.push({ date, cis: cis.total, regimeClass: cis.regimeClass, close });
  }
  return out;
}

/**
 * Weekly average CIS from a start date. Week 0 is the 7 days starting on `startDate`.
 * Points carry either `ts` (ms) or `date` ('YYYY-MM-DD') plus `cis`.
 */
export function weeklyTrajectory(points, startDate, weeks) {
  const start = toDayMs(startDate);
  const sums = new Map();
  for (const p of points || []) {
    const t = p.ts ?? toDayMs(p.date);
    if (!Number.isFinite(t) || !Number.isFinite(p.cis)) continue;
    const week = Math.floor((t - start) / (7 * DAY));
    if (week < 0 || week >= weeks) continue;
    const acc = sums.get(week) ?? { sum: 0, n: 0 };
    acc.sum += p.cis;
    acc.n += 1;
    sums.set(week, acc);
  }
  return [...sums.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, { sum, n }]) => ({ week, cis: +(sum / n).toFixed(1), n }));
}

/** Rows of { week, [id]: avgCis } for charting several trajectories together. */
export function combineTrajectories(trajectories, weeks) {
  const rows = Array.from({ length: weeks }, (_, week) => ({ week }));
  for (const [id, points] of Object.entries(trajectories)) {
    for (const { week, cis } of points) if (rows[week]) rows[week][id] = cis;
  }
  return rows;
}

function pearson(a, b) {
  const n = a.length;
  if (n < 2) return null;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  const den = Math.sqrt(va * vb);
  return den === 0 ? null : num / den;
}

const avg = xs => xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;

/**
 * Does today's CIS line up with the Top 40's move over the next `horizon` sessions?
 * @param series daily [{ cis, close }] in date order
 */
export function backtestCIS(series, horizon) {
  const cis = [], fwd = [];
  for (let i = 0; i + horizon < series.length; i++) {
    const c0 = series[i].close, c1 = series[i + horizon].close;
    if (!Number.isFinite(c0) || !Number.isFinite(c1) || c0 <= 0 || !Number.isFinite(series[i].cis)) continue;
    cis.push(series[i].cis);
    fwd.push((c1 / c0 - 1) * 100);
  }

  const bucket = test => {
    const xs = fwd.filter((_, i) => test(cis[i]));
    const mean = avg(xs);
    return { n: xs.length, avgReturn: mean == null ? null : +mean.toFixed(2) };
  };
  const signalled = cis.map((c, i) => [c, fwd[i]]).filter(([c]) => Math.abs(c) > 15);
  const hits = signalled.filter(([c, f]) => Math.sign(c) === Math.sign(f)).length;
  const r = pearson(cis, fwd);

  return {
    horizon,
    n: cis.length,
    correlation: r == null ? null : +r.toFixed(3),
    hitRate: signalled.length ? +(hits / signalled.length * 100).toFixed(1) : null,
    signals: signalled.length,
    bearish: bucket(c => c <= -15),
    neutral: bucket(c => c > -15 && c <= 15),
    bullish: bucket(c => c > 15),
    baseline: (() => { const m = avg(fwd); return m == null ? null : +m.toFixed(2); })(),
  };
}

/** SAST calendar date of a timestamp. */
export function sastDate(ts) {
  return new Date(ts + 2 * 3_600_000).toISOString().slice(0, 10);
}

/** Last stored reading per SAST day that carries a Top 40 price → [{ date, cis, close }]. */
export function readingsToDaily(readings) {
  const byDay = new Map();
  for (const r of [...(readings || [])].sort((a, b) => a.ts - b.ts)) {
    if (!Number.isFinite(r.top40)) continue;
    byDay.set(sastDate(r.ts), { date: sastDate(r.ts), cis: r.total, close: r.top40 });
  }
  return [...byDay.values()];
}

/** Merge readings from several sources, sorted, dropping near-duplicates (< 60 s apart). */
export function mergeReadings(...lists) {
  const all = lists.flat().filter(r => r && Number.isFinite(r.ts) && Number.isFinite(r.total));
  all.sort((a, b) => a.ts - b.ts);
  const out = [];
  for (const r of all) {
    const last = out[out.length - 1];
    if (last && r.ts - last.ts < 60_000) continue;
    out.push(r);
  }
  return out;
}

/** Evenly thin a series to at most `max` points, always keeping the latest. */
export function downsample(points, max) {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}
