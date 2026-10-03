const CACHE_KEY = 'jse_morning_note_v2';

export function morningNoteSignature({ assets, sectors, cis, stocks, alerts, dataHealth }) {
  if (!dataHealth?.lastFetch) return null;

  return JSON.stringify({
    snapshotAt: dataHealth.lastFetch,
    assets: Object.entries(assets ?? {}).map(([key, asset]) => [
      key, asset?.price ?? null, asset?.changePct ?? null, asset?.source ?? null,
    ]),
    sectors: Object.entries(sectors ?? {}).map(([key, sector]) => [key, sector?.chg ?? null]),
    cis: [
      cis?.total ?? null, cis?.regime ?? null,
      cis?.components?.macro?.score ?? null,
      cis?.components?.jse?.score ?? null,
      cis?.components?.conf?.score ?? null,
    ],
    stocks: (stocks ?? []).map(stock => [
      stock.ticker, stock.display, stock.sector, stock.isLive,
      stock.price ?? null, stock.changePct ?? null,
    ]),
    alerts: (alerts ?? []).map(alert => [alert.lvl, alert.label, alert.text]),
    health: [
      dataHealth.quoteCoverage ?? null,
      dataHealth.liveStocks ?? null,
      dataHealth.totalStocks ?? null,
      dataHealth.market?.label ?? null,
    ],
  });
}

export function loadMorningNote(storage, signature) {
  if (!signature) return null;
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.signature !== signature || typeof cached.note !== 'string') return null;
    return cached;
  } catch { return null; }
}

export function saveMorningNote(storage, entry) {
  try { storage.setItem(CACHE_KEY, JSON.stringify(entry)); } catch { /* storage unavailable */ }
}
