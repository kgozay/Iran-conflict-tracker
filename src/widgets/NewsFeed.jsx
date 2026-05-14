import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Card, CardHeader } from './Card.jsx';
import { RefreshIcon, NewsIcon } from '../components/Icons.jsx';

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

const SOURCE_STYLE = {
  'Reuters':     { dot: 'bg-warn',  text: 'text-warn',  border: 'border-warn/30',  bg: 'bg-warn/8'  },
  'BBC':         { dot: 'bg-ts',    text: 'text-ts',    border: 'border-ts/30',    bg: 'bg-bg-e'    },
  'Al Jazeera':  { dot: 'bg-bull',  text: 'text-bull',  border: 'border-bull/30',  bg: 'bg-bull/8'  },
};

function timeAgo(isoDate) {
  if (!isoDate) return '';
  const diff = Math.max(0, Date.now() - new Date(isoDate).getTime());
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[240px] bg-bg-c border border-bd rounded p-3 animate-pulse">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-bg-e" />
        <div className="h-2 w-14 bg-bg-e rounded" />
        <div className="h-2 w-10 bg-bg-e rounded ml-auto" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 bg-bg-e rounded w-full" />
        <div className="h-2.5 bg-bg-e rounded w-5/6" />
        <div className="h-2.5 bg-bg-e rounded w-4/6" />
      </div>
      <div className="mt-3 space-y-1">
        <div className="h-2 bg-bg-e rounded w-full" />
        <div className="h-2 bg-bg-e rounded w-3/4" />
      </div>
    </div>
  );
}

function ArticleCard({ article }) {
  const style = SOURCE_STYLE[article.source] ?? SOURCE_STYLE['BBC'];
  const sentiment = article.sentiment;

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-[240px] bg-bg-c border border-bd rounded p-3 flex flex-col gap-2 hover:border-warn/50 hover:-translate-y-px transition-all group"
    >
      {/* Source + time row */}
      <div className="flex items-center gap-1.5">
        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', style.dot)} />
        <span className={clsx('font-mono text-[8px] font-semibold tracking-[1px] px-1 py-px rounded border', style.text, style.border, style.bg)}>
          {article.source.toUpperCase()}
        </span>
        <span className="font-mono text-[8px] text-tm ml-auto whitespace-nowrap">{timeAgo(article.isoDate)}</span>
      </div>

      {/* Headline */}
      <div className="font-sans text-[11px] font-semibold text-tp leading-snug line-clamp-3 group-hover:text-warn transition-colors">
        {article.title}
      </div>

      {/* Sentiment chip */}
      {sentiment === 'bearish' && (
        <span className="font-mono text-[7px] font-semibold tracking-[1px] px-1.5 py-0.5 rounded border bg-bear/10 text-bear border-bear/30 self-start">
          BEARISH SIGNAL
        </span>
      )}
      {sentiment === 'bullish' && (
        <span className="font-mono text-[7px] font-semibold tracking-[1px] px-1.5 py-0.5 rounded border bg-bull/10 text-bull border-bull/30 self-start">
          BULLISH SIGNAL
        </span>
      )}

      {/* Description */}
      {article.description && (
        <div className="font-mono text-[8px] text-tm leading-relaxed line-clamp-2 flex-1">
          {article.description}
        </div>
      )}

      {/* Read more */}
      <div className="flex items-center gap-1 font-mono text-[8px] text-ts group-hover:text-warn transition-colors mt-auto">
        <span>Read more</span>
        <span className="text-[10px]">↗</span>
      </div>
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
    news.map(a => ({ ...a, sentiment: getSentiment(a.title, a.description) })),
    [news]
  );

  const filteredArticles = useMemo(() =>
    sentFilter === 'all' ? articlesWithSentiment : articlesWithSentiment.filter(a => a.sentiment === sentFilter),
    [articlesWithSentiment, sentFilter]
  );

  return (
    <Card>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <NewsIcon className="w-3.5 h-3.5 text-ts" />
          <span className="font-mono text-[9px] font-semibold tracking-[2px] text-ts uppercase">Geopolitical Headlines</span>
          {news.length > 0 && !loading && (
            <span className="font-mono text-[8px] text-ts border border-bd bg-bg-e px-1.5 py-0.5 rounded-sm">
              {news.length} ARTICLES
            </span>
          )}
          {fmtTime && (
            <span className="font-mono text-[8px] text-tm">· {fmtTime} SAST</span>
          )}
        </div>
        <button type="button" onClick={onRefresh} disabled={loading}
          className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[9px] border border-bd bg-bg-c rounded transition-colors cursor-pointer whitespace-nowrap',
            loading ? 'text-tm cursor-not-allowed' : 'text-ts hover:text-tp hover:border-ts',
          )}>
          <RefreshIcon className={clsx('w-3 h-3', loading && 'animate-spin')} />
          {loading ? 'LOADING…' : 'REFRESH'}
        </button>
      </div>

      {/* Sentiment filter pills */}
      <div className="flex items-center gap-px mb-3 bg-bg-c border border-bd rounded overflow-hidden self-start w-fit">
        {SENT_FILTERS.map(f => (
          <button key={f} type="button" onClick={() => setSentFilter(f)}
            className={clsx(
              'px-2.5 py-1 font-mono text-[9px] transition-colors cursor-pointer whitespace-nowrap',
              sentFilter === f ? 'bg-bg-e text-tp' : 'text-ts hover:text-tp hover:bg-bg-h',
            )}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {newsError && !loading && (
        <div className="font-mono text-[9px] text-bear bg-bear/8 border border-bear/30 rounded px-3 py-2 mb-3">
          {newsError} — check Vercel function logs or RSS feed availability.
        </div>
      )}

      <div className="flex gap-2.5 overflow-x-auto pb-1.5" style={{ scrollSnapType: 'x mandatory' }}>
        {loading && news.length === 0 ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filteredArticles.length === 0 ? (
          <div className="flex items-center justify-center w-full py-8 font-mono text-[10px] text-tm">
            {news.length === 0 ? 'No conflict-relevant headlines at this time' : `No ${sentFilter} articles`}
          </div>
        ) : (
          filteredArticles.map((article, i) => (
            <div key={i} style={{ scrollSnapAlign: 'start' }}>
              <ArticleCard article={article} />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
