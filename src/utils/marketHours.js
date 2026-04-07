/**
 * JSE Market Hours Utility
 * JSE: Mon–Fri 09:00–17:00 SAST (UTC+2)
 * Pre-open: 08:30–09:00 SAST
 * After-hours: 17:00–17:30 SAST (closing auction)
 */

export function getJSEStatus() {
  const now   = new Date();
  // Convert to SAST (UTC+2)
  const sast  = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  const day   = sast.getDay();   // 0=Sun, 6=Sat
  const h     = sast.getHours();
  const m     = sast.getMinutes();
  const mins  = h * 60 + m;     // minutes since midnight SAST

  const PREOPEN  = 8 * 60 + 30;  // 08:30
  const OPEN     = 9 * 60;       // 09:00
  const CLOSE    = 17 * 60;      // 17:00
  const AFTERHRS = 17 * 60 + 30; // 17:30

  if (day === 0 || day === 6) {
    return { status: 'closed', label: 'WEEKEND', color: 'ts', detail: 'JSE closed — reopens Monday 09:00 SAST' };
  }

  if (mins < PREOPEN) {
    const openIn = minutesUntil(sast, 8, 30);
    return { status: 'closed', label: 'PRE-MARKET', color: 'tm', detail: `Pre-open in ${openIn}` };
  }
  if (mins < OPEN) {
    const openIn = minutesUntil(sast, 9, 0);
    return { status: 'preopen', label: 'PRE-OPEN', color: 'warn', detail: `Opening in ${openIn}` };
  }
  if (mins < CLOSE) {
    const closeIn = minutesUntil(sast, 17, 0);
    return { status: 'open', label: 'JSE OPEN', color: 'bull', detail: `Closes in ${closeIn}` };
  }
  if (mins < AFTERHRS) {
    return { status: 'afterhours', label: 'CLOSING AUCTION', color: 'warn', detail: 'Closing auction 17:00–17:30' };
  }

  const openIn = minutesUntilTomorrow(sast, 9, 0, day);
  return { status: 'closed', label: 'AFTER HOURS', color: 'ts', detail: `Opens ${openIn}` };
}

function minutesUntil(sast, targetH, targetM) {
  const target = targetH * 60 + targetM;
  const now    = sast.getHours() * 60 + sast.getMinutes();
  const diff   = target - now;
  if (diff <= 0) return '—';
  if (diff < 60) return `${diff}min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}min`;
}

function minutesUntilTomorrow(sast, targetH, targetM, day) {
  if (day === 5) return 'Monday 09:00 SAST'; // Friday after close
  const minsLeft = (24 * 60) - (sast.getHours() * 60 + sast.getMinutes());
  const minsToOpen = targetH * 60 + targetM;
  const total = minsLeft + minsToOpen;
  const hrs = Math.floor(total / 60);
  return `tomorrow in ${hrs}h`;
}

export function getSASTTime() {
  return new Date().toLocaleTimeString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getSASTDate() {
  return new Date().toLocaleDateString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
