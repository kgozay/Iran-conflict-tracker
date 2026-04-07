/**
 * CIS History Hook
 * Stores Conflict Impact Score readings in localStorage with timestamps.
 * Used to render the CIS trend chart on the Overview page.
 */

import { useState, useCallback, useEffect } from 'react';

const KEY = 'jse_cw_cis_history_v1';
const MAX_POINTS = 200;   // keep last 200 readings (~7 days at 5-min refresh)

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

export function useCISHistory() {
  const [history, setHistory] = useState(load);

  // Add a new CIS reading — called after each successful data fetch
  const addReading = useCallback((total, regime, regimeClass) => {
    setHistory(prev => {
      const next = [
        ...prev,
        {
          ts:          Date.now(),
          time:        new Date().toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' }),
          date:        new Date().toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg', month: 'short', day: 'numeric' }),
          total,
          regime,
          regimeClass,
        },
      ].slice(-MAX_POINTS);
      save(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(KEY); } catch { /* */ }
  }, []);

  // Chart-ready data — last 48 points for the chart (≈4 hours at 5-min interval)
  const chartData = history.slice(-48).map(h => ({
    time:        h.time,
    date:        h.date,
    total:       h.total,
    regime:      h.regime,
    regimeClass: h.regimeClass,
    ts:          h.ts,
  }));

  return { history, chartData, addReading, clearHistory };
}
