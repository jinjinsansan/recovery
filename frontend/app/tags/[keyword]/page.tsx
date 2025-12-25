import Link from 'next/link';
import { fetchNoteEvents, dedupeEventsByPost, NoteEvent } from '@/lib/noteInsights';
import { MENTAL_HEALTH_TAGS, labelFromTagSlug, tagSlugFromLabel } from '@/lib/mentalTags';

export const revalidate = 300;

export default async function TagPage({ params }: { params: { keyword: string } }) {
  const slug = decodeURIComponent(params.keyword ?? '');
  const tagLabel = labelFromTagSlug(slug);
  const events = await fetchNoteEvents({ sourceKeyword: tagLabel, limit: 800 });
  const posts = dedupeEventsByPost(events)
    .sort((a, b) => new Date(b.raw_posts.posted_at).getTime() - new Date(a.raw_posts.posted_at).getTime())
    .slice(0, 100);
  const stats = summarizePosts(posts);

  return (
    <main className="max-w-4xl mx-auto px-4 py-16 space-y-10 text-slate-900">
      <header className="space-y-4">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← ホームに戻る
        </Link>
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">Hashtag timeline</p>
        <h1 className="text-4xl font-semibold">{tagLabel} の最新 100 投稿</h1>
        <p className="text-slate-600">
          note で公開されている一次体験から、{tagLabel} のハッシュタグが付いた投稿を新しい順に最大 100 件まで表示します。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="収集済みの投稿" value={`${stats.total} 件`} />
        <StatCard label="改善シェア" value={`${stats.positiveShare}%`} helper={`改善 ${stats.positive} 件`} tone="text-emerald-600" />
        <StatCard label="悪化シェア" value={`${stats.negativeShare}%`} helper={`悪化 ${stats.negative} 件`} tone="text-rose-600" />
      </section>

      <TagSwitcher activeTag={tagLabel} />

      {posts.length === 0 ? (
        <section className="bg-slate-50 rounded-3xl border border-slate-200 p-6">
          <p className="text-slate-600">まだ {tagLabel} の投稿がありません。別のタグを選んでください。</p>
        </section>
      ) : (
        <section className="space-y-4">
          {posts.map((event) => (
            <TagStoryCard key={event.id} event={event} tagLabel={tagLabel} />
          ))}
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value, helper, tone }: { label: string; value: string; helper?: string; tone?: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-semibold mt-2 ${tone ?? 'text-slate-900'}`}>{value}</p>
      {helper && <p className="text-xs text-slate-500 mt-1">{helper}</p>}
    </article>
  );
}

function TagSwitcher({ activeTag }: { activeTag: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {MENTAL_HEALTH_TAGS.map((tag) => (
        <Link
          key={tag}
          href={`/tags/${tagSlugFromLabel(tag)}`}
          className={`px-3 py-1 rounded-full border text-sm ${
            tag === activeTag ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          {tag}
        </Link>
      ))}
    </div>
  );
}

function TagStoryCard({ event, tagLabel }: { event: NoteEvent; tagLabel: string }) {
  const { label, badgeClass } = effectBadge(event.effect_label);
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{tagLabel}</span>
        <span className={badgeClass}>{label}</span>
      </div>
      <div>
        <p className="text-lg font-semibold">{event.method_display_name}</p>
        <p className="text-sm text-slate-500">{event.raw_posts.username}</p>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{event.raw_posts.content}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{new Date(event.raw_posts.posted_at).toLocaleString('ja-JP')}</span>
        <a href={event.raw_posts.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700">
          noteを読む →
        </a>
      </div>
    </article>
  );
}

function summarizePosts(events: NoteEvent[]) {
  const summary = events.reduce(
    (acc, event) => {
      if (event.effect_label === 'positive') acc.positive += 1;
      else if (event.effect_label === 'negative') acc.negative += 1;
      else acc.neutral += 1;
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 }
  );
  const total = events.length;
  return {
    total,
    positive: summary.positive,
    negative: summary.negative,
    positiveShare: total === 0 ? 0 : Math.round((summary.positive / total) * 100),
    negativeShare: total === 0 ? 0 : Math.round((summary.negative / total) * 100),
  };
}

function effectBadge(effect: NoteEvent['effect_label']) {
  switch (effect) {
    case 'positive':
      return { label: '改善', badgeClass: 'px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100' };
    case 'negative':
      return { label: '悪化', badgeClass: 'px-2 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100' };
    case 'neutral':
    default:
      return { label: '経過観察', badgeClass: 'px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100' };
  }
}
