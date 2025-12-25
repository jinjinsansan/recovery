import Link from 'next/link';
import { fetchNoteEvents, NoteEvent } from '@/lib/noteInsights';

export default async function MethodDetailPage({ params }: { params: { slug: string } }) {
  const events = await fetchNoteEvents({ methodSlug: params.slug });
  const stats = summarize(events);

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900 px-4">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-semibold">まだ note 体験談がありません</h1>
          <p className="text-sm text-slate-600">この方法の一次情報を収集中です。別の方法を参照するか、投稿をご共有ください。</p>
          <Link href="/analysts" className="inline-flex text-emerald-600 hover:text-emerald-700 text-sm">
            メソッド一覧へ戻る →
          </Link>
        </div>
      </div>
    );
  }

  const totalReports = stats.total;
  const successRate = stats.successRate;
  const recentStories = events.slice(0, 8);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/analysts" className="text-sm text-emerald-600 hover:text-emerald-700">
            ← メソッド一覧
          </Link>
          <h1 className="text-4xl font-semibold mt-2">{stats.displayName}</h1>
          <p className="text-slate-600 text-sm mt-2">
            note の一次体験 {totalReports} 件から算出 · 最終更新 {formatDate(stats.lastReportedAt)}
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-4 text-center">
            <Stat label="総件数" value={`${totalReports}`} />
            <Stat label="改善" value={`${stats.positive}`} tone="text-emerald-600" />
            <Stat label="悪化" value={`${stats.negative}`} tone="text-rose-500" />
            <Stat label="成功率" value={`${successRate}%`} />
          </div>
          <div className="mt-6 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${successRate}%` }} />
          </div>
        </section>

        <section className="bg-slate-50 rounded-3xl border border-slate-200">
          <div className="px-6 py-5 border-b border-slate-200">
            <h2 className="text-2xl font-semibold">note 体験談</h2>
            <p className="text-sm text-slate-600">投稿本文は note へリンク。個人が特定される情報や DM は収集していません。</p>
          </div>
          <div className="divide-y divide-slate-200">
            {recentStories.length === 0 ? (
              <p className="px-6 py-10 text-slate-500">まだ体験談がありません。</p>
            ) : (
              recentStories.map((event) => <StoryRow key={event.id} event={event} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function summarize(events: NoteEvent[]) {
  if (events.length === 0) return null;
  const counts = events.reduce(
    (acc, event) => {
      if (event.effect_label === 'positive') acc.positive += 1;
      else if (event.effect_label === 'negative') acc.negative += 1;
      else acc.neutral += 1;
      if (!acc.lastReportedAt || new Date(event.raw_posts.posted_at) > new Date(acc.lastReportedAt)) {
        acc.lastReportedAt = event.raw_posts.posted_at;
      }
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0, lastReportedAt: events[0].raw_posts.posted_at }
  );
  const total = counts.positive + counts.negative + counts.neutral;
  return {
    displayName: events[0].method_display_name,
    total,
    successRate: total === 0 ? 0 : Math.round((counts.positive / total) * 100),
    ...counts,
  };
}

function StoryRow({ event }: { event: NoteEvent }) {
  const label = event.effect_label === 'positive' ? '✓ 改善' : event.effect_label === 'negative' ? '✗ 悪化' : '経過観察';
  return (
    <article className="px-6 py-6 flex flex-col gap-3 bg-white/40">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>#{event.raw_posts.source_keyword || '未分類'}</span>
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold text-slate-900">{event.raw_posts.username}</p>
      <p className="text-slate-700 leading-relaxed">{event.raw_posts.content}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{formatDate(event.raw_posts.posted_at)}</span>
        <a href={event.raw_posts.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700">
          元記事を読む →
        </a>
      </div>
    </article>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-3xl font-semibold mt-2 ${tone ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ja-JP');
}

export const revalidate = 300;
