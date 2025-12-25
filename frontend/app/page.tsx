import Link from 'next/link';
import {
  fetchNoteEvents,
  buildMethodInsights,
  buildSummary,
  buildSymptomInsights,
  MethodInsight,
  NoteEvent,
  SymptomInsight,
  SummaryMetrics,
} from '@/lib/noteInsights';

export const revalidate = 300;

export default async function HomePage() {
  const events = await fetchNoteEvents();
  const summary = buildSummary(events);
  const methodInsights = buildMethodInsights(events).sort((a, b) => b.positive - a.positive);
  const stories = events.slice(0, 6);
  const symptomInsights = buildSymptomInsights(events).slice(0, 3);

  return (
    <div className="bg-slate-950 text-white">
      <HeroSection summary={summary} topMethod={methodInsights[0]} />
      <main className="max-w-6xl mx-auto px-4 py-16 space-y-16">
        <HowToRead summary={summary} />
        <RecoveryPulse summary={summary} />
        <MethodHighlights methods={methodInsights.slice(0, 4)} />
        <StoriesSection stories={stories} />
        <SymptomExplorer insights={symptomInsights} />
        <CtaPanel />
      </main>
    </div>
  );
}

function HeroSection({ summary, topMethod }: { summary: SummaryMetrics; topMethod?: MethodInsight }) {
  return (
    <section className="border-b border-white/10 bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-16 grid gap-12 lg:grid-cols-[3fr,2fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">MENTAL RECOVERY INTELLIGENCE</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            note の一次体験から「効いた方法」だけを抽出し、誰でも比較できるようにしました。
          </h1>
          <p className="mt-6 text-lg text-slate-200">
            匿名の投稿を AI が構造化し、症状タグ・行動・効果ラベルで整理。医療広告ではなく、当事者同士が参考にできるナレッジとして公開しています。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/analysts" className="px-6 py-3 bg-emerald-400 text-slate-900 font-semibold rounded-full shadow-lg shadow-emerald-400/40">
              メソッドを詳しくみる
            </Link>
            <Link href="/about" className="px-6 py-3 border border-white/30 rounded-full text-white hover:bg-white/10">
              仕組みとバイアス対策
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            最終更新 {summary.lastUpdated ? formatDate(summary.lastUpdated) : '—'} · note 公開投稿のみ / スパム自動除去 / 削除リクエスト対応
          </p>
        </div>
        <div className="bg-white/5 rounded-3xl p-6 space-y-6 backdrop-blur">
          <HeroStat label="note 由来の回復方法" value={`${summary.methodCount} 種類`} />
          <HeroStat label="改善までの証言" value={`${summary.totalPositive.toLocaleString()} 件`} helper={`全${summary.totalReports.toLocaleString()}件中`} />
          <HeroStat label="直近シグナル" value={topMethod ? `${topMethod.display_name} · ${topMethod.successRate}%` : 'データ収集中'} helper="成功率 Top method" />
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="text-3xl font-semibold mt-3 text-white">{value}</p>
      {helper && <p className="text-sm text-slate-400 mt-1">{helper}</p>}
    </div>
  );
}

