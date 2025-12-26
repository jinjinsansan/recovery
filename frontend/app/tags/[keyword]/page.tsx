import Link from 'next/link';
import { fetchNoteEvents, buildTagSummaries, TagSummaryItem } from '@/lib/noteInsights';
import { MENTAL_HEALTH_TAGS, labelFromTagSlug, tagSlugFromLabel } from '@/lib/mentalTags';

export const revalidate = 300;

export default async function TagPage({ params }: { params: { keyword: string } }) {
  const slug = decodeURIComponent(params.keyword ?? '');
  const tagLabel = labelFromTagSlug(slug);
  const events = await fetchNoteEvents({ sourceKeyword: tagLabel, limit: 800 });
  const tagSummaryMap = buildTagSummaries(events);
  const posts = (tagSummaryMap[tagLabel] ?? []).slice(0, 100);
  const totalAvailable = tagSummaryMap[tagLabel]?.length ?? 0;
  const latestPostedAt = posts[0]?.postedAt;

  return (
    <main className="max-w-4xl mx-auto px-4 py-16 space-y-10 text-slate-900">
      <header className="space-y-4">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← ホームに戻る
        </Link>
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">Symptom summary</p>
        <h1 className="text-4xl font-semibold">{tagLabel} の改善サマリー一覧</h1>
        <p className="text-slate-600">
          AI が note の一次体験から「改善した」と報告された方法だけを抽出し、{tagLabel} のタグに絞って最大 100 件まで表示します。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="表示中の改善サマリー" value={`${posts.length} 件`} />
        <StatCard label="このタグの全サマリー" value={`${totalAvailable} 件`} tone="text-emerald-600" />
        <StatCard label="最新更新日" value={latestPostedAt ? new Date(latestPostedAt).toLocaleDateString('ja-JP') : '—'} />
      </section>

      <TagSwitcher activeTag={tagLabel} />

      {posts.length === 0 ? (
        <section className="bg-slate-50 rounded-3xl border border-slate-200 p-6">
          <p className="text-slate-600">まだ {tagLabel} の投稿がありません。別のタグを選んでください。</p>
        </section>
      ) : (
        <section className="space-y-4">
          {posts.map((item) => (
            <TagSummaryCard key={item.id} item={item} />
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

function TagSummaryCard({ item }: { item: TagSummaryItem }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{item.tag}</span>
        <span className="text-emerald-600 font-semibold">改善</span>
      </div>
      <div>
        <p className="text-lg font-semibold">{item.method}</p>
        <p className="text-sm text-slate-500">{item.username}</p>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">{item.content}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{new Date(item.postedAt).toLocaleString('ja-JP')}</span>
        <a href={item.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700">
          noteを読む →
        </a>
      </div>
    </article>
  );
}
