import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { CopyIcon, CheckIcon, SparkleIcon, RefreshIcon } from '../components/Icons.jsx';

/* ── Inline markdown: **bold**, *italic*, `code` ─────────────────── */
function renderInline(text, baseKey = 0) {
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m;
  let k = baseKey;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2])      parts.push(<strong key={k++} className="text-tp font-semibold">{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={k++} className="italic">{m[3]}</em>);
    else if (m[4]) parts.push(<code key={k++} className="text-warn bg-bg-h px-1 rounded text-[12px] font-mono">{m[4]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

/* ── Markdown table ──────────────────────────────────────────────── */
function MdTable({ lines, id }) {
  const parseRow = (line) =>
    line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

  const isSep = (line) => /^\|?[\s|:-]+\|?$/.test(line.trim());
  const rows = lines.filter(l => !isSep(l));
  if (!rows.length) return null;

  const headers = parseRow(rows[0]);
  const body    = rows.slice(1).map(parseRow);

  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-bd/40">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="border-b border-bd/60 bg-bg-h/60">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2.5 px-3 text-tm font-semibold text-[11.5px] uppercase tracking-[0.06em] whitespace-nowrap">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={clsx('border-b border-bd/20', ri % 2 === 1 && 'bg-bd/[0.04]')}>
              {row.map((cell, ci) => (
                <td key={ci} className="py-2.5 px-3 text-ts leading-snug align-top">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── List (bullet or numbered) ───────────────────────────────────── */
function MdList({ items, ordered }) {
  const Tag  = ordered ? 'ol' : 'ul';
  return (
    <Tag className={clsx('my-2 pl-5 space-y-1', ordered ? 'list-decimal' : 'list-disc')}>
      {items.map((item, i) => (
        <li key={i} className="text-ts leading-relaxed text-[13.5px]">
          {renderInline(item)}
        </li>
      ))}
    </Tag>
  );
}

/* ── Block-level markdown renderer ──────────────────────────────── */
function renderMarkdown(text) {
  if (!text) return null;
  const lines  = text.split('\n');
  const out    = [];
  let i        = 0;
  let key      = 0;

  while (i < lines.length) {
    const raw  = lines[i];
    const line = raw.trimEnd();

    /* blank line */
    if (!line.trim()) { i++; continue; }

    /* horizontal rule */
    if (/^(-{3,}|={3,}|━{3,})/.test(line.trim())) {
      out.push(<hr key={key++} className="border-bd/40 my-5" />);
      i++; continue;
    }

    /* headings */
    const h4m = line.match(/^####\s+(.+)/);
    const h3m = line.match(/^###\s+(.+)/);
    const h2m = line.match(/^##\s+(.+)/);
    const h1m = line.match(/^#\s+(.+)/);
    if (h1m) {
      out.push(<h1 key={key++} className="font-serif text-[22px] text-tp leading-tight mt-6 mb-2">{renderInline(h1m[1])}</h1>);
      i++; continue;
    }
    if (h2m) {
      out.push(<h2 key={key++} className="font-semibold text-[16px] text-tp leading-tight mt-6 mb-2 pb-1 border-b border-bd/40">{renderInline(h2m[1])}</h2>);
      i++; continue;
    }
    if (h3m) {
      out.push(<h3 key={key++} className="font-semibold text-[14.5px] text-tp leading-tight mt-5 mb-1.5">{renderInline(h3m[1])}</h3>);
      i++; continue;
    }
    if (h4m) {
      out.push(<h4 key={key++} className="font-semibold text-[13.5px] text-tp leading-tight mt-4 mb-1">{renderInline(h4m[1])}</h4>);
      i++; continue;
    }

    /* table */
    if (line.trimStart().startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      out.push(<MdTable key={key++} lines={tableLines} id={key} />);
      continue;
    }

    /* blockquote */
    if (line.startsWith('> ')) {
      const ql = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        ql.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <blockquote key={key++} className="border-l-[3px] border-warn/60 pl-4 my-4 bg-warn/[0.04] rounded-r-lg py-2">
          {ql.map((l, j) => (
            <p key={j} className="text-[13.5px] text-ts italic leading-relaxed">{renderInline(l)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    /* bullet list */
    if (/^[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      out.push(<MdList key={key++} items={items} ordered={false} />);
      continue;
    }

    /* numbered list */
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      out.push(<MdList key={key++} items={items} ordered={true} />);
      continue;
    }

    /* italic-only line used as caption (e.g. *— JSE Conflict Watch*) */
    if (/^\*[^*]/.test(line) && line.endsWith('*')) {
      out.push(
        <p key={key++} className="text-[12px] text-tm italic mt-6 pt-4 border-t border-bd/30">
          {renderInline(line)}
        </p>
      );
      i++; continue;
    }

    /* paragraph — collect consecutive non-special lines */
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trimStart().startsWith('|') &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !lines[i].startsWith('> ') &&
      !/^[-*]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^(-{3,}|={3,}|━{3,})/.test(lines[i].trim()) &&
      !/^\*[^*].*\*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      out.push(
        <p key={key++} className="text-[13.5px] text-ts leading-[1.72] my-2">
          {paraLines.map((l, j) => (
            <React.Fragment key={j}>
              {renderInline(l)}
              {j < paraLines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    }
  }

  return out;
}

/* ── Component ───────────────────────────────────────────────────── */
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ assets, sectors, cis, stocks, alerts, dataHealth }),
        signal:  ctrl.signal,
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
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard unavailable */ }
  }

  const genTs = meta?.timestamp
    ? new Date(meta.timestamp).toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' }) + ' SAST'
    : null;

  return (
    <div className="relative glass rounded-[16px] p-[28px_32px] overflow-hidden">
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
            {genTs ? `Generated ${genTs} · structured analyst brief` : 'Sell-side style brief — transmission channels, stock ratings, portfolio positioning'}
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

      {/* Empty state */}
      {!loading && !note && !error && (
        <div className="border border-bd/60 border-dashed rounded-xl p-6 text-center">
          <div className="text-[13.5px] text-ts mb-4 leading-[1.6]">
            Get a structured analyst brief with market dashboard, stock ratings, conflict transmission analysis, and portfolio positioning.
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
        <div className="space-y-3 mt-1">
          <div className="h-[18px] bg-bd/30 rounded animate-pulse w-[60%]" />
          <div className="h-[28px] bg-bd/20 rounded animate-pulse w-full mt-3" />
          {[0.9, 0.75, 1, 0.6, 0.85, 0.7, 1, 0.55, 0.8, 0.65, 0.9, 0.5].map((w, i) => (
            <div key={i} className="h-[13px] bg-bd/25 rounded animate-pulse" style={{ width: `${w * 100}%`, animationDelay: `${i * 60}ms` }} />
          ))}
          <div className="text-[12px] text-ts mt-4">Generating structured analyst brief…</div>
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

      {/* Note body — rendered markdown */}
      {note && !loading && (
        <>
          {dataHealth?.warnings?.length > 0 && (
            <div className="border border-warn/25 bg-warn/6 rounded-lg p-3 text-[12px] text-warn leading-relaxed mb-4">
              {dataHealth.warnings.slice(0, 2).join(' ')}
            </div>
          )}
          <div className="prose-note max-w-none">
            {renderMarkdown(note)}
          </div>
          {meta && (
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-bd/40 text-[11px] text-tm flex-wrap">
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
