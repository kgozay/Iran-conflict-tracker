import React, { useState, useRef, useCallback } from 'react';
import { Card } from './Card.jsx';
import { CopyIcon, CheckIcon, SparkleIcon, RefreshIcon, DotIcon } from '../components/Icons.jsx';

function confidenceLabel(dataHealth) {
  if (!dataHealth) return 'Unknown';
  if ((dataHealth.quoteCoverage ?? 0) >= 95 && !dataHealth.bondIsStatic) return 'High confidence';
  if ((dataHealth.quoteCoverage ?? 0) >= 85) return 'Moderate confidence';
  return 'Low confidence';
}

function NoteMeta({ meta, dataHealth }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      <div className="border border-bd bg-bg-e rounded px-2.5 py-2">
        <div className="font-mono text-[7px] tracking-[1.5px] text-tm uppercase">Generated</div>
        <div className="font-mono text-[9px] text-ts mt-0.5">
          {meta?.timestamp ? new Date(meta.timestamp).toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' }) + ' SAST' : '—'}
        </div>
      </div>
      <div className="border border-bd bg-bg-e rounded px-2.5 py-2">
        <div className="font-mono text-[7px] tracking-[1.5px] text-tm uppercase">Data quality</div>
        <div className="font-mono text-[9px] text-ts mt-0.5">{confidenceLabel(dataHealth)}</div>
      </div>
      <div className="border border-bd bg-bg-e rounded px-2.5 py-2">
        <div className="font-mono text-[7px] tracking-[1.5px] text-tm uppercase">Coverage</div>
        <div className="font-mono text-[9px] text-ts mt-0.5">{dataHealth?.quoteCoverage ?? '—'}% · SA 10Y {dataHealth?.bondSource || 'n/a'}</div>
      </div>
    </div>
  );
}

export default function MorningNote({ assets, sectors, cis, stocks, alerts, hasData, dataHealth }) {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(null);

  const generate = useCallback(async () => {
    if (!hasData) return;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setError(null); setNote(null); setMeta(null);

    try {
      const res = await fetch('/api/morning-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets, sectors, cis, stocks, alerts, dataHealth }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Function returned HTTP ' + res.status);
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
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard unavailable */ }
  }

  if (!hasData) {
    return (
      <Card className="h-full">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[9px] font-semibold tracking-[2px] text-ts uppercase">AI Morning Note</span>
          <span className="font-mono text-[8px] bg-bull/10 text-bull border border-bull/30 px-1.5 py-0.5 rounded-sm">GEMINI AI</span>
        </div>
        <div className="flex items-center justify-center h-32 font-mono text-[10px] text-tm text-center">Fetch live data first, then generate your note</div>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <div className="font-mono text-[9px] font-semibold tracking-[2px] text-ts uppercase">AI Morning Note</div>
          <div className="font-mono text-[8px] text-tm mt-1">Sell-side style read: executive take, transmission channels, setups, caveats and risk flag.</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] bg-bull/10 text-bull border border-bull/30 px-1.5 py-0.5 rounded-sm">GEMINI AI</span>
          {note && (
            <button onClick={handleCopy} className="inline-flex items-center gap-1 px-2.5 py-1 font-mono text-[9px] border border-bd bg-bg-c rounded hover:text-tp hover:border-ts transition-colors cursor-pointer">
              {copied ? <><CheckIcon className="w-3 h-3" /> COPIED</> : <><CopyIcon className="w-3 h-3" /> COPY</>}
            </button>
          )}
          <button onClick={generate} disabled={loading} className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[9px] border border-warn/40 bg-warn/5 text-warn rounded hover:bg-warn/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? <><span className="inline-block w-2.5 h-2.5 border border-warn border-t-transparent rounded-full animate-spin" /> GENERATING…</> : note ? <><RefreshIcon className="w-3 h-3" /> REGENERATE</> : <><SparkleIcon className="w-3 h-3" /> GENERATE NOTE</>}
          </button>
        </div>
      </div>

      {!loading && !note && !error && (
        <div className="border border-dashed border-bd/50 rounded p-4">
          <NoteMeta meta={meta} dataHealth={dataHealth} />
          <div className="grid grid-cols-2 gap-2 mb-3">
            {['Executive read','Conflict transmission','Cross-asset diagnosis','Actionable setup'].map(x => (
              <div key={x} className="flex items-center gap-1.5 font-mono text-[8.5px] text-ts bg-bg-e border border-bd rounded px-2 py-1.5">
                <DotIcon className="w-1.5 h-1.5 text-warn" /> {x}
              </div>
            ))}
          </div>
          <button onClick={generate} className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2 font-mono text-[9px] border border-warn/50 bg-warn/5 text-warn rounded hover:bg-warn/15 transition-colors cursor-pointer">
            <SparkleIcon className="w-3 h-3" /> GENERATE DETAILED ANALYST NOTE
          </button>
          <div className="font-mono text-[7px] text-tm/70 text-center mt-2">Requires GEMINI_API_KEY in Vercel. Market data works without Gemini.</div>
        </div>
      )}

      {loading && (
        <div className="space-y-2 mt-1 border border-bd bg-bg-e/40 rounded p-3">
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-3/4" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-full" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-5/6" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-full mt-3" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-2/3" />
          <div className="h-2.5 bg-bd/40 rounded animate-pulse w-4/5" />
          <span className="block font-mono text-[8px] text-ts pt-2">Generating a structured desk note with sector calls, setup triggers and data caveats…</span>
        </div>
      )}

      {error && !loading && (
        <div className="border border-bear/30 bg-bear/5 rounded p-3 space-y-2">
          <p className="font-mono text-[9px] text-bear font-semibold">Generation failed</p>
          <p className="font-mono text-[9px] text-ts leading-relaxed">{error}</p>
          {error.includes('GEMINI_API_KEY') && (
            <p className="font-mono text-[8px] text-tm leading-relaxed">Set <span className="text-warn">GEMINI_API_KEY</span> in Vercel → Project Settings → Environment Variables.</p>
          )}
          <button onClick={generate} className="mt-1 px-3 py-1 font-mono text-[8px] border border-bd rounded hover:border-ts transition-colors cursor-pointer">Try again</button>
        </div>
      )}

      {note && !loading && (
        <div className="space-y-2">
          <NoteMeta meta={meta} dataHealth={dataHealth} />
          {dataHealth?.warnings?.length > 0 && (
            <div className="border border-warn/25 bg-warn/6 rounded p-2 font-mono text-[8px] text-warn leading-relaxed">
              {dataHealth.warnings.slice(0, 2).join(' ')}
            </div>
          )}
          <div className="max-h-[520px] overflow-y-auto border border-bd rounded bg-bg-s/50 p-3">
            <div className="font-mono text-[10.5px] leading-[1.85] text-ts whitespace-pre-wrap">{note}</div>
          </div>
          {meta && (
            <div className="flex items-center gap-3 pt-2 border-t border-bd/40 mt-3">
              <span className="font-mono text-[7px] text-tm/60">{meta.model?.replace('gemini-', 'Gemini ') ?? 'Gemini'}</span>
              <span className="font-mono text-[7px] text-tm/60">{meta.tokens_in} in / {meta.tokens_out} out tokens</span>
              <span className="font-mono text-[7px] text-tm/60 ml-auto">For monitoring only · Not investment advice</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
