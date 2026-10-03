import { SECTOR_ORDER } from '../data/stocks.js';

/**
 * Equal-weight sector averages from live stocks. `top40` holds the watchlist average
 * (the real Top 40 is assets.jseTop40); `rel` is each sector's move minus that average.
 */
export function deriveSectors(stocks) {
  const live = stocks.filter(s => s.isLive && s.changePct != null);
  const sectors = {};

  for (const sector of SECTOR_ORDER) {
    const ss = live.filter(s => s.sector === sector);
    if (!ss.length) continue;
    const avg = ss.reduce((a, s) => a + s.changePct, 0) / ss.length;
    sectors[sector] = { name: sector, chg: +avg.toFixed(2), rel: null };
  }

  if (live.length > 0) {
    const mktAvg = live.reduce((a, s) => a + s.changePct, 0) / live.length;
    sectors.top40 = { name: 'Watchlist average', chg: +mktAvg.toFixed(2), rel: 0 };
    for (const key of Object.keys(sectors)) {
      if (key !== 'top40') {
        sectors[key].rel = +(sectors[key].chg - mktAvg).toFixed(2);
      }
    }
  } else {
    sectors.top40 = { name: 'Watchlist average', chg: null, rel: 0 };
  }

  return sectors;
}
