import React from 'react';
import clsx from 'clsx';
import { Card, CardHeader } from './Card.jsx';

const TAG = {
  os: 'bg-bear/20 text-bear border border-bear/40',
  ds: 'bg-warn/20 text-warn border border-warn/40',
  ms: 'bg-bull/20 text-bull border border-bull/40',
  in: 'bg-bg-e text-ts border border-bd',
};
const DOT = {
  red:   'bg-bear shadow-[0_0_5px_#ef4444] animate-pulseFast',
  amber: 'bg-warn shadow-[0_0_5px_#f0b429]',
  green: 'bg-bull shadow-[0_0_5px_#05d09a]',
};

export default function AlertsFeed({ alerts, hasData }) {
  const critCount = alerts.filter(a => a.lvl === 'red').length;
  return (
    <Card className="h-full">
      <CardHeader
        title="Live Alerts Feed"
        badge={!hasData ? 'AWAITING DATA' : critCount > 0 ? `${critCount} CRITICAL` : `${alerts.length} ACTIVE`}
        badgeVariant={!hasData ? 'neutral' : critCount > 0 ? 'bear' : 'warn'}
      />
      {!hasData ? (
        <div className="flex items-center justify-center h-32 font-mono text-[10px] text-tm">
          Alerts computed from live market data
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex items-center justify-center h-32 font-mono text-[10px] text-tm">
          No alert thresholds triggered
        </div>
      ) : (
        <div className="divide-y divide-bd-x">
          {alerts.map(al => (
            <div key={al.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <span className={clsx('w-[7px] h-[7px] rounded-full flex-shrink-0 mt-1', DOT[al.lvl] ?? 'bg-ts')} />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] text-tp leading-[1.5]">
                  <span className={clsx('inline-block px-1 py-px rounded-sm text-[7px] tracking-[1px] mr-1.5 align-middle', TAG[al.tag] ?? TAG.in)}>
                    {al.label}
                  </span>
                  {al.text}
                </div>
                <span className="font-mono text-[8px] text-tm block mt-0.5">{al.time} SAST</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
