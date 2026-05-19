import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { RefreshIcon } from '../components/Icons.jsx';

const BEARISH_KW = ['attack','missile','escalat','war','strike','bomb','hostage','explosion','killed','assassin','nuclear threat','surge','sanction','conflict','threat','crisis','tension','provocation'];
const BULLISH_KW = ['ceasefire','peace','deal','agreement','de-escalat','relief','withdraw','negotiat','talk','truce','diplomacy','resolv','calm','stabiliz'];

function getSentiment(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  const bearCount = BEARISH_KW.filter(kw => text.includes(kw)).length;
  const bullCount = BULLISH_KW.filter(kw => text.includes(kw)).length;
  if (bearCount > bullCount) return 'bearish';
  if (bullCount > bearCount) return 'bullish';
  return 'neutral';
}

function timeAgo(isoDate) {
  if (!isoDate) return '';
  const diff = Math.max(0, Date.now() - new Date(isoDate).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SENT_COLOR = { bearish: 'text-bear', bullish: 'text-bull', neutral: 'text-ts' };
const SENT_DOT   = { bearish: 'bg-bear',   bullish: 'bg-bull',   neutral: 'bg-ts'  };

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[300px] glass rounded-xl p-[16px_18px] animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-20 bg-bg-e rounded" />
        <div className="h-4 w-14 bg-bg-e rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-bg-e rounded w-full" />
        <div className="h-3 bg-bg-e rounded w-5/6" />
        <div className="h-3 bg-bg-e rounded w-4/6" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 bg-bg-e rounded w-full" />
        <div className="h-2.5 bg-bg-e rounded w-3/4" />
      </div>
    </div>
  );
}

function ArticleCard({ article, index }) {
  const sentiment = article.sentiment;
  const sentCol   = SENT_COLOR[sentiment] ?? SENT_COLOR.neutral;
  const sentDot   = SENT_DOT[sentiment]   ?? SENT_DOT.neutral;
  const delay     = index != null ? `${index * 60}ms` : '0ms';

  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer"
      className="flex-shrink-0 w-[300px] glass rounded-xl p-[16px_18px]
                 flex flex-col gap-2.5 hover:-translate-y-px transition-all group feed-item-animate"
      style={{ animationDelay: delay }}>
      {/* Source (italic serif) + sentiment */}
      <div className="flex items-center justify-between">
        <span className="font-serif italic text-[15px] text-tp leading-none">
          {article.source}
        </span>
        <span className={clsx('inline-flex items-center gap-[5px] text-[10.5px] font-semibold', sentCol)}>
          <span className={clsx('w-[5px] h-[5px] rounded-full flex-shrink-0', sentDot)} />
          {sentiment}
          {article.aiScore != null && (
            <span className="opacity-60 font-normal">{(article.aiScore * 100).toFixed(0)}%</span>
          )}
        </span>
      </div>

      {/* Headline */}
      <div className="text-[13.5px] font-medium text-tp leading-[1.45] line-clamp-3 group-hover:text-warn transition-colors">
        {article.title}
      </div>

      {/* Snippet */}
      {article.description && (
        <div className="text-[12px] text-ts leading-[1.5] line-clamp-2 flex-1">
          {article.description}
        </div>
      )}

      {/* Time */}
      <div className="text-[10.5px] text-tm mt-auto">{timeAgo(article.isoDate)}</div>
    </a>
  );
}

const SENT_FILTERS = ['all', 'bearish', 'bullish', 'neutral'];

export default function NewsFeed({ news = [], loading, newsError, lastFetched, onRefresh }) {
  const [sentFilter, setSentFilter] = useState('all');

  const fmtTime = useMemo(() =>
    lastFetched
      ? lastFetched.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
      : null,
    [lastFetched]
  );

  const articlesWithSentiment = useMemo(() =>
    news.map(a => ({ ...a, sentiment: a.sentiment || getSentiment(a.title, a.description) })),
    [news]
  );

  const filtered = useMemo(() =>
    sentFilter === 'all' ? articlesWithSentiment : articlesWithSentiment.filter(a => a.sentiment === sentFilter),
    [articlesWithSentiment, sentFilter]
  );

  return (
    <div>
      {/* Section header */}
      <div className="flex items-end justify-between mb-4 gap-3">
        <div>
          <div className="font-serif text-[24px] text-tp leading-none">
            Headlines <span className="italic text-warn">shaping the tape</span>
          </div>
          <div className="text-[12px] text-tm mt-1">
            Reuters · BBC · Al Jazeera{fmtTime ? ` · refreshed ${fmtTime} SAST` : ''}
            {news.length > 0 && !loading && ` · ${news.length} stories`}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Sentiment filter pills */}
          <div className="flex items-center gap-1">
            {SENT_FILTERS.map(f => (
              <button key={f} type="button" onClick={() => setSentFilter(f)}
                aria-pressed={f === sentFilter}
                className={clsx(
                  'px-3 py-[5px] text-[11.5px] font-medium rounded-full cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn/50',
                  f === sentFilter ? 'bg-paper' : 'text-ts hover:text-tp',
                )}
                style={f === sentFilter ? { color: 'var(--color-ink)' } : {}}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" onClick={onRefresh} disabled={loading}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-[5px] text-[11.5px] border border-bd rounded-full transition-colors cursor-pointer',
              loading ? 'text-tm cursor-not-allowed' : 'text-ts hover:text-tp hover:border-ts',
            )}>
            <RefreshIcon className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {newsError && !loading && (
        <div className="text-[12px] text-bear bg-bear/8 border border-bear/30 rounded-lg px-3 py-2 mb-3">
          {newsError} — check Vercel function logs or RSS feed availability.
        </div>
      )}

      {/* Card row */}
      <div className="flex gap-3.5 overflow-x-auto pb-2" style={{ scrollSnapType: 'x mandatory' }}>
        {loading && news.length === 0 ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center w-full py-8 text-[13px] text-tm">
            {news.length === 0 ? 'No conflict-relevant headlines at this time' : `No ${sentFilter} articles`}
          </div>
        ) : (
          filtered.map((article, i) => (
            <div key={article.link || i} style={{ scrollSnapAlign: 'start' }}>
              <ArticleCard article={article} index={i} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
