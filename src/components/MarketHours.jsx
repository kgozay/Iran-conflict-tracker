import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { getJSEStatus, getSASTTime, getSASTDate } from '../utils/marketHours.js';

const STATUS_DOT = {
  open:      'bg-bull animate-pulse2 shadow-[0_0_6px_#05d09a]',
  preopen:   'bg-warn animate-pulse2',
  afterhours:'bg-warn',
  closed:    'bg-ts',
};
const STATUS_TEXT = {
  open:      'text-bull',
  preopen:   'text-warn',
  afterhours:'text-warn',
  closed:    'text-ts',
};

export default function MarketHours() {
  const [jse, setJse]   = useState(getJSEStatus);
  const [time, setTime] = useState(getSASTTime);

  useEffect(() => {
    const tick = setInterval(() => {
      setJse(getJSEStatus());
      setTime(getSASTTime());
    }, 15_000); // update every 15 seconds
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-bg-s border border-bd rounded px-3 py-1.5">
      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOT[jse.status] ?? STATUS_DOT.closed)} />
      <div className="min-w-0">
        <div className={clsx('font-mono text-[9px] font-semibold tracking-[1px]', STATUS_TEXT[jse.status] ?? STATUS_TEXT.closed)}>
          {jse.label}
        </div>
        <div className="font-mono text-[8px] text-tm">{jse.detail}</div>
      </div>
      <div className="border-l border-bd pl-2 ml-1 text-right">
        <div className="font-mono text-[10px] text-ts font-semibold">{time}</div>
        <div className="font-mono text-[7px] text-tm">SAST</div>
      </div>
    </div>
  );
}
