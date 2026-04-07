import React from 'react';
import clsx from 'clsx';

const STRIP_ORDER = ['top40','Gold Miners','PGMs','Energy','Banks','Retailers','Industrials'];
const STRIP_LABELS = {
  top40:'JSE TOP 40','Gold Miners':'GOLD MINERS',PGMs:'PGMs',
  Energy:'ENERGY',Banks:'BANKS',Retailers:'RETAILERS',Industrials:'INDUSTRIALS',
};

// All possible class strings written out statically
function heat(chg) {
  if (chg == null) return { bar:'bg-ts',       text:'text-ts',   label:'NO DATA'  };
  if (chg >  2.0)  return { bar:'bg-bull',      text:'text-bull', label:'BULLISH'  };
  if (chg >  0.5)  return { bar:'bg-bull/50',   text:'text-bull', label:'MILD BULL'};
  if (chg > -0.5)  return { bar:'bg-ts',        text:'text-ts',   label:'NEUTRAL'  };
  if (chg > -1.0)  return { bar:'bg-bear/50',   text:'text-bear', label:'MILD BEAR'};
  return               { bar:'bg-bear',      text:'text-bear', label:'BEARISH'  };
}

export default function HeatStrip({ sectors }) {
  return (
    <div className="flex gap-2 mb-3.5">
      {STRIP_ORDER.map(key => {
        const s = sectors[key];
        const chg = s?.chg ?? null;
        const h = heat(chg);
        return (
          <div key={key} className="flex-1 bg-bg-c border border-bd rounded p-2.5 text-center relative overflow-hidden transition-colors hover:border-warn/50">
            <div className={clsx('absolute bottom-0 left-0 right-0 h-[3px]', h.bar)} />
            <div className="font-mono text-[7.5px] tracking-[1px] text-ts mb-1.5">{STRIP_LABELS[key] ?? key}</div>
            <div className={clsx('font-display text-[20px] leading-none tracking-[0.5px]', h.text)}>
              {chg == null ? '—' : `${chg > 0 ? '+' : ''}${chg.toFixed(2)}%`}
            </div>
            <div className={clsx('font-mono text-[7px] tracking-[1px] mt-1', h.text)}>{h.label}</div>
          </div>
        );
      })}
    </div>
  );
}
