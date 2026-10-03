import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAlerts } from '../src/utils/alerts.js';
import { buildDataHealth } from '../src/utils/dataQuality.js';
import { chipMove } from '../src/utils/transmission.js';
import { JSE_STOCKS, MACRO_SYMBOLS } from '../src/data/stocks.js';

const marketAlert = alerts => alerts.find(a => a.id === 'top40-red' || a.id === 'top40-amber');

test('market alerts use the live Top 40 benchmark when available', () => {
  const alerts = computeAlerts({
    assets: { jseTop40: { isLive: true, changePct: -2.5 } },
    sectors: { top40: { chg: 0.4 } },
    stocks: [],
  });
  assert.equal(marketAlert(alerts)?.id, 'top40-red');
});

test('market alerts fall back to the watchlist average without a live benchmark', () => {
  const alerts = computeAlerts({
    assets: { jseTop40: { isLive: false, changePct: -2.5 } },
    sectors: { top40: { chg: -1.2 } },
    stocks: [],
  });
  assert.equal(marketAlert(alerts)?.id, 'top40-amber');
});

function liveAssets({ withTop40 }) {
  return Object.fromEntries(Object.entries(MACRO_SYMBOLS).map(([key, meta]) => [
    key,
    key === 'jseTop40' && !withTop40
      ? { ...meta, price: null, isLive: false }
      : { ...meta, price: 100, changePct: 0, isLive: true },
  ]));
}
const liveStocks = JSE_STOCKS.map(s => ({ ...s, price: 100, changePct: 0, isLive: true }));

test('quote coverage reaches 100% only when the Top 40 benchmark is live too', () => {
  const full = buildDataHealth({ assets: liveAssets({ withTop40: true }), stocks: liveStocks, status: 'live' });
  const partial = buildDataHealth({ assets: liveAssets({ withTop40: false }), stocks: liveStocks, status: 'live' });
  assert.equal(full.quoteCoverage, 100);
  assert.ok(partial.quoteCoverage < 100);
  assert.ok(partial.failedMacro.length === 1);
});

const stock = (display, changePct, isLive = true) => ({ display, changePct, isLive });

test('chipMove averages every ticker named in the chip', () => {
  const stocks = [stock('SBK', -2), stock('FSR', -1), stock('NED', 0), stock('ABG', 1)];
  const move = chipMove('Banks (SBK, FSR, NED, ABG) · NII Stress', stocks);
  assert.equal(move.avg, -0.5);
  assert.match(move.detail, /SBK -2\.00%/);
});

test('chipMove reads several parentheses and slash-separated tickers', () => {
  const stocks = [stock('MRP', -1), stock('TRU', -3), stock('NPN', 2), stock('PRX', 4)];
  assert.equal(chipMove('Mr Price (MRP) & Truworths (TRU)', stocks).avg, -2);
  assert.equal(chipMove('Naspers / Prosus (NPN/PRX)', stocks).avg, 3);
});

test('chipMove ignores untracked or unpriced names and returns null with no match', () => {
  const stocks = [stock('GRT', -1), stock('RDF', 5, false)];
  assert.equal(chipMove('Listed Property / REITs (GRT, RDF, XYZ)', stocks).avg, -1);
  assert.equal(chipMove('Offshore Exporters', stocks), null);
  assert.equal(chipMove('Something (XYZ)', stocks), null);
});