function HowToRead({ summary }: { summary: SummaryMetrics }) {
  const steps = [
    {
      title: '症状タグを選ぶ',
      body: '「うつ」「パニック」など note の投稿タグでグループ化しています。該当するタグをクリック。',
    },
    {
      title: '再現性が高い方法を見る',
      body: '改善 / 経過 / 悪化の件数から、どの方法に肯定的な声が多いかを把握します。',
    },
    {
      title: '一次体験を読む',
      body: 'カードの「元記事を読む」から note へ移動し、全文を確認できます。',
    },
  ];
  return (
    <section className="bg-white/5 rounded-3xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">How to use</p>
          <h2 className="text-2xl font-semibold mt-1">このダッシュボードの読み方</h2>
        </div>
        <p className="text-sm text-slate-300">現在 {summary.storyCount} 件の note 体験談を解析済み</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <article key={step.title} className="rounded-2xl bg-white/5 p-4 border border-white/10">
            <p className="text-sm text-emerald-300">STEP {index + 1}</p>
            <h3 className="text-lg font-semibold mt-2">{step.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecoveryPulse({ summary }: { summary: SummaryMetrics }) {
  const rows = [
    { label: '改善', value: summary.totalPositive, color: 'bg-emerald-500' },
    { label: '経過観察', value: summary.totalNeutral, color: 'bg-amber-400' },
    { label: '悪化', value: summary.totalNegative, color: 'bg-rose-500' },
  ];
  const total = summary.totalReports || 1;
  return (
    <section className="bg-white text-slate-900 rounded-3xl p-6" aria-labelledby="pulse">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Recovery Pulse</p>
          <h2 id="pulse" className="text-2xl font-semibold mt-1">
            note コミュニティの直近バランス
          </h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">肯定シェア</p>
          <p className="text-3xl font-semibold text-emerald-600">
            {total === 0 ? 0 : Math.round((summary.totalPositive / total) * 100)}%
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {rows.map((row) => {
          const percent = Math.round((row.value / total) * 100);
          return (
            <div key={row.label}>
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>{row.label}</span>
                <span>
                  {row.value} 件 · {percent}%
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full">
                <div className={`h-3 rounded-full ${row.color}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MethodHighlights({ methods }: { methods: MethodInsight[] }) {
  if (methods.length === 0) {
    return null;
  }
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Consensus Snapshot</p>
          <h2 className="text-3xl font-semibold mt-2">改善報告が多い方法</h2>
        </div>
        <Link href="/analysts" className="text-sm text-emerald-300 hover:text-white">
          すべて見る →
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {methods.map((method) => (
          <article key={method.method_slug} className="rounded-3xl bg-white/5 p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{method.display_name}</h3>
              <span className="text-sm text-emerald-300">成功率 {method.successRate}%</span>
            </div>
            {method.sample && (
              <p className="mt-4 text-slate-200 line-clamp-4">{method.sample.raw_posts.content}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="px-3 py-1 rounded-full bg-white/10">改善 {method.positive}</span>
              <span className="px-3 py-1 rounded-full bg-white/10">経過 {method.neutral}</span>
              <span className="px-3 py-1 rounded-full bg-white/10">悪化 {method.negative}</span>
            </div>
            <Link href={`/method/${method.method_slug}`} className="mt-6 inline-flex items-center text-sm text-emerald-300 hover:text-white">
              詳細を見る →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function StoriesSection({ stories }: { stories: NoteEvent[] }) {
  if (stories.length === 0) {
    return null;
  }
  return (
    <section id="stories">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Stories from note</p>
          <h2 className="text-3xl font-semibold mt-2">一次体験の抜粋</h2>
        </div>
        <a className="text-sm text-slate-300 hover:text-white" target="_blank" rel="noreferrer" href="https://note.com/hashtag/%E3%81%86%E3%81%A4">
          note で読む →
        </a>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {stories.map((story) => (
          <article key={story.id} className="bg-white/5 rounded-3xl p-5 border border-white/10">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>#{story.raw_posts.source_keyword || '未分類'}</span>
              <span>
                {story.effect_label === 'positive'
                  ? '✓ 改善'
                  : story.effect_label === 'negative'
                  ? '✗ 悪化'
                  : '経過観察'}
              </span>
            </div>
            <h3 className="text-lg font-semibold mt-2 text-white">{story.method_display_name}</h3>
            <p className="mt-3 text-slate-200 max-h-28 overflow-hidden">{story.raw_posts.content}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>{story.raw_posts.username}</span>
              <span>{formatDate(story.raw_posts.posted_at)}</span>
            </div>
            <a href={story.raw_posts.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm text-emerald-300 hover:text-white">
              元記事を読む →
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function SymptomExplorer({ insights }: { insights: SymptomInsight[] }) {
  if (insights.length === 0) {
    return null;
  }
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Symptom Explorer</p>
          <h2 className="text-3xl font-semibold mt-2">症状タグ別のシグナル</h2>
        </div>
        <Link href="/analysts" className="text-sm text-slate-300 hover:text-white">
          タグ別内訳 →
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {insights.map((insight) => (
          <article key={insight.keyword} className="bg-white/5 rounded-3xl p-5 border border-white/10">
            <p className="text-sm text-slate-300">症状タグ</p>
            <h3 className="text-xl font-semibold mt-1">#{insight.keyword}</h3>
            <p className="text-sm text-slate-400 mt-3">関連体験 {insight.totalStories} 件</p>
            <p className="text-sm text-slate-400">肯定 {insight.positiveShare}%</p>
            <p className="text-sm text-slate-400 mt-4">よく登場する方法</p>
            <p className="text-lg font-semibold text-emerald-200">{insight.topMethod}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CtaPanel() {
  return (
    <section className="bg-white text-slate-900 rounded-3xl p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Community Standard</p>
          <h2 className="text-2xl font-semibold mt-1">note 投稿の削除依頼 / 新しいタグのリクエストはこちら</h2>
          <p className="text-sm text-slate-500 mt-2">一次体験を尊重するため、掲載希望・削除依頼・タグ追加を受け付けています。</p>
        </div>
        <div className="flex flex-col gap-3">
          <a href="mailto:team@mental-ci.jp" className="px-5 py-3 rounded-full bg-emerald-500 text-white font-semibold text-center">
            運営に連絡する
          </a>
          <Link href="/about" className="text-sm text-center text-slate-600 hover:text-slate-900">
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
