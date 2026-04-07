import React from 'react';

export default function LoadingOverlay({ status, progress, error, onDismiss }) {
  const isLoading = status === 'loading';
  const isError   = status === 'error';
  if (!isLoading && !isError) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-bg/90 backdrop-blur-sm">
      <div className="bg-bg-s border border-bd rounded-lg p-8 flex flex-col items-center gap-5 max-w-sm w-full mx-4 shadow-2xl">

        {isLoading && (
          <>
            <div className="relative w-12 h-12 flex-shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-bd" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-warn animate-spin" />
            </div>
            <div className="text-center">
              <div className="font-display text-[22px] tracking-[3px] text-warn mb-1">FETCHING LIVE DATA</div>
              <div className="font-mono text-[10px] text-ts">{progress || 'Connecting to Yahoo Finance…'}</div>
            </div>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-warn/60 animate-pulse2"
                  style={{ animationDelay: `${i * 0.25}s` }} />
              ))}
            </div>
            <div className="font-mono text-[9px] text-tm text-center leading-relaxed">
              All {' '}<span className="text-warn">40+ symbols</span>{' '} fetched in a single request<br />
              Yahoo Finance · No API key required
            </div>
          </>
        )}

        {isError && (
          <>
            <div className="w-12 h-12 rounded-full bg-bear/10 border border-bear/40 flex items-center justify-center text-2xl flex-shrink-0">
              ⚠️
            </div>
            <div className="text-center">
              <div className="font-display text-[22px] tracking-[3px] text-bear mb-2">FETCH FAILED</div>
              <div className="font-mono text-[10px] text-ts text-center leading-relaxed max-w-[260px]">
                {error || 'Yahoo Finance could not be reached'}
              </div>
            </div>
            <div className="font-mono text-[9px] text-tm text-center leading-relaxed">
              Common causes: Netlify function not deployed,<br />
              or Yahoo Finance temporarily unavailable.
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="px-6 py-2 font-mono text-[10px] font-semibold bg-warn text-bg rounded hover:bg-warn/80 transition-colors cursor-pointer"
            >
              DISMISS
            </button>
          </>
        )}
      </div>
    </div>
  );
}
