import Link from 'next/link';
import { TagSummarySelector } from '@/components/TagSummarySelector';
import {
  fetchNoteEvents,
  buildMethodInsights,
  buildSummary,
  buildSymptomInsights,
  buildTagSummaries,
  MethodInsight,
  SymptomInsight,
  SummaryMetrics,
} from '@/lib/noteInsights';
import { MENTAL_HEALTH_TAGS } from '@/lib/mentalTags';

export const revalidate = 300;

export default async function HomePage() {
  const events = await fetchNoteEvents();
  const summary = buildSummary(events);
  const methodInsights = buildMethodInsights(events).sort((a, b) => b.positive - a.positive);
  const symptomInsights = buildSymptomInsights(events);
  const tagSummaries = buildTagSummaries(events);
  const tagOptions = Array.from(new Set([...MENTAL_HEALTH_TAGS, ...Object.keys(tagSummaries)])).reduce<
    { label: string; total: number }[]
  >((acc, label) => {
    if (!label || label === '#未分類') return acc;
    acc.push({ label, total: tagSummaries[label]?.length ?? 0 });
    return acc;
  }, []);

  return (
    <div className="bg-white text-slate-900">
      <HeroSection summary={summary} topMethod={methodInsights[0]} focusSymptom={symptomInsights[0]} />
      <main className="max-w-6xl mx-auto px-4 py-16 space-y-12">
        <TagSummarySelector tags={tagOptions} summaries={tagSummaries} />
        <HowToRead summary={summary} />
        <CtaPanel />
      </main>
    </div>
  );
}

function HeroSection({
  summary,
  topMethod,
  focusSymptom,
}: {
  summary: SummaryMetrics;
  topMethod?: MethodInsight;
  focusSymptom?: SymptomInsight;
}) {
  const positiveRate = summary.totalReports === 0 ? 0 : Math.round((summary.totalPositive / summary.totalReports) * 100);
  return (
    <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-16 grid gap-12 lg:grid-cols-[3fr,2fr]">
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-600">MENTAL RECOVERY INTELLIGENCE</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900">
              note の一次体験から「症状 × 行動 × 効果」を構造化し、当事者が再現できるように翻訳します。
            </h1>
          </div>
          <p className="text-lg text-slate-600">
            note で公開された回復の記録を 1 本ずつ読み、AI が症状タグ・行動・感じた変化を抽出。医療広告ではなく、同じ悩みを抱える人が安心して参考にできる土台をつくります。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/analysts" className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-full">
              症状別の兆しを見る
            </Link>
            <Link href="/about" className="px-6 py-3 border border-slate-300 rounded-full text-slate-700 hover:border-slate-500">
              プロジェクトの目的
            </Link>
          </div>
          <p className="text-sm text-slate-500">
            最終更新 {summary.lastUpdated ? formatDate(summary.lastUpdated) : '—'} ・ note 公開投稿のみ / 削除リクエスト対応 / スパム除外
          </p>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
          <HeroStat label="解析済みの回復方法" value={`${summary.methodCount} 種類`} />
          <HeroStat label="改善シェア" value={`${positiveRate}%`} helper={`全${summary.totalReports}件のうち`} />
          <HeroStat
            label="注目の症状タグ"
            value={focusSymptom ? normalizeKeyword(focusSymptom.keyword) : 'データ収集中'}
            helper={focusSymptom ? `肯定 ${focusSymptom.positiveShare}%` : undefined}
          />
          {topMethod && (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="text-slate-500">直近で語られている方法</p>
              <p className="text-lg font-semibold text-slate-900">{topMethod.display_name}</p>
              <p className="text-slate-500">成功率 {topMethod.successRate}% · {topMethod.positive + topMethod.neutral + topMethod.negative} 件</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="text-3xl font-semibold mt-2 text-slate-900">{value}</p>
      {helper && <p className="text-sm text-slate-500 mt-1">{helper}</p>}
    </div>
  );
}

function HowToRead({ summary }: { summary: SummaryMetrics }) {
  const steps = [
    {
      title: '症状タグを選ぶ',
      body: 'タグを選んで「調べる」を押すと、AI が抽出した改善サマリーが 5 件表示されます。',
    },
    {
      title: '改善した方法を確認',
      body: 'カードには AI が読み取った「改善した方法」と実際の本文サマリーが入っています。',
    },
    {
      title: '元記事を読む',
      body: 'note へのリンクから一次体験を必ず読み、生活背景や条件を踏まえて取り入れてください。',
    },
  ];
  return (
    <section className="bg-white rounded-3xl p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-500">How to use</p>
          <h2 className="text-2xl font-semibold mt-1">このダッシュボードの読み方</h2>
        </div>
        <p className="text-sm text-slate-500">現在 {summary.storyCount} 件の note 体験談を解析済み</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <article key={step.title} className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-xs font-semibold text-emerald-600">STEP {index + 1}</p>
            <h3 className="text-lg font-semibold mt-2">{step.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CtaPanel() {
  return (
    <section className="bg-slate-900 text-white rounded-3xl p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-200">Community standard</p>
          <h2 className="text-2xl font-semibold mt-1">note 投稿の削除依頼 / 新しいタグの提案</h2>
          <p className="text-sm text-slate-200 mt-2">一次体験の尊重を最優先に、削除・匿名化・タグ追加の依頼を受け付けています。</p>
        </div>
        <div className="flex flex-col gap-3">
          <a href="mailto:team@mental-ci.jp" className="px-5 py-3 rounded-full bg-white text-slate-900 font-semibold text-center">
            運営に連絡する
          </a>
          <Link href="/about" className="text-sm text-center text-slate-200 hover:text-white">
            データポリシーを読む →
          </Link>
        </div>
      </div>
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ja-JP');
}

function normalizeKeyword(keyword?: string | null) {
  if (!keyword) return '#未分類';
  return keyword.startsWith('#') ? keyword : `#${keyword}`;
}
