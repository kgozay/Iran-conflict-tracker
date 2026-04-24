import React from 'react';
import clsx from 'clsx';
import { Card, CardHeader } from './Card.jsx';
import { DotIcon } from '../components/Icons.jsx';

function Stat({ label, value, sub, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-bull' : tone === 'warn' ? 'text-warn' : tone === 'bad' ? 'text-bear' : 'text-ts';
  return (
    <div className="bg-bg-e border border-bd-x rounded px-2.5 py-2">
      <div className="font-mono text-[7px] tracking-[1px] text-tm uppercase mb-1">{label}</div>
      <div className={clsx('font-display text-[18px] leading-none truncate', cls)}>{value}</div>
      {sub && <div className="font-mono text-[7.5px] text-tm mt-1 truncate" title={sub}>{sub}</div>}
    </div>
  );
}

export default function DataHealth({ health, hasData }) {
  if (!hasData || !health) {
    return (
      <Card className="h-full">
        <CardHeader title="Data Quality / Source Status" badge="AWAITING DATA" />
        <div className="flex items-center justify-center h-32 font-mono text-[10px] text-tm text-center">
          Fetch live data to audit quote coverage, source mix and stale fallbacks.
        </div>
      </Card>
    );
  }

  const quoteTone = health.quoteCoverage >= 95 ? 'good' : health.quoteCoverage >= 85 ? 'warn' : 'bad';
  const bondTone = health.bondIsStatic ? 'bad' : health.bondIsProxy ? 'warn' : 'good';
  const failed = [...(health.failedMacro || []), ...(health.failedStocks || [])].slice(0, 12).join(', ');

  return (
    <Card className="h-full">
      <CardHeader
        title="Data Quality / Source Status"
        badge={`${health.quoteCoverage}% COVERAGE`}
        badgeVariant={quoteTone === 'good' ? 'live' : quoteTone === 'warn' ? 'warn' : 'bear'}
      />
      <div className="grid grid-cols-4 gap-2 mb-3">
        <Stat label="Quotes" value={`${health.liveStocks + Math.max(0, health.liveMacro - 1)}/${health.totalStocks + 6}`} sub="Yahoo quote/chart resolved" tone={quoteTone} />
        <Stat label="History" value={`${health.historyStocks + health.historyMacro}/${health.totalHistoryStocks + health.totalHistoryMacro}`} sub="5D/20D coverage" tone={(health.historyStocks + health.historyMacro) > 0 ? 'good' : 'warn'} />
        <Stat label="SA 10Y source" value={health.bondSource} sub={health.bondDate || 'No date'} tone={bondTone} />
        <Stat label="Cache age" value={health.minutesOld == null ? '—' : `${health.minutesOld}m`} sub={health.status?.toUpperCase()} tone={health.status === 'cached' ? 'warn' : 'good'} />
      </div>

      {health.warnings?.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {health.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 font-mono text-[8px] text-warn bg-warn-faint border border-warn-faint rounded px-2 py-1.5">
              <DotIcon className="w-1.5 h-1.5 mt-1 flex-shrink-0" /> {w}
            </div>
          ))}
        </div>
      )}

      <div className="font-mono text-[8px] text-tm leading-relaxed">
        <span className="text-ts">Failed / missing:</span> {failed || 'None detected in current snapshot'}
      </div>
      <div className="font-mono text-[7px] text-tm/70 mt-2 leading-relaxed">
        Static reference fields such as market cap and P/E are shown for context only and may be stale. Sector performance is an equal-weight basket, not an index-weighted sector return.
      </div>
    </Card>
  );
}
