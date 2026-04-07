import React from 'react';
import clsx from 'clsx';
import { Card, CardHeader } from './Card.jsx';

const META = {
  macro: { label: 'Macro Shock Score',  weight: '40%', note: 'Brent · USD/ZAR · Gold · SA 10Y'  },
  jse:   { label: 'JSE Reaction Score', weight: '35%', note: 'Top40 · Banks · Retail · Miners'   },
  conf:  { label: 'Confirmation Score', weight: '25%', note: 'Signal alignment & directionality'  },
};

function ScoreBar({ score }) {
  const isPos = score >= 0;
  const half  = Math.abs(score) / 2;
  return (
    <div className="h-[5px] bg-bg-e rounded-full overflow-hidden relative">
      <div className="absolute top-0 left-1/2 w-px h-full bg-white/20" />
      <div
        className={clsx('absolute top-0 h-full rounded-full transition-all duration-700',
          isPos ? 'bg-bull' : 'bg-bear')}
        style={{ left: `${isPos ? 50 : 50 - half}%`, width: `${half}%` }}
      />
    </div>
  );
}

export default function ScoreDecomp({ cis, hasData }) {
  const totalColor = cis.regimeClass === 'bull' ? 'text-bull' : cis.regimeClass === 'warn' ? 'text-warn' : 'text-bear';

  if (!hasData) {
    return (
      <Card className="h-full">
        <CardHeader title="Conflict Impact Score Decomposition" badge="WEIGHTED" badgeVariant="warn" />
        <div className="flex items-center justify-center h-40 font-mono text-[10px] text-tm text-center">
          Score computed once<br />live data is fetched
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader title="Conflict Impact Score Decomposition" badge="WEIGHTED" badgeVariant="warn" />
      <div className="space-y-3.5">
        {Object.entries(cis.components).map(([key, comp]) => {
          const meta   = META[key];
          const isPos  = comp.score >= 0;
          const valCol = isPos ? 'text-bull' : 'text-bear';
          return (
            <div key={key}>
              <div className="flex items-baseline justify-between mb-1.5">
                <div>
                  <span className="font-mono text-[9px] text-ts">{meta.label}</span>
                  <span className="font-mono text-[8px] text-tm ml-2">{meta.weight}</span>
                </div>
                <div className="text-right">
                  <span className={clsx('font-mono text-[12px] font-semibold', valCol)}>
                    {comp.score > 0 ? '+' : ''}{comp.score}
                  </span>
                  <span className="font-mono text-[8px] text-tm ml-1.5">
                    → {comp.contrib > 0 ? '+' : ''}{comp.contrib} pts
                  </span>
                </div>
              </div>
              <ScoreBar score={comp.score} />
              <div className="font-mono text-[8px] text-tm mt-1">{meta.note}</div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center pt-3 mt-3 border-t border-bd-x">
        <div>
          <div className="font-mono text-[9px] text-ts">WEIGHTED TOTAL</div>
          <div className="font-mono text-[8px] text-tm mt-0.5">Macro×0.40 + JSE×0.35 + Conf×0.25</div>
        </div>
        <div className="text-right">
          <div className={clsx('font-display text-[28px] tracking-[1px] leading-none', totalColor)}>{cis.total}</div>
          <div className={clsx('font-mono text-[8px] mt-0.5', totalColor)}>{cis.regime}</div>
        </div>
      </div>
    </Card>
  );
}
