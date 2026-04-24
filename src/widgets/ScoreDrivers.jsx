import React from 'react';
import clsx from 'clsx';
import { Card, CardHeader } from './Card.jsx';
import { DotIcon } from '../components/Icons.jsx';

function fmtRaw(v) {
  if (v == null) return 'n/a';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function DriverRow({ d }) {
  const pos = d.weightedImpact >= 0;
  return (
    <div className={clsx(
      'flex items-start justify-between gap-3 rounded border px-2.5 py-2',
      pos ? 'bg-bull/6 border-bull/20' : 'bg-bear/6 border-bear/20',
    )}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <DotIcon className={clsx('w-1.5 h-1.5 flex-shrink-0', pos ? 'text-bull' : 'text-bear')} />
          <span className="font-mono text-[9px] text-tp font-semibold truncate">{d.label}</span>
        </div>
        <div className="font-mono text-[7.5px] text-tm mt-0.5 truncate" title={d.reason}>
          {fmtRaw(d.raw)} · {d.bucket?.toUpperCase()} · {d.reason}
        </div>
      </div>
      <div className={clsx('font-display text-[22px] leading-none tracking-[1px]', pos ? 'text-bull' : 'text-bear')}>
        {pos ? '+' : ''}{d.weightedImpact}
      </div>
    </div>
  );
}

export default function ScoreDrivers({ cis, hasData }) {
  const drivers = (cis?.drivers || []).slice(0, 10);
  const positive = drivers.filter(d => d.weightedImpact > 0).slice(0, 3);
  const negative = drivers.filter(d => d.weightedImpact < 0).slice(0, 3);

  if (!hasData) {
    return (
      <Card className="mb-3.5">
        <CardHeader title="Why the score moved" badge="DRIVERS" badgeVariant="neutral" />
        <div className="font-mono text-[10px] text-tm text-center py-8">Fetch live data to show the top positive and negative CIS contributors.</div>
      </Card>
    );
  }

  return (
    <Card className="mb-3.5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="font-mono text-[9px] font-semibold tracking-[2px] text-ts uppercase">Why the score moved</div>
          <div className="font-mono text-[8px] text-tm mt-1">
            Weighted point contribution from macro, JSE basket and confirmation signals. Positive = supportive; negative = risk-off pressure.
          </div>
        </div>
        <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm tracking-[1px] bg-bg-e text-ts border border-bd">TOP DRIVERS</span>
      </div>

      {drivers.length === 0 ? (
        <div className="font-mono text-[10px] text-tm py-6 text-center">No material threshold drivers triggered. Current CIS is mostly low-volatility noise.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-mono text-[8px] tracking-[1.5px] text-bull mb-2">POSITIVE OFFSETS</div>
            <div className="space-y-1.5">
              {positive.length ? positive.map((d, i) => <DriverRow key={`${d.label}-${i}`} d={d} />) : (
                <div className="font-mono text-[9px] text-tm border border-bd rounded px-2.5 py-3">No meaningful bullish offsets.</div>
              )}
            </div>
          </div>
          <div>
            <div className="font-mono text-[8px] tracking-[1.5px] text-bear mb-2">NEGATIVE PRESSURES</div>
            <div className="space-y-1.5">
              {negative.length ? negative.map((d, i) => <DriverRow key={`${d.label}-${i}`} d={d} />) : (
                <div className="font-mono text-[9px] text-tm border border-bd rounded px-2.5 py-3">No meaningful bearish pressures.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
