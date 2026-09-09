import React from 'react';
import { ErrorIcon } from './Icons.jsx';

export default function LoadingOverlay({ status, progress, error, onDismiss }) {
  const isLoading = status === 'loading';
  const isError   = status === 'error';
  if (!isLoading && !isError) return null;

  return (
    <div
      role={isError ? 'alertdialog' : 'status'}
      aria-modal={isError ? 'true' : undefined}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-label={isError ? 'Market data update failed' : 'Updating market data'}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-bg/90 backdrop-blur-sm"
    >
      <div className="bg-bg-s border border-bd rounded-lg p-6 sm:p-8 flex flex-col items-center gap-5 max-w-sm w-full mx-4 shadow-2xl">

        {isLoading && (
          <>
            <div className="relative w-12 h-12 flex-shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-bd" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-warn animate-spin" />
            </div>
            <div className="text-center">
              <div className="font-serif text-[24px] text-warn mb-1">Updating market data</div>
              <div className="font-mono text-[11px] text-ts">{progress || 'Connecting to market data providers…'}</div>
            </div>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-warn/60 animate-pulse2"
                  style={{ animationDelay: `${i * 0.25}s` }} />
              ))}
            </div>
            <div className="font-mono text-[9px] text-tm text-center leading-relaxed">
              All {' '}<span className="text-warn">40+ symbols</span>{' '} fetched concurrently<br />
              Yahoo Finance + Stooq · No API key required
            </div>
          </>
        )}

        {isError && (
          <>
            <div className="w-12 h-12 rounded-full bg-bear/10 border border-bear/40 flex items-center justify-center text-bear flex-shrink-0">
              <ErrorIcon className="w-6 h-6" />
            </div>
            <div className="text-center">
              <div className="font-serif text-[24px] text-bear mb-2">Market data unavailable</div>
              <div className="font-mono text-[11px] text-ts text-center leading-relaxed max-w-[280px]">
                {error || 'Yahoo Finance could not be reached'}
              </div>
            </div>
            <div className="font-mono text-[10px] text-tm text-center leading-relaxed">
              Your saved data remains available. Close this message and try refreshing again.
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-11 px-6 py-2 font-mono text-[11px] font-semibold bg-warn text-bg rounded hover:bg-warn/80 transition-colors cursor-pointer"
            >
              Return to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
