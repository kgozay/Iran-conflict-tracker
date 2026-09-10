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
  const updated = (dataHealth?.liveStocks || 0) + (dataHealth?.liveMacro || 0);
  const total = (dataHealth?.totalStocks || 0) + (dataHealth?.totalMacro || 0);
  const missing = Math.max(0, total - updated);
  const sourceWarning = missing > 0 || error || dataHealth?.sourceHealth?.history === 'unavailable';
  const marketMessage = market?.isOpen
    ? 'JSE open'
    : `Market closed${hasTimestamp ? ' · Showing last available close' : ''}`;
  const sourceMessage = sourceWarning
    ? `Some sources unavailable${total ? ` · ${updated} of ${total} instruments updated` : ''}`
    : total
      ? `All ${total} instruments updated`
      : null;
  const detail = dataHealth?.warnings?.find(warning => !warning.startsWith('Quote coverage'));

  return (
    <div
      role={sourceWarning ? 'alert' : 'status'}
      aria-atomic="true"
      className={clsx(
        'mx-4 sm:mx-6 lg:mx-8 mt-3 rounded-lg border px-3.5 py-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] sm:text-[13px]',
        sourceWarning ? 'border-warn/35 bg-warn/8 text-ts' : 'border-bd bg-bg-e text-tm',
      )}
    >
      {market && (
        <span className="inline-flex items-center gap-1.5 font-medium text-tp">
          <span className={clsx('w-1.5 h-1.5 rounded-full', market.isOpen ? 'bg-bull' : 'bg-tm')} />
          {marketMessage}
        </span>
      )}
      {sourceMessage && <span className={clsx(sourceWarning && 'text-warn')}>{sourceMessage}</span>}
      {fetched && <span className="font-mono text-[11px] sm:text-[12px] text-tm">Updated {fetched} SAST</span>}
      {detail && <span className="basis-full text-tm">{detail}</span>}
      {sourceWarning && (
        <button type="button" onClick={() => onRetry(false)} disabled={dataHealth?.status === 'loading'}
          className="min-h-11 sm:min-h-0 sm:ml-auto inline-flex items-center gap-1.5 font-medium text-tp hover:text-warn disabled:text-tm disabled:cursor-not-allowed">
          <RefreshIcon className={clsx('w-3.5 h-3.5', dataHealth?.status === 'loading' && 'animate-spin')} />
          Try refresh
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
