/**
 * Scenario simulator maths: the linear sector/stock sensitivities used by the
 * Macro Transmission simulator, and a Scenario CIS that layers a shock on top
 * of today's live CIS inputs.
 */
import { computeCIS } from './scoring.js';

// Regression coefficients: JSE sector sensitivity to:
// 1. Brent delta ($ vs $75 base)
// 2. ZAR Shock (% Rand depreciation)
// 3. Gold Shock (% Gold appreciation)
export const BASE_BRENT = 75;
export const SECTORS = [
  { name: 'Energy / Sasol',   brentSlope: +0.082, zarSlope: +0.25, goldSlope: 0.00 },
  { name: 'Coal Exporters',   brentSlope: +0.058, zarSlope: +0.20, goldSlope: 0.00 },
  { name: 'Gold Miners',      brentSlope: +0.018, zarSlope: +0.35, goldSlope: +0.80 },
  { name: 'PGM Miners',       brentSlope: +0.012, zarSlope: +0.30, goldSlope: +0.30 },
  { name: 'Watchlist average', brentSlope: -0.041, zarSlope: +0.12, goldSlope: +0.05 },
  { name: 'Banks',            brentSlope: -0.056, zarSlope: -0.35, goldSlope: -0.05 },
  { name: 'Retailers',        brentSlope: -0.068, zarSlope: -0.40, goldSlope: -0.05 },
  { name: 'Consumer Staples', brentSlope: -0.040, zarSlope: -0.20, goldSlope: 0.00 },
  { name: 'Insurers',         brentSlope: -0.045, zarSlope: -0.25, goldSlope: 0.00 },
  { name: 'Property',         brentSlope: -0.060, zarSlope: -0.45, goldSlope: 0.00 },
  { name: 'Industrials',      brentSlope: -0.032, zarSlope: -0.15, goldSlope: 0.00 },
];

export function getStockSlopes(stock) {
  // Coal exporters
  if (stock.display === 'EXX' || stock.display === 'TGA') {
    return { brent: 0.058, zar: 0.20, gold: 0 };
  }
  // Sasol
  if (stock.display === 'SOL') {
    return { brent: 0.082, zar: 0.25, gold: 0 };
  }
  // Gold miners (GFI, ANG, SSW)
  if (stock.sector === 'Gold Miners') {
    return { brent: 0.018, zar: 0.35, gold: stock.display === 'SSW' ? 0.40 : 0.85 };
  }
  // PGM Miners (IMP, VAL, NPH, SSW)
  if (stock.sector === 'PGMs') {
    return { brent: 0.012, zar: 0.30, gold: 0.30 };
  }
  // Banks
  if (stock.sector === 'Banks') {
    return { brent: -0.056, zar: -0.35, gold: 0 };
  }
  // Retailers
  if (stock.sector === 'Retailers') {
    return { brent: -0.068, zar: -0.40, gold: 0 };
  }
  // BAT: offshore earner, behaves like a rand hedge
  if (stock.display === 'BTI') {
    return { brent: -0.010, zar: 0.25, gold: 0 };
  }
  if (stock.sector === 'Consumer Staples') {
    return { brent: -0.040, zar: -0.20, gold: 0 };
  }
  if (stock.sector === 'Insurers') {
    return { brent: -0.045, zar: -0.25, gold: 0 };
  }
  if (stock.sector === 'Property') {
    return { brent: -0.060, zar: -0.45, gold: 0 };
  }
  // Industrials (NPN, PRX, CFR, AGL, MTN)
  if (stock.sector === 'Industrials' || stock.sector === 'Telecoms') {
    return { brent: -0.032, zar: -0.15, gold: 0 };
  }
  // Default JSE Top40 / Miners
  return { brent: -0.041, zar: 0.12, gold: 0.05 };
}

/** Estimated % move for a set of slopes under a shock. */
export function shockImpact(slopes, { deltaBrent = 0, zar = 0, gold = 0 }) {
  return slopes.brentSlope * deltaBrent + slopes.zarSlope * zar + slopes.goldSlope * gold;
}

const SECTOR_INPUTS = {
  minersChg:      'Gold Miners',
  energyChg:      'Energy / Sasol',
  banksChg:       'Banks',
  retailersChg:   'Retailers',
  industrialsChg: 'Industrials',
  top40Chg:       'Watchlist average',
};

/**
 * CIS inputs with a shock applied as an extra one-day move on top of today's
 * readings. `brent` is the slider's $/bbl level; the shock is its distance from
 * `livePrice` (or BASE_BRENT when no live price is known).
 */
export function scenarioCISInput(liveInput, { brent, livePrice, zar = 0, gold = 0 }) {
  const ref = livePrice || BASE_BRENT;
  const deltaBrent = (brent ?? ref) - ref;
  const shock = { deltaBrent, zar, gold };
  const out = { ...liveInput };
  out.brentChg  = (liveInput.brentChg  ?? 0) + (deltaBrent / ref) * 100;
  out.usdZarChg = (liveInput.usdZarChg ?? 0) + zar;
  out.goldChg   = (liveInput.goldChg   ?? 0) + gold;
  for (const [key, name] of Object.entries(SECTOR_INPUTS)) {
    const slopes = SECTORS.find(s => s.name === name);
    out[key] = (liveInput[key] ?? 0) + shockImpact(slopes, shock);
  }
  return out;
}

export function computeScenarioCIS(liveInput, shock) {
  return computeCIS(scenarioCISInput(liveInput, shock));
}
