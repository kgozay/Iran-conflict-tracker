/**
 * Minimal monochrome SVG icon set — replaces emoji throughout the app.
 * All icons use currentColor so they inherit Tailwind text colour classes.
 * Sized via className (e.g. "w-3.5 h-3.5").
 */

import React from 'react';

/* Shared SVG wrapper */
function Svg({ children, className = 'w-3.5 h-3.5', ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ── Commodity / macro glyphs ────────────────────────────────────── */
export const BrentIcon    = (p) => <Svg {...p}><path d="M12 3c3 4 5 7 5 10a5 5 0 1 1-10 0c0-3 2-6 5-10z"/></Svg>;
export const GoldIcon     = (p) => <Svg {...p}><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9 10h6M9 14h6"/></Svg>;
export const PlatinumIcon = (p) => <Svg {...p}><path d="M12 3l4 4-4 4-4-4 4-4zM4 13l4 4-4 4M20 13l-4 4 4 4"/></Svg>;
export const PalladiumIcon = (p) => <Svg {...p}><path d="M9 3h6l3 6-6 12-6-12 3-6z"/></Svg>;
export const FxIcon       = (p) => <Svg {...p}><path d="M3 7h14l-3-3M21 17H7l3 3"/></Svg>;
export const CoalIcon     = (p) => <Svg {...p}><path d="M4 18l4-8 4 4 4-6 4 10z"/><path d="M4 18h16"/></Svg>;
export const BondIcon     = (p) => <Svg {...p}><path d="M3 21h18M4 10l8-6 8 6M6 10v11M18 10v11M10 10v11M14 10v11"/></Svg>;

/* ── UI / action glyphs ──────────────────────────────────────────── */
export const GlobeIcon    = (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></Svg>;
export const BoltIcon     = (p) => <Svg {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></Svg>;
export const AlertIcon    = (p) => <Svg {...p}><path d="M12 2L1 21h22L12 2z"/><path d="M12 9v5M12 17h.01"/></Svg>;
export const ChartIcon    = (p) => <Svg {...p}><path d="M3 21h18M6 17V9M11 17V5M16 17v-6M21 17v-3"/></Svg>;
export const LineChartIcon= (p) => <Svg {...p}><path d="M3 3v18h18"/><path d="M7 15l4-6 4 3 5-8"/></Svg>;
export const TableIcon    = (p) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 10h18M9 5v14"/></Svg>;
export const FileIcon     = (p) => <Svg {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></Svg>;
export const DownloadIcon = (p) => <Svg {...p}><path d="M12 3v14M6 11l6 6 6-6M4 21h16"/></Svg>;
export const CopyIcon     = (p) => <Svg {...p}><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9.5A1.5 1.5 0 0 0 5 16h3"/></Svg>;
export const CheckIcon    = (p) => <Svg {...p}><path d="M4 12l5 5L20 6"/></Svg>;
export const RefreshIcon  = (p) => <Svg {...p}><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/></Svg>;
export const SparkleIcon  = (p) => <Svg {...p}><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z"/></Svg>;
export const ErrorIcon    = (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M8 8l8 8M16 8l-8 8"/></Svg>;
export const RadarIcon    = (p) => <Svg {...p}><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 5V3M19 12h2M12 19v2M5 12H3"/></Svg>;
export const HomeIcon     = (p) => <Svg {...p}><path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V10z"/></Svg>;
export const PeaceIcon    = (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 12l7 5M12 12l-7 5"/></Svg>;
export const DotIcon      = (p) => <Svg viewBox="0 0 8 8" {...p}><circle cx="4" cy="4" r="3" fill="currentColor" stroke="none"/></Svg>;

/* ── Map commodity keys → icons for KpiGrid + MacroStrip ─────────── */
export const ASSET_ICONS = {
  brent:     BrentIcon,
  gold:      GoldIcon,
  platinum:  PlatinumIcon,
  palladium: PalladiumIcon,
  usdZar:    FxIcon,
  coal:      CoalIcon,
  r2035:     BondIcon,
};
