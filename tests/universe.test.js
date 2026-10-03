import test from 'node:test';
import assert from 'node:assert/strict';
import { JSE_STOCKS, SECTOR_ORDER, ALL_YAHOO_SYMBOLS, MACRO_SYMBOLS } from '../src/data/stocks.js';
import { deriveSectors } from '../src/utils/sectors.js';

test('every stock belongs to a sector the UI lists', () => {
  for (const stock of JSE_STOCKS) {
    assert.ok(SECTOR_ORDER.includes(stock.sector), `${stock.display}: unknown sector "${stock.sector}"`);
  }
});

test('every listed sector has at least one stock', () => {
  for (const sector of SECTOR_ORDER) {
    assert.ok(JSE_STOCKS.some(s => s.sector === sector), `${sector} has no stocks`);
  }
});

test('tickers are unique JSE symbols and display codes match', () => {
  const tickers = JSE_STOCKS.map(s => s.ticker);
  assert.equal(new Set(tickers).size, tickers.length, 'duplicate ticker');
  for (const s of JSE_STOCKS) {
    assert.match(s.ticker, /^[A-Z0-9]+\.JO$/);
    assert.equal(s.ticker, `${s.display}.JO`);
  }
});

test('the Yahoo request list covers every stock, macro asset and the Top 40 benchmark', () => {
  for (const s of JSE_STOCKS) assert.ok(ALL_YAHOO_SYMBOLS.includes(s.ticker));
  for (const m of Object.values(MACRO_SYMBOLS)) assert.ok(ALL_YAHOO_SYMBOLS.includes(m.symbol));
  assert.ok(ALL_YAHOO_SYMBOLS.includes('STX40.JO'));
});

test('deriveSectors averages live names only and measures sectors against the watchlist', () => {
  const stocks = [
    { sector: 'Banks', isLive: true, changePct: -2 },
    { sector: 'Banks', isLive: true, changePct: -1 },
    { sector: 'Banks', isLive: false, changePct: 9 },     // not live: ignored
    { sector: 'Gold Miners', isLive: true, changePct: 3 },
    { sector: 'Gold Miners', isLive: true, changePct: null }, // no price: ignored
  ];
  const sectors = deriveSectors(stocks);
  assert.equal(sectors.Banks.chg, -1.5);
  assert.equal(sectors['Gold Miners'].chg, 3);
  assert.equal(sectors.top40.chg, 0);                    // (-2 - 1 + 3) / 3
  assert.equal(sectors.Banks.rel, -1.5);
  assert.equal(sectors['Gold Miners'].rel, 3);
  assert.equal(sectors.Energy, undefined);               // no live names: no entry
});

test('deriveSectors with no live data leaves the market average empty', () => {
  const sectors = deriveSectors([{ sector: 'Banks', isLive: false, changePct: 1 }]);
  assert.equal(sectors.top40.chg, null);
});
