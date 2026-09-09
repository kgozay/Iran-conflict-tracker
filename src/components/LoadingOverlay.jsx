import React from 'react';

export default function LoadingOverlay({ status, progress }) {
  const isLoading = status === 'loading';
  if (!isLoading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Updating market data"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-bg/90 backdrop-blur-sm"
    >
      <div className="bg-bg-s border border-bd rounded-lg p-6 sm:p-8 flex flex-col items-center gap-5 max-w-sm w-full mx-4 shadow-2xl">
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
          Current quotes and recent history are fetched independently<br />
          Partial results remain available if one source fails
        </div>
      </div>
    </div>
  );
}
