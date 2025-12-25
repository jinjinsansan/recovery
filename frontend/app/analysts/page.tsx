import Link from 'next/link';
import { fetchNoteEvents, buildMethodInsights, buildSymptomInsights, MethodInsight, SymptomInsight } from '@/lib/noteInsights';

export const revalidate = 300;

export default async function AnalystsPage() {
  const events = await fetchNoteEvents();
  const methods = buildMethodInsights(events)
    .filter((method) => method.totalReports >= 1)
    .sort((a, b) => b.totalReports - a.totalReports);
  const symptoms = buildSymptomInsights(events);

  return (
    <main className="max-w-6xl mx-auto px-4 py-16 text-white space-y-12">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Analyst Console</p>
        <h1 className="text-4xl font-semibold">メソッド別のコンセンサスを深掘り</h1>
        <p className="text-slate-300 text-sm md:text-base">
          すべての指標は note から抽出した一次データのみで構成。症状タグ・行動・効果ラベル別に可視化し、どの方法がどのくらい肯定的に語られているかを確認できます。
        </p>
      </header>

      <MethodTable methods={methods} />
      <SymptomMatrix symptoms={symptoms} />
      <Link href="/about" className="text-sm text-slate-300 hover:text-white inline-flex items-center">
        データ収集と品質管理について →
      </Link>
    </main>
  );
}

function MethodTable({ methods }: { methods: MethodInsight[] }) {
  if (methods.length === 0) {
    return (
      <section className="bg-white/5 rounded-3rd p-6 border border-white/10">
        <p className="text-slate-300">データを収集中です。</p>
      </section>
    );
  }
  return (
    <section className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
      <div className="px-6 py-5 border-b border-white/10">
        <h2 className="text-2xl font-semibold">方法別サマリ</h2>
        <p className="text-sm text-slate-300 mt-1">成功率は改善件数 / 総件数で算出しています。</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="py-3 px-6">方法</th>
              <th className="py-3 px-6">成功率</th>
              <th className="py-3 px-6">改善 / 経過 / 悪化</th>
              <th className="py-3 px-6">最新 note</th>
              <th className="py-3 px-6">詳細</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((method) => (
              <tr key={method.method_slug} className="border-b border-white/5">
                <td className="py-4 px-6">
                  <p className="font-semibold text-white">{method.display_name}</p>
                  {method.sample && (
                    <p className="text-slate-400 line-clamp-2 text-xs mt-1">{method.sample.raw_posts.content}</p>
                  )}
                </td>
                <td className="py-4 px-6 text-emerald-300 font-semibold">{method.successRate}%</td>
                <td className="py-4 px-6 text-slate-300">
                  {method.positive} / {method.neutral} / {method.negative}
                </td>
                <td className="py-4 px-6 text-slate-300">{formatDate(method.lastReportedAt)}</td>
                <td className="py-4 px-6">
                  <Link href={`/method/${method.method_slug}`} className="text-emerald-300 hover:text-white">
                    ページへ →
                  </Link>
                </td>
              </tr>
            ))}
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
    <section className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">症状タグ別の出現頻度</h2>
        <p className="text-sm text-slate-300">肯定シェアと、投稿内で最も参照された方法を表示しています。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {symptoms.slice(0, 6).map((symptom) => (
          <article key={symptom.keyword} className="rounded-2xl bg-white/5 p-4 border border-white/10">
            <p className="text-sm text-slate-300">#{symptom.keyword}</p>
            <p className="text-sm text-slate-400 mt-2">投稿 {symptom.totalStories} 件</p>
            <p className="text-3xl font-semibold text-white mt-2">{symptom.positiveShare}%</p>
            <p className="text-xs text-slate-400">肯定シェア</p>
            <p className="text-xs text-slate-400 mt-3">よく挙がる方法</p>
            <p className="text-base font-semibold text-emerald-200">{symptom.topMethod}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ja-JP');
}
