/**
 * CIS History Hook
 * Keeps this browser's CIS readings in localStorage and merges them with the
 * shared server history (/api/cis-history) when a store is configured, so the
 * trend chart survives cleared caches and is the same on every device.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { mergeReadings, downsample } from '../utils/cisSeries.js';

const KEY = 'jse_cw_cis_history_v1';
const MAX_POINTS = 200;          // local readings kept (~7 days at 5-min refresh)
const SERVER_DAYS = 14;          // server history requested
const CHART_WINDOW = 7 * 86_400_000;
const CHART_POINTS = 240;

const apiDisabled = () => {
  const h = window.location.hostname;
  return h.includes('stackblitz') || h.includes('webcontainer');
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(history) {
  try { localStorage.setItem(KEY, JSON.stringify(history)); }
  catch { /* storage full */ }
}

const label = ts => ({
  time: new Date(ts).toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' }),
  date: new Date(ts).toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg', month: 'short', day: 'numeric' }),
});

export function useCISHistory() {
  const [localHistory, setLocalHistory] = useState(load);
  const [serverReadings, setServerReadings] = useState([]);
  // 'idle' | 'ok' | 'unconfigured' | 'error'
  const [serverStatus, setServerStatus] = useState('idle');

  // Add a new CIS reading — called after each successful data fetch
  const addReading = useCallback((total, regime, regimeClass, customTs, top40) => {
    const ts = customTs || Date.now();
    setLocalHistory(prev => {
      // Avoid duplicate logs for the exact same fetch event
      if (prev.length > 0 && prev[prev.length - 1].ts === ts) return prev;
      const next = [
        ...prev,
        { ts, ...label(ts), total, regime, regimeClass, top40: Number.isFinite(top40) ? top40 : null },
      ].slice(-MAX_POINTS);
      save(next);
      return next;
    });
  }, []);

  /* Pull the shared history; with record=true also ask the server to take a
     reading (it throttles itself to one every 10 minutes). */
  const syncServer = useCallback(async (record = false) => {
    if (apiDisabled()) return;
    try {
      const res = await fetch(`/api/cis-history?days=${SERVER_DAYS}${record ? '&record=1' : ''}`);
      const json = await res.json();
      if (json.configured === false) { setServerStatus('unconfigured'); return; }
      if (Array.isArray(json.readings) && json.readings.length) setServerReadings(json.readings);
      setServerStatus(json.error ? 'error' : 'ok');
    } catch {
      setServerStatus(prev => prev === 'ok' ? prev : 'error');
    }
  }, []);

  useEffect(() => { syncServer(false); }, [syncServer]);

  const clearHistory = useCallback(() => {
    setLocalHistory([]);
    try { localStorage.removeItem(KEY); } catch { /* */ }
  }, []);

  const history = useMemo(
    () => mergeReadings(serverReadings, localHistory).map(h => ({ ...h, ...label(h.ts) })),
    [serverReadings, localHistory]
  );

  // Chart-ready data — the last 7 days, thinned so the chart stays readable
  const chartData = useMemo(() => {
    const cutoff = Date.now() - CHART_WINDOW;
    return downsample(history.filter(h => h.ts >= cutoff), CHART_POINTS).map(h => ({
      time: h.time, date: h.date, total: h.total, regime: h.regime, regimeClass: h.regimeClass, ts: h.ts,
    }));
  }, [history]);

  return { history, chartData, addReading, clearHistory, syncServer, serverStatus };
}
