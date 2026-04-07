// ─── Macro / commodity symbols (Yahoo Finance) ────────────────────────────
export const MACRO_SYMBOLS = {
  brent:     { symbol: 'BZ=F',     name: 'Brent Crude',  unit: '$/bbl', icon: '🛢️', invert: false },
  gold:      { symbol: 'GC=F',     name: 'Gold',         unit: '$/oz',  icon: '🥇', invert: false },
  platinum:  { symbol: 'PL=F',     name: 'Platinum',     unit: '$/oz',  icon: '💎', invert: false },
  palladium: { symbol: 'PA=F',     name: 'Palladium',    unit: '$/oz',  icon: '⚗️', invert: false },
  usdZar:    { symbol: 'USDZAR=X', name: 'USD/ZAR',      unit: 'ZAR',   icon: '💱', invert: true  },
  coal:      { symbol: 'MTF=F',    name: 'Coal Futures', unit: '$/t',   icon: '⛏️', invert: false },
  // SA 10Y govt bond yield — fetched via Yahoo Finance ^ZA10Y alongside all other symbols
  r2035:     { symbol: '^ZA10Y',   name: 'SA 10Y Bond Yield', unit: '%', icon: '🏛️', invert: true },
};

// R2035/SA10Y bond metadata
export const R2035_META = {
  key:    'r2035',
  name:   'R2035 Bond Yield',
  detail: 'SA 10Y Govt Bond (Yahoo ^ZA10Y)',
  unit:   '%',
  icon:   '🏛️',
  invert: true, // Rising yield = bearish for JSE (tighter conditions)
  isin:   'ZAG000149952',
};

// ─── JSE Stock Universe ───────────────────────────────────────────────────
export const JSE_STOCKS = [
  // Gold Miners
  { name:'Gold Fields',         ticker:'GFI.JO', display:'GFI', sector:'Gold Miners', mktcap:'R83B',   pe:18.4 },
  { name:'AngloGold Ashanti',   ticker:'ANG.JO', display:'ANG', sector:'Gold Miners', mktcap:'R92B',   pe:21.2 },
  { name:'DRDGOLD',             ticker:'DRD.JO', display:'DRD', sector:'Gold Miners', mktcap:'R7.2B',  pe:12.4 },
  { name:'Pan African Res.',    ticker:'PAN.JO', display:'PAN', sector:'Gold Miners', mktcap:'R6.8B',  pe:10.2 },
  // PGMs
  { name:'Impala Platinum',     ticker:'IMP.JO', display:'IMP', sector:'PGMs',        mktcap:'R30B',   pe:8.2  },
  { name:'Anglo Am. Platinum',  ticker:'AMS.JO', display:'AMS', sector:'PGMs',        mktcap:'R116B',  pe:15.4 },
  { name:'Northam Platinum',    ticker:'NPH.JO', display:'NPH', sector:'PGMs',        mktcap:'R34B',   pe:11.2 },
  { name:'Sibanye-Stillwater',  ticker:'SSW.JO', display:'SSW', sector:'PGMs',        mktcap:'R36B',   pe:7.8  },
  // Energy
  { name:'Sasol',               ticker:'SOL.JO', display:'SOL', sector:'Energy',      mktcap:'R113B',  pe:7.4  },
  { name:'Exxaro Resources',    ticker:'EXX.JO', display:'EXX', sector:'Energy',      mktcap:'R68B',   pe:6.8  },
  { name:'Thungela Resources',  ticker:'TGA.JO', display:'TGA', sector:'Energy',      mktcap:'R12B',   pe:4.2  },
  // Banks
  { name:'FirstRand',           ticker:'FSR.JO', display:'FSR', sector:'Banks',       mktcap:'R183B',  pe:10.8 },
  { name:'Standard Bank',       ticker:'SBK.JO', display:'SBK', sector:'Banks',       mktcap:'R372B',  pe:9.4  },
  { name:'Capitec',             ticker:'CPI.JO', display:'CPI', sector:'Banks',       mktcap:'R243B',  pe:24.2 },
  { name:'Absa Group',          ticker:'ABG.JO', display:'ABG', sector:'Banks',       mktcap:'R98B',   pe:8.8  },
  { name:'Nedbank',             ticker:'NED.JO', display:'NED', sector:'Banks',       mktcap:'R124B',  pe:9.2  },
  // Retailers
  { name:'Shoprite',            ticker:'SHP.JO', display:'SHP', sector:'Retailers',   mktcap:'R163B',  pe:22.4 },
  { name:'Woolworths',          ticker:'WHL.JO', display:'WHL', sector:'Retailers',   mktcap:'R66B',   pe:14.8 },
  { name:'Pepkor',              ticker:'PPH.JO', display:'PPH', sector:'Retailers',   mktcap:'R73B',   pe:16.2 },
  { name:'TFG',                 ticker:'TFG.JO', display:'TFG', sector:'Retailers',   mktcap:'R30B',   pe:11.4 },
  { name:'Mr Price',            ticker:'MRP.JO', display:'MRP', sector:'Retailers',   mktcap:'R47B',   pe:14.8 },
  { name:'Clicks',              ticker:'CLS.JO', display:'CLS', sector:'Retailers',   mktcap:'R53B',   pe:26.4 },
  { name:'Dis-Chem',            ticker:'DCP.JO', display:'DCP', sector:'Retailers',   mktcap:'R30B',   pe:22.8 },
  // Industrials
  { name:'Naspers',             ticker:'NPN.JO', display:'NPN', sector:'Industrials', mktcap:'R1.42T', pe:28.4 },
  { name:'Prosus',              ticker:'PRX.JO', display:'PRX', sector:'Industrials', mktcap:'R892B',  pe:31.2 },
  { name:'Richemont',           ticker:'CFR.JO', display:'CFR', sector:'Industrials', mktcap:'R778B',  pe:22.1 },
  { name:'Anglo American',      ticker:'AGL.JO', display:'AGL', sector:'Mining',      mktcap:'R312B',  pe:14.2 },
  { name:'BHP',                 ticker:'BHG.JO', display:'BHG', sector:'Mining',      mktcap:'R271B',  pe:12.8 },
  { name:'Bidvest',             ticker:'BVT.JO', display:'BVT', sector:'Industrials', mktcap:'R67B',   pe:11.8 },
  { name:'Barloworld',          ticker:'BAW.JO', display:'BAW', sector:'Industrials', mktcap:'R16B',   pe:9.4  },
  { name:'Reunert',             ticker:'RLO.JO', display:'RLO', sector:'Industrials', mktcap:'R9.8B',  pe:12.2 },
  // Telecoms
  { name:'MTN Group',           ticker:'MTN.JO', display:'MTN', sector:'Telecoms',    mktcap:'R166B',  pe:14.1 },
  { name:'Vodacom',             ticker:'VOD.JO', display:'VOD', sector:'Telecoms',    mktcap:'R87B',   pe:16.2 },
];

export const ALL_YAHOO_SYMBOLS = [
  ...Object.values(MACRO_SYMBOLS).map(m => m.symbol),
  ...JSE_STOCKS.map(s => s.ticker),
];

export const SECTOR_ORDER = [
  'Gold Miners','PGMs','Energy','Banks','Retailers','Industrials','Mining','Telecoms',
];
