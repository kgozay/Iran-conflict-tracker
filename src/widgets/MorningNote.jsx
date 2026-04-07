import React, { useState, useRef, useCallback } from 'react';
import { Card, CardHeader } from './Card.jsx';

export default function MorningNote({ assets, sectors, cis, stocks, hasData }) {
  const [note,      setNote]      = useState(null);   // generated text
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [meta,      setMeta]      = useState(null);   // { model, tokens_in, tokens_out, timestamp }
  const [copied,    setCopied]    = useState(false);
  const abortRef = useRef(null);

  /* ── Generate note via Netlify function ─────────────────────────── */
  const generate = useCallback(async () => {
    if (!hasData) return;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setNote(null);
    setMeta(null);

    try {
      const res = await fetch('/api/morning-note', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ assets, sectors, cis, stocks }),
        signal:  ctrl.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Function returned HTTP ' + res.status);
      }

      setNote(data.note);
      setMeta({
        model:      data.model,
        tokens_in:  data.tokens_in,
        tokens_out: data.tokens_out,
        timestamp:  data.timestamp,
      });
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [assets, sectors, cis, stocks, hasData]);

  /* ── Copy to clipboard ──────────────────────────────────────────── */
  async function handleCopy() {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard not available */ }
  }

  /* ── No data state ──────────────────────────────────────────────── */
  if (!hasData) {
    return (
      <Card className="h-full">
        <CardHeader title="AI Morning Note" badge="GEMINI AI" badgeVariant="live" />
        <div className="flex items-center justify-center h-32 font-mono text-[10px] text-tm text-center">
          Fetch live data first, then generate your note
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[9px] font-semibold tracking-[2px] text-ts uppercase">
          AI Morning Note
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] bg-bull/10 text-bull border border-bull/30 px-1.5 py-0.5 rounded-sm">
            GEMINI AI
          </span>
          {note && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 font-mono text-[9px] border border-bd bg-bg-c rounded hover:text-tp hover:border-ts transition-colors cursor-pointer"
            >
              {copied ? '✓ COPIED' : '📋 COPY'}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 font-mono text-[9px] border border-warn/40 bg-warn/5 text-warn rounded hover:bg-warn/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="inline-block w-2.5 h-2.5 border border-warn border-t-transparent rounded-full animate-spin" />
                GENERATING…
              </>
            ) : note ? '↻ REGENERATE' : '✦ GENERATE NOTE'}
          </button>
        </div>
      </div>

      {/* Empty state — before first generate */}
      {!loading && !note && !error && (
        <div className="flex flex-col items-center justify-center h-36 gap-3 border border-dashed border-bd/50 rounded">
          <span className="font-mono text-[9px] text-ts text-center leading-relaxed px-4">
            Generates a real analyst note using Gemini AI,<br />
            grounded in your live JSE + macro data.
          </span>
          <button
            onClick={generate}
            className="px-4 py-1.5 font-mono text-[9px] border border-warn/50 bg-warn/5 text-warn rounded hover:bg-warn/15 transition-colors cursor-pointer"
          >
            ✦ GENERATE NOTE
          </button>
          <span className="font-mono text-[7px] text-tm/60">
            Requires free GEMINI_API_KEY — get one at aistudio.google.com
          </span>
        </div>
      )}

      {/* Loading shimmer */}
      {loading && (
        <div className="space-y-2 mt-1">
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-3/4" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-full" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-5/6" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-full mt-3" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-2/3" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-4/5" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-full mt-3" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-3/5" />
          <span className="block font-mono text-[8px] text-ts pt-2">Asking Gemini for market insights…</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="border border-bear/30 bg-bear/5 rounded p-3 space-y-2">
          <p className="font-mono text-[9px] text-bear font-semibold">Generation failed</p>
          <p className="font-mono text-[9px] text-ts leading-relaxed">{error}</p>
          {error.includes('GEMINI_API_KEY') && (
            <p className="font-mono text-[8px] text-tm leading-relaxed">
              → Get free key at aistudio.google.com/app/apikey → Vercel → Project Settings → Environment Variables → Key: <span className="text-warn">GEMINI_API_KEY</span>
            </p>
          )}
          <button
            onClick={generate}
            className="mt-1 px-3 py-1 font-mono text-[8px] border border-bd rounded hover:border-ts transition-colors cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {/* Generated note */}
      {note && !loading && (
        <div className="space-y-1">
          <div className="font-mono text-[10.5px] leading-[1.85] text-ts whitespace-pre-wrap">
            {note}
          </div>
          {meta && (
            <div className="flex items-center gap-3 pt-2 border-t border-bd/40 mt-3">
              <span className="font-mono text-[7px] text-tm/60">
                {meta.model?.replace('gemini-', 'Gemini ') ?? 'Gemini'}
              </span>
              <span className="font-mono text-[7px] text-tm/60">
                {meta.tokens_in}↑ {meta.tokens_out}↓ tokens
              </span>
              <span className="font-mono text-[7px] text-tm/60 ml-auto">
                {meta.timestamp ? new Date(meta.timestamp).toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' }) + ' SAST' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
