// ─── Macro / commodity symbols (Yahoo Finance) ────────────────────────────
// Icons are now rendered via the SVG library in components/Icons.jsx,
// keyed off the object key below. No emoji strings.
export const MACRO_SYMBOLS = {
  brent:     { symbol: 'BZ=F',     name: 'Brent Crude',       unit: '$/bbl', invert: false },
  gold:      { symbol: 'GC=F',     name: 'Gold',              unit: '$/oz',  invert: false },
  platinum:  { symbol: 'PL=F',     name: 'Platinum',          unit: '$/oz',  invert: false },
  palladium: { symbol: 'PA=F',     name: 'Palladium',         unit: '$/oz',  invert: false },
  usdZar:    { symbol: 'USDZAR=X', name: 'USD/ZAR',           unit: 'ZAR',   invert: true  },
  coal:      { symbol: 'MTF=F',    name: 'Coal Futures',      unit: '$/t',   invert: false },
  us10y:     { symbol: '^TNX',     name: 'US 10-Year Bond Yield', unit: '%',   invert: true  },
};

// ─── JSE Stock Universe ───────────────────────────────────────────────────
export const JSE_STOCKS = [
  // Gold Miners
  { name:'Gold Fields',         ticker:'GFI.JO', display:'GFI', sector:'Gold Miners', mktcap:'R83B',   pe:18.4, sensitivity:'Haven Beta',          sensType:'bull' },
  { name:'AngloGold Ashanti',   ticker:'ANG.JO', display:'ANG', sector:'Gold Miners', mktcap:'R92B',   pe:21.2, sensitivity:'Haven Beta',          sensType:'bull' },
  { name:'DRDGOLD',             ticker:'DRD.JO', display:'DRD', sector:'Gold Miners', mktcap:'R7.2B',  pe:12.4, sensitivity:'Haven Beta',          sensType:'bull' },
  { name:'Pan African Res.',    ticker:'PAN.JO', display:'PAN', sector:'Gold Miners', mktcap:'R6.8B',  pe:10.2, sensitivity:'Haven Beta',          sensType:'bull' },
  // PGMs
  { name:'Impala Platinum',     ticker:'IMP.JO', display:'IMP', sector:'PGMs',        mktcap:'R30B',   pe:8.2,  sensitivity:'PGM Beta',            sensType:'bull' },
  { name:'Anglo Am. Platinum',  ticker:'AMS.JO', display:'AMS', sector:'PGMs',        mktcap:'R116B',  pe:15.4, sensitivity:'PGM Beta',            sensType:'bull' },
  { name:'Northam Platinum',    ticker:'NPH.JO', display:'NPH', sector:'PGMs',        mktcap:'R34B',   pe:11.2, sensitivity:'PGM Beta',            sensType:'bull' },
  { name:'Sibanye-Stillwater',  ticker:'SSW.JO', display:'SSW', sector:'PGMs',        mktcap:'R36B',   pe:7.8,  sensitivity:'PGM Beta',            sensType:'bull' },
  // Energy
  { name:'Sasol',               ticker:'SOL.JO', display:'SOL', sector:'Energy',      mktcap:'R113B',  pe:7.4,  sensitivity:'Oil Tailwind',        sensType:'bull' },
  { name:'Exxaro Resources',    ticker:'EXX.JO', display:'EXX', sector:'Energy',      mktcap:'R68B',   pe:6.8,  sensitivity:'Coal / Energy',       sensType:'bull' },
  { name:'Thungela Resources',  ticker:'TGA.JO', display:'TGA', sector:'Energy',      mktcap:'R12B',   pe:4.2,  sensitivity:'Coal Export',         sensType:'bull' },
  // Banks
  { name:'FirstRand',           ticker:'FSR.JO', display:'FSR', sector:'Banks',       mktcap:'R183B',  pe:10.8, sensitivity:'Domestic / Rates',    sensType:'bear' },
  { name:'Standard Bank',       ticker:'SBK.JO', display:'SBK', sector:'Banks',       mktcap:'R372B',  pe:9.4,  sensitivity:'Domestic / Rates',    sensType:'bear' },
  { name:'Capitec',             ticker:'CPI.JO', display:'CPI', sector:'Banks',       mktcap:'R243B',  pe:24.2, sensitivity:'Domestic / Rates',    sensType:'bear' },
  { name:'Absa Group',          ticker:'ABG.JO', display:'ABG', sector:'Banks',       mktcap:'R98B',   pe:8.8,  sensitivity:'Domestic / Rates',    sensType:'bear' },
  { name:'Nedbank',             ticker:'NED.JO', display:'NED', sector:'Banks',       mktcap:'R124B',  pe:9.2,  sensitivity:'Domestic / Rates',    sensType:'bear' },
  // Retailers
  { name:'Shoprite',            ticker:'SHP.JO', display:'SHP', sector:'Retailers',   mktcap:'R163B',  pe:22.4, sensitivity:'Domestic Cyclical',   sensType:'bear' },
  { name:'Woolworths',          ticker:'WHL.JO', display:'WHL', sector:'Retailers',   mktcap:'R66B',   pe:14.8, sensitivity:'Domestic Cyclical',   sensType:'bear' },
  { name:'Pepkor',              ticker:'PPH.JO', display:'PPH', sector:'Retailers',   mktcap:'R73B',   pe:16.2, sensitivity:'Domestic Cyclical',   sensType:'bear' },
  { name:'TFG',                 ticker:'TFG.JO', display:'TFG', sector:'Retailers',   mktcap:'R30B',   pe:11.4, sensitivity:'Domestic Cyclical',   sensType:'bear' },
  { name:'Mr Price',            ticker:'MRP.JO', display:'MRP', sector:'Retailers',   mktcap:'R47B',   pe:14.8, sensitivity:'Domestic Cyclical',   sensType:'bear' },
  { name:'Clicks',              ticker:'CLS.JO', display:'CLS', sector:'Retailers',   mktcap:'R53B',   pe:26.4, sensitivity:'Domestic Defensive',  sensType:'bear' },
  { name:'Dis-Chem',            ticker:'DCP.JO', display:'DCP', sector:'Retailers',   mktcap:'R30B',   pe:22.8, sensitivity:'Domestic Defensive',  sensType:'bear' },
  // Industrials & Offshore Rand Hedges
  { name:'Naspers',             ticker:'NPN.JO', display:'NPN', sector:'Industrials', mktcap:'R1.42T', pe:28.4, sensitivity:'Rand Hedge / Global', sensType:'warn' },
  { name:'Prosus',              ticker:'PRX.JO', display:'PRX', sector:'Industrials', mktcap:'R892B',  pe:31.2, sensitivity:'Rand Hedge / Global', sensType:'warn' },
  { name:'Richemont',           ticker:'CFR.JO', display:'CFR', sector:'Industrials', mktcap:'R778B',  pe:22.1, sensitivity:'Rand Hedge / Luxury', sensType:'warn' },
  { name:'Anglo American',      ticker:'AGL.JO', display:'AGL', sector:'Mining',      mktcap:'R312B',  pe:14.2, sensitivity:'Global Commodity',    sensType:'warn' },
  { name:'BHP',                 ticker:'BHG.JO', display:'BHG', sector:'Mining',      mktcap:'R271B',  pe:12.8, sensitivity:'Global Commodity',    sensType:'warn' },
  { name:'Bidvest',             ticker:'BVT.JO', display:'BVT', sector:'Industrials', mktcap:'R67B',   pe:11.8, sensitivity:'Domestic Industrial', sensType:'bear' },
  { name:'Barloworld',          ticker:'BAW.JO', display:'BAW', sector:'Industrials', mktcap:'R16B',   pe:9.4,  sensitivity:'Domestic Industrial', sensType:'bear' },
  { name:'Reunert',             ticker:'RLO.JO', display:'RLO', sector:'Industrials', mktcap:'R9.8B',  pe:12.2, sensitivity:'Domestic Industrial', sensType:'bear' },
  // Telecoms
  { name:'MTN Group',           ticker:'MTN.JO', display:'MTN', sector:'Telecoms',    mktcap:'R166B',  pe:14.1, sensitivity:'EM / FX Exposure',    sensType:'warn' },
  { name:'Vodacom',             ticker:'VOD.JO', display:'VOD', sector:'Telecoms',    mktcap:'R87B',   pe:16.2, sensitivity:'Defensive Yield',     sensType:'neutral' },
];

export const ALL_YAHOO_SYMBOLS = [
  ...Object.values(MACRO_SYMBOLS).map(m => m.symbol),
  ...JSE_STOCKS.map(s => s.ticker),
];

export const SECTOR_ORDER = [
  'Gold Miners','PGMs','Energy','Banks','Retailers','Industrials','Mining','Telecoms',
];
