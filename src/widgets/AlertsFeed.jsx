import React from 'react';
import clsx from 'clsx';
import { Card } from './Card.jsx';

const DOT_CLS = {
  red:   'bg-bear shadow-[0_0_8px_rgba(249,112,112,0.5)] animate-pulseFast',
  amber: 'bg-warn shadow-[0_0_8px_rgba(232,176,74,0.4)]',
  green: 'bg-bull shadow-[0_0_8px_rgba(52,211,153,0.4)]',
};

const CAT_CLS = {
  red:   'text-bear bg-bear/10 border-bear/25',
  amber: 'text-warn bg-warn/10 border-warn/25',
  green: 'text-bull bg-bull/10 border-bull/25',
};

export default function AlertsFeed({ alerts, hasData }) {
  const critCount = alerts.filter(a => a.lvl === 'red').length;
  const rightLabel = !hasData ? null
    : critCount > 0 ? `${critCount} critical`
    : `${alerts.length} triggers`;

  return (
    <Card>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-[18px]">
        <div className="font-serif text-[22px] text-tp leading-[1.1]">
          Alerts <span className="italic text-warn">today</span>
        </div>
        {rightLabel && (
          <span className="text-[12px] text-tm">{rightLabel}</span>
        )}
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-32 text-[13px] text-tm">
          Alerts computed from live market data
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-[13px] text-tm">
          No alert thresholds triggered
        </div>
      ) : (
        <div>
          {alerts.map((al, i) => (
            <div key={al.id}
              className={clsx(
                'grid gap-3 py-[13px] items-start',
                i > 0 && 'border-t border-bd',
              )}
              style={{ gridTemplateColumns: '16px 56px 1fr' }}>
              <span className={clsx('w-2 h-2 rounded-full flex-shrink-0 mt-[6px]', DOT_CLS[al.lvl] ?? 'bg-ts')} />
              <span className="font-mono text-[12px] text-tm pt-[2px]">{al.time}</span>
              <div className="text-[13px] text-tp leading-[1.5] min-w-0">
                {al.category && (
                  <div className="mb-1">
                    <span className={clsx(
                      'inline-block font-mono text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border leading-none',
                      CAT_CLS[al.lvl] ?? 'text-ts bg-bg-h border-bd'
                    )}>
                      {al.category}
                    </span>
                  </div>
                )}
                <div>{al.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
