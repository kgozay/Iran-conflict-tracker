import { useState, useEffect, useRef, useCallback } from 'react';

export const INTERVALS = {
  off:  null,
  '1m': 60_000,
  '5m': 300_000,
  '15m':900_000,
  '30m':1_800_000,
};

export function useAutoRefresh(onRefresh) {
  const [intervalKey, setIntervalKey] = useState('off');
  const [nextIn,      setNextIn]      = useState(null);

  const timerRef    = useRef(null);
  const countRef    = useRef(null);
  const startedRef  = useRef(null);
  const onRefreshRef = useRef(onRefresh);

  // Keep ref in sync so timer always calls the latest version of onRefresh
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  const stop = useCallback(() => {
    if (timerRef.current)  clearInterval(timerRef.current);
    if (countRef.current)  clearInterval(countRef.current);
    timerRef.current  = null;
    countRef.current  = null;
    startedRef.current = null;
    setNextIn(null);
  }, []);

  useEffect(() => {
    stop();
    const ms = INTERVALS[intervalKey];
    if (!ms) return;

    startedRef.current = Date.now();

    // Main refresh — always reads latest onRefresh via ref
    timerRef.current = setInterval(() => {
      onRefreshRef.current?.();
      startedRef.current = Date.now();
    }, ms);

    // Countdown ticker
    countRef.current = setInterval(() => {
      const elapsed   = Date.now() - (startedRef.current ?? Date.now());
      const remaining = Math.max(0, Math.ceil((ms - elapsed) / 1000));
      setNextIn(remaining);
    }, 1000);

    setNextIn(Math.ceil(ms / 1000));
    return stop;
  }, [intervalKey, stop]);

  function fmtCountdown(s) {
    if (!s) return '';
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  return {
    intervalKey,
    setIntervalKey,
    countdown:  fmtCountdown(nextIn),
    isActive:   intervalKey !== 'off',
  };
}
