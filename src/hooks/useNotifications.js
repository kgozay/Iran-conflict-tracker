import { useState, useEffect, useRef, useCallback } from 'react';

const PREF_KEY = 'jse_notify';
const POLL_MS = 10 * 60 * 1000;   // background refresh while alerts are on

const supported = () => typeof window !== 'undefined' && 'Notification' in window;

function readPref() {
  try { return localStorage.getItem(PREF_KEY) === 'on'; } catch { return false; }
}

async function show(title, body, tag) {
  const opts = { body, tag, icon: '/icon.svg', badge: '/icon.svg' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.showNotification(title, opts); return; }
  } catch { /* fall through */ }
  try { new Notification(title, opts); } catch { /* Android needs the service worker */ }
}

/**
 * Alerts on a CIS regime change or a new red threshold alert. While the tab is
 * visible they arrive as toasts; in the background as system notifications.
 * While enabled, data refreshes every 10 minutes so alerts can fire unattended.
 */
export function useNotifications({ cis, alerts, hasData, addToast, onPoll }) {
  const [enabled, setEnabled] = useState(() => supported() && readPref() && Notification.permission === 'granted');
  const prevRegime = useRef(null);
  const seenRed = useRef(null);

  const toggle = useCallback(async () => {
    if (!supported()) { addToast?.('This browser does not support notifications', 'error', 4000); return; }
    if (enabled) {
      setEnabled(false);
      try { localStorage.setItem(PREF_KEY, 'off'); } catch { /* */ }
      addToast?.('Alerts off', 'info', 2000);
      return;
    }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') { addToast?.('Notifications are blocked for this site in your browser settings', 'error', 5000); return; }
    setEnabled(true);
    try { localStorage.setItem(PREF_KEY, 'on'); } catch { /* */ }
    addToast?.('Alerts on: regime changes and red alerts will notify you', 'success', 3000);
  }, [enabled, addToast]);

  useEffect(() => {
    if (!hasData || !cis?.regime || cis.regime === 'NO DATA') return;
    const redIds = new Set((alerts || []).filter(a => a.lvl === 'red').map(a => a.id));

    // First reading of the session is the baseline, not news.
    if (prevRegime.current == null) {
      prevRegime.current = cis.regime;
      seenRed.current = redIds;
      return;
    }

    const messages = [];
    if (cis.regime !== prevRegime.current) {
      messages.push({ tag: 'regime', title: `CIS regime: ${cis.regime}`, body: `Moved from ${prevRegime.current} to ${cis.regime} (score ${cis.total}).` });
      prevRegime.current = cis.regime;
    }
    for (const a of (alerts || []).filter(x => x.lvl === 'red' && !seenRed.current.has(x.id))) {
      messages.push({ tag: `alert-${a.id}`, title: a.label, body: a.text });
    }
    seenRed.current = redIds;

    if (!enabled || !messages.length) return;
    for (const m of messages) {
      if (document.visibilityState === 'visible') addToast?.(`${m.title} — ${m.body}`, 'info', 6000);
      else show(m.title, m.body, m.tag);
    }
  }, [cis?.regime, cis?.total, alerts, hasData, enabled, addToast]);

  useEffect(() => {
    if (!enabled || !onPoll) return;
    const id = setInterval(() => onPoll(), POLL_MS);
    return () => clearInterval(id);
  }, [enabled, onPoll]);

  return { notifyEnabled: enabled, notifySupported: supported(), toggleNotify: toggle };
}
