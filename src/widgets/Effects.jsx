/* src/widgets/Effects.jsx
 *
 * React-Bits effects ported to your stack — no extra dependencies.
 * Sources (all from DavidHDev/react-bits):
 *   FX1  CountUp        — TextAnimations/CountUp        (spring count-up)
 *   FX2  ShinyText      — TextAnimations/ShinyText      (background-position shine)
 *   FX3  DecryptedText  — TextAnimations/DecryptedText  (scramble → reveal)
 *   FX5  SpotlightCard  — Components/SpotlightCard      (mouse-tracked glow)
 *   FX8  StarBorder     — Animations/StarBorder         (rotating gradient ring)
 *
 * The original components depend on framer-motion. These ports use plain
 * requestAnimationFrame / CSS keyframes so they fit your existing bundle.
 *
 * One-time CSS additions live in src/index.css under `--- React-Bits FX ---`.
 */

import React, { useEffect, useRef, useState } from 'react';

/* ── FX1 · CountUp ─────────────────────────────────────────────────────
 * Critically-damped spring; same feel as react-bits/CountUp without framer.
 * Usage: <CountUp to={88.42} decimals={2} suffix="%" />
 */
export function CountUp({ to, from = 0, duration = 1.6, decimals = 0, suffix = '', className = '' }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (to == null || Number.isNaN(to)) { setV(to); return; }
    let raf, start = null;
    // easeOutQuart — fast acceleration that settles cleanly inside `duration`s
    const ease = t => 1 - Math.pow(1 - t, 4);
    function tick(now) {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / (duration * 1000));
      setV(from + (to - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setV(to);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, from, duration]);

  if (v == null || Number.isNaN(v)) return <span className={className}>—</span>;
  const opts = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  return <span className={'num ' + className}>{v.toLocaleString('en-US', opts)}{suffix}</span>;
}

/* ── FX2 · ShinyText ───────────────────────────────────────────────────
 * Sweeping highlight across text. Pass colour matching the underlying ink.
 * Usage: <ShinyText text="transmission" color="#e8b04a" shineColor="#fff5d6" />
 */
export function ShinyText({
  text,
  color = 'var(--color-tp)',
  shineColor = '#ffffff',
  speed = 3.4,
  spread = 120,
  className = '',
  style = {},
}) {
  const s = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: `rb-shine ${speed}s linear infinite`,
    ...style,
  };
  return <span className={className} style={s}>{text}</span>;
}

/* ── FX3 · DecryptedText ───────────────────────────────────────────────
 * One-shot cipher reveal — runs once on mount and re-runs ONLY when the
 * `text` value changes (e.g. regime "mild bearish" → "neutral"). To bring
 * back the looping demo behaviour, pass `loop={true}` explicitly.
 * Usage: <DecryptedText text="mild bearish" />
 */
export function DecryptedText({
  text,
  speed = 55,
  holdMs = 1600,
  loop = false,
  chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%01',
  className = '',
  encryptedClassName = '',
}) {
  const [revealed, setRevealed] = useState(0);
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    let r = 0, dir = 1, holdT = null;
    setRevealed(0);
    const id = setInterval(() => {
      if (holdT) {
        if (performance.now() - holdT > holdMs) { dir = -1; holdT = null; }
        return;
      }
      if (dir === 1) {
        r = Math.min(text.length, r + 1);
        if (r === text.length) {
          if (!loop) {
            // Lock in the fully revealed state and stop ticking.
            setRevealed(text.length);
            setDisplay(text);
            clearInterval(id);
            return;
          }
          holdT = performance.now();
        }
      } else {
        r = Math.max(0, r - 1);
        if (r === 0) dir = 1;
      }
      setRevealed(r);
      const out = text.split('').map((c, i) => {
        if (c === ' ') return ' ';
        if (i < r) return text[i];
        return chars[Math.floor(Math.random() * chars.length)];
      }).join('');
      setDisplay(out);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, holdMs, loop, chars]);

  return (
    <span className={className}>
      <span aria-hidden="true">
        {display.split('').map((c, i) => (
          <span key={i} className={i < revealed ? '' : (encryptedClassName || 'rb-decrypt-enc')}>{c}</span>
        ))}
      </span>
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>{text}</span>
    </span>
  );
}

/* ── FX5 · SpotlightCard ───────────────────────────────────────────────
 * Mouse-tracked radial highlight over the child container. Wrap any card.
 * Inherits border-radius from the wrapped child via `border-radius: inherit`.
 * Usage: <SpotlightCard className="glass rounded-[16px]"><KpiBody /></SpotlightCard>
 */
export function SpotlightCard({
  children,
  spotlightColor = 'rgba(232, 176, 74, 0.22)',
  size = 240,
  className = '',
  style = {},
  as: Tag = 'div',
  ...rest
}) {
  const ref = useRef(null);
  function move(e) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--rb-sx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--rb-sy', (e.clientY - r.top) + 'px');
  }
  return (
    <Tag
      ref={ref}
      onMouseMove={move}
      className={'rb-spot ' + className}
      style={{ '--rb-spot': spotlightColor, '--rb-spot-size': size + 'px', ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ── FX8 · StarBorder ──────────────────────────────────────────────────
 * Rotating gradient ring around a button-like element. Use sparingly — one
 * primary CTA per surface.
 * Usage: <StarBorder color="#e8b04a" onClick={onFetch}>Refresh data</StarBorder>
 */
export function StarBorder({
  children,
  color = 'var(--color-warn)',
  speed = '5s',
  className = '',
  innerClassName = '',
  disabled = false,
  ...rest
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={'rb-star ' + className}
      {...rest}
    >
      <span
        className="rb-star-grad rb-star-bot"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <span
        className="rb-star-grad rb-star-top"
        style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }}
      />
      <span className={'rb-star-inner ' + innerClassName}>{children}</span>
    </button>
  );
}

export default { CountUp, ShinyText, DecryptedText, SpotlightCard, StarBorder };
