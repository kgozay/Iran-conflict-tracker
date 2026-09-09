import React from 'react';
import clsx from 'clsx';
import { RefreshIcon, XIcon } from './Icons.jsx';

export default function DataStatusBanner({ dataHealth, error, onRetry, onDismiss }) {
  const hasWarning = Boolean(error || dataHealth?.warnings?.length);
  const hasTimestamp = Boolean(dataHealth?.lastFetch);
  if (!hasWarning && !hasTimestamp) return null;

  const fetched = hasTimestamp
    ? new Date(dataHealth.lastFetch).toLocaleTimeString('en-ZA', {
        timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit',
      })
    : null;
  const market = dataHealth?.market;
  const message = error || dataHealth?.warnings?.[0];

  return (
    <div
      role={hasWarning ? 'alert' : 'status'}
      className={clsx(
        'mx-4 sm:mx-6 lg:mx-8 mt-3 rounded-lg border px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11.5px]',
        hasWarning ? 'border-warn/35 bg-warn/8 text-ts' : 'border-bd bg-bg-e text-tm',
      )}
    >
      {market && (
        <span className="inline-flex items-center gap-1.5 font-medium text-tp">
          <span className={clsx('w-1.5 h-1.5 rounded-full', market.isOpen ? 'bg-bull' : 'bg-tm')} />
          {market.label}
        </span>
      )}
      {fetched && <span>Updated {fetched} SAST</span>}
      {dataHealth?.quoteCoverage > 0 && <span>{dataHealth.quoteCoverage}% quote coverage</span>}
      {message && <span className="basis-full sm:basis-auto sm:flex-1">{message}</span>}
      {hasWarning && (
        <button type="button" onClick={() => onRetry(false)} className="min-h-11 sm:min-h-0 inline-flex items-center gap-1.5 text-tp hover:text-warn">
          <RefreshIcon className="w-3.5 h-3.5" /> Retry data
        </button>
      )}
      {error && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss data warning" className="w-11 h-11 sm:w-7 sm:h-7 inline-flex items-center justify-center text-tm hover:text-tp rounded">
          <XIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
