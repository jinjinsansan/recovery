import Link from 'next/link';
import {
  fetchNoteEvents,
  buildMethodInsights,
  buildSymptomInsights,
  MethodInsight,
  NoteEvent,
  SymptomInsight,
} from '@/lib/noteInsights';

export const revalidate = 300;

export default async function AnalystsPage() {
  const events = await fetchNoteEvents();
  const methods = buildMethodInsights(events)
    .filter((method) => method.totalReports >= 1)
    .sort((a, b) => b.totalReports - a.totalReports);
  const symptoms = buildSymptomInsights(events);
  const methodKeywords = buildMethodKeywordMap(events);

  return (
    <main className="max-w-6xl mx-auto px-4 py-16 text-slate-900 space-y-12">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">Analyst console</p>
        <h1 className="text-4xl font-semibold">症状タグ × 回復方法の内訳</h1>
        <p className="text-slate-600 text-sm md:text-base">
          すべて note の一次データです。左から「症状タグ → 改善方法 → 成功率 / 件数 → 元記事」の順に並び、タグから改善方法を逆引きできます。
        </p>
      </header>

      <SymptomMatrix symptoms={symptoms} />
      <MethodTable methods={methods} methodKeywords={methodKeywords} />

      <div className="text-sm text-slate-600">
        <Link href="/about" className="inline-flex items-center text-emerald-600 hover:text-emerald-700">
          データ収集とポリシーについて →
        </Link>
      </div>
    </main>
  );
}

function MethodTable({
  methods,
  methodKeywords,
}: {
  methods: MethodInsight[];
  methodKeywords: Record<string, string[]>;
}) {
  if (methods.length === 0) {
    return (
      <section className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
        <p className="text-slate-600">データを収集中です。</p>
      </section>
    );
  }
  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-600">Symptoms → Methods</p>
            <h2 className="text-2xl font-semibold">症状タグから改善方法を逆引き</h2>
          </div>
          <p className="text-sm text-slate-500">成功率 = 改善件数 / 総件数（直近 30 件）</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-slate-700">
          <thead>
            <tr className="text-left border-b border-slate-100">
              <th className="py-3 px-6 w-56">症状タグ</th>
              <th className="py-3 px-6">改善方法</th>
              <th className="py-3 px-6 w-48">成功率 / 件数</th>
              <th className="py-3 px-6 w-48">最新 note</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((method) => {
              const tags = methodKeywords[method.method_slug] ?? [];
              const tagBadges = tags.slice(0, 3);
              const sampleUrl = method.sample?.raw_posts.url;
              return (
                <tr key={method.method_slug} className="border-b border-slate-100">
                  <td className="py-4 px-6">
                    {tagBadges.length === 0 ? (
                      <span className="text-slate-400 text-sm">タグ情報なし</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {tagBadges.map((tag) => (
                          <span key={tag} className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-lg font-semibold text-slate-900">{method.display_name}</p>
                    {method.sample && (
                      <p className="text-slate-500 line-clamp-2 text-sm mt-2">“{method.sample.raw_posts.content}”</p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-2xl font-semibold text-emerald-600">{method.successRate}%</p>
                    <p className="text-xs text-slate-500 mt-1">
                      改善 {method.positive} / 経過 {method.neutral} / 悪化 {method.negative}
                    </p>
                    <div className="mt-2 h-2 bg-slate-100 rounded-full">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${method.successRate}%` }} />
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm text-slate-500">{formatDate(method.lastReportedAt)}</p>
                    {sampleUrl ? (
                      <a href={sampleUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm text-emerald-600 hover:text-emerald-700">
                        noteを読む →
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">元記事準備中</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SymptomMatrix({ symptoms }: { symptoms: SymptomInsight[] }) {
  if (symptoms.length === 0) {
    return null;
  }
  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">症状タグ別の出現頻度</h2>
        <p className="text-sm text-slate-500">肯定シェアと、投稿内で最も参照された方法を表示しています。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {symptoms.slice(0, 6).map((symptom) => (
          <article key={symptom.keyword} className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
            <p className="text-sm text-slate-500">{normalizeKeyword(symptom.keyword)}</p>
            <p className="text-sm text-slate-500 mt-2">投稿 {symptom.totalStories} 件</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{symptom.positiveShare}%</p>
            <p className="text-xs text-slate-500">肯定シェア</p>
            <p className="text-xs text-slate-500 mt-3">よく挙がる方法</p>
            <p className="text-base font-semibold text-slate-900">{symptom.topMethod}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildMethodKeywordMap(events: NoteEvent[]): Record<string, string[]> {
  const map = new Map<string, Map<string, number>>();
  for (const event of events) {
    const keyword = normalizeKeyword(event.raw_posts.source_keyword?.trim());
    if (!keyword) continue;
    if (!map.has(event.method_slug)) {
      map.set(event.method_slug, new Map());
    }
    const bucket = map.get(event.method_slug)!;
    bucket.set(keyword, (bucket.get(keyword) ?? 0) + 1);
  }
  const result: Record<string, string[]> = {};
  for (const [slug, keywordMap] of map.entries()) {
    result[slug] = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([keyword]) => keyword);
  }
  return result;
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ja-JP');
}

function normalizeKeyword(keyword?: string | null) {
  if (!keyword) return '#未分類';
  return keyword.startsWith('#') ? keyword : `#${keyword}`;
}
