import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { CopyIcon, CheckIcon, SparkleIcon, RefreshIcon } from '../components/Icons.jsx';

export default function MorningNote({ assets, sectors, cis, stocks, alerts, hasData, dataHealth }) {
  const [note, setNote]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [meta, setMeta]       = useState(null);
  const [copied, setCopied]   = useState(false);
  const abortRef = useRef(null);

  const generate = useCallback(async () => {
    if (!hasData) return;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(null); setNote(null); setMeta(null);
    try {
      const res  = await fetch('/api/morning-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets, sectors, cis, stocks, alerts, dataHealth }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      setNote(data.note);
      setMeta({ model: data.model, tokens_in: data.tokens_in, tokens_out: data.tokens_out, timestamp: data.timestamp });
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [assets, sectors, cis, stocks, alerts, dataHealth, hasData]);

  async function handleCopy() {
    if (!note) return;
    try { await navigator.clipboard.writeText(note); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { /* clipboard unavailable */ }
  }

  const genTs = meta?.timestamp
    ? new Date(meta.timestamp).toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' }) + ' SAST'
    : null;

  return (
    <div className="relative glass rounded-[16px] p-[28px_32px] overflow-hidden">
      {/* Gold accent rule */}
      <div className="absolute top-0 left-0 w-20 h-[2px] bg-warn opacity-90" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-[18px] flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="font-serif text-[28px] text-tp leading-none">
              The morning <span className="italic text-warn">note</span>
            </div>
            <span className="text-[10px] font-semibold text-warn tracking-[0.06em] px-[9px] py-[3px] rounded-full"
              style={{ background: 'rgba(232,176,74,0.12)', border: '1px solid rgba(232,176,74,0.25)' }}>
              GEMINI 2.5
            </span>
          </div>
          <div className="text-[12px] text-tm mt-1.5">
            {genTs ? `Generated ${genTs} · ~3 min read` : 'Sell-side style brief — transmission channels, setups, caveats'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {note && (
            <button onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-[14px] py-2 text-[11.5px] font-medium text-ts bg-bg-h border border-bd rounded-lg hover:text-tp transition-colors cursor-pointer">
              {copied ? <><CheckIcon className="w-3.5 h-3.5" />Copied</> : <><CopyIcon className="w-3.5 h-3.5" />Copy</>}
            </button>
          )}
          <button onClick={generate} disabled={loading || !hasData}
            className={clsx(
              'inline-flex items-center gap-1.5 px-[14px] py-2 text-[11.5px] font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              note ? 'text-ts bg-bg-h border border-bd hover:text-tp' : 'bg-paper hover:opacity-90',
            )}
            style={!note ? { color: 'var(--color-ink)' } : {}}>
            {loading
              ? <><span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin inline-block" />Generating…</>
              : note
                ? <><RefreshIcon className="w-3.5 h-3.5" />Regenerate</>
                : <><SparkleIcon className="w-3.5 h-3.5" />Generate note</>}
          </button>
        </div>
      </div>

      {/* Empty prompt */}
      {!loading && !note && !error && (
        <div className="border border-bd/60 border-dashed rounded-xl p-6 text-center">
          <div className="text-[13.5px] text-ts mb-4 leading-[1.6]">
            Get a structured analyst brief: executive read, conflict transmission channels, sector calls, caveats and risk flags.
          </div>
          <button onClick={generate} disabled={!hasData}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-[13px] font-medium rounded-lg transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-paper"
            style={{ color: 'var(--color-ink)' }}>
            <SparkleIcon className="w-3.5 h-3.5" />
            {hasData ? 'Generate detailed analyst note' : 'Fetch live data first'}
          </button>
          <div className="text-[11px] text-tx mt-3">Requires GEMINI_API_KEY · market data works without Gemini</div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2.5 mt-1">
          {[0.75, 1, 0.83, 1, 0.67, 0.9, 0.6].map((w, i) => (
            <div key={i} className="h-[14px] bg-bd/30 rounded animate-pulse" style={{ width: `${w * 100}%` }} />
          ))}
          <div className="text-[12px] text-ts mt-4">Generating a structured desk note…</div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="border border-bear/30 bg-bear/5 rounded-xl p-4 space-y-2">
          <p className="text-[13px] text-bear font-medium">Generation failed</p>
          <p className="text-[13px] text-ts leading-relaxed">{error}</p>
          {error.includes('GEMINI_API_KEY') && (
            <p className="text-[12px] text-tm">Set <span className="text-warn">GEMINI_API_KEY</span> in Vercel → Project Settings → Environment Variables.</p>
          )}
          <button onClick={generate} className="mt-1 px-4 py-1.5 text-[12px] text-ts border border-bd rounded-lg hover:border-ts transition-colors cursor-pointer">Try again</button>
        </div>
      )}

      {/* Note body — 2-column layout */}
      {note && !loading && (
        <>
          {dataHealth?.warnings?.length > 0 && (
            <div className="border border-warn/25 bg-warn/6 rounded-lg p-3 text-[12px] text-warn leading-relaxed mb-4">
              {dataHealth.warnings.slice(0, 2).join(' ')}
            </div>
          )}
          <div className="text-[14px] text-tp leading-[1.75] whitespace-pre-wrap opacity-92"
            style={{ columnCount: 2, columnGap: 32 }}>
            {note}
          </div>
          {meta && (
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-bd/40 text-[11px] text-tm">
              <span>{meta.model?.replace('gemini-', 'Gemini ') ?? 'Gemini'}</span>
              <span>{meta.tokens_in} in / {meta.tokens_out} out tokens</span>
              <span className="ml-auto">For monitoring only · Not investment advice</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
