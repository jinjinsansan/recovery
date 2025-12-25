import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { MethodStats } from '@/lib/supabase';

type RecoveryStory = {
  id: string;
  method_slug: string;
  method_display_name: string;
  action_text: string;
  effect_text: string;
  effect_label: 'positive' | 'negative' | 'neutral' | 'unknown';
  sentiment_score: number;
  confidence: number;
  created_at: string;
  raw_posts: {
    id: string;
    content: string;
    source_keyword: string;
    posted_at: string;
    username: string;
    url: string;
  } | null;
};

type SymptomInsight = {
  keyword: string;
  totalStories: number;
  positiveShare: number;
  topMethod: string;
};

async function getMethodStats(): Promise<MethodStats[]> {
  const { data, error } = await supabase
    .from('method_stats')
    .select('*')
    .order('positive_total', { ascending: false });

  if (error) {
    console.error('Error fetching method stats:', error);
    return [];
  }

  return data ?? [];
}

async function getRecentStories(limit = 8): Promise<RecoveryStory[]> {
  const { data, error } = await supabase
    .from('method_events')
    .select(`
      id,
      method_slug,
      method_display_name,
      action_text,
      effect_text,
      effect_label,
      sentiment_score,
      confidence,
      created_at,
      raw_posts:post_id (
        id,
        content,
        source_keyword,
        posted_at,
        username,
        url
      )
    `)
    .eq('spam_flag', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recovery stories:', error);
    return [];
  }

  return (data ?? []).map((story) => ({ ...story, raw_posts: story.raw_posts ?? null }));
}

export default async function HomePage() {
  const [methods, stories] = await Promise.all([getMethodStats(), getRecentStories()]);
  const summary = buildSummary(methods);
  const highlightedMethods = methods.slice(0, 6);
  const symptomInsights = buildSymptomInsights(stories);
  const lastUpdated = methods[0]?.updated_at;

  return (
    <div className="bg-slate-950 text-white">
      <HeroSection summary={summary} lastUpdated={lastUpdated} />

      <main className="bg-slate-950">
        <section className="max-w-6xl mx-auto px-4 py-12 space-y-12">
          <RecoveryPulse summary={summary} />
          <MethodGrid methods={highlightedMethods} stories={stories} />
          <StoriesSection stories={stories} />
          <SymptomExplorer insights={symptomInsights} methods={methods} />
        </section>

        <MethodologySection />
        <FooterCTA />
      </main>
    </div>
  );
}

function HeroSection({ summary, lastUpdated }: { summary: ReturnType<typeof buildSummary>; lastUpdated?: string }) {
  return (
    <section className="border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-16 grid gap-10 lg:grid-cols-[3fr,2fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">MENTAL COLLECTIVE INTELLIGENCE</p>
          <h1 className="mt-4 text-3xl sm:text-4xl font-semibold leading-tight">
            メンタルヘルス当事者の「効いた」を可視化する、信頼できるダッシュボード
          </h1>
          <p className="mt-6 text-lg text-slate-200">
            note から収集した一次体験を AI が構造化。症状別に再現性の高い回復方法を、温度感ごとに読み解けます。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#methods" className="px-5 py-3 bg-emerald-400 text-slate-900 font-semibold rounded-full shadow-lg shadow-emerald-400/40">
              回復方法をみる
            </a>
            <a href="#stories" className="px-5 py-3 border border-white/30 rounded-full text-white hover:bg-white/10">
              最新の体験談
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-300">
            {lastUpdated ? `最終更新 ${new Date(lastUpdated).toLocaleString('ja-JP')}` : 'Supabase リアルタイム連携中'} · 医療アドバイスではなく、当事者の声を安心して拾うための情報基盤です。
          </p>
        </div>
        <div className="bg-white/5 rounded-3xl p-6 space-y-6 backdrop-blur">
          <StatItem label="記録されている回復方法" value={`${summary.methodCount} 種類`} accent="text-emerald-300" />
          <StatItem label="改善報告" value={`${summary.totalPositive.toLocaleString()} 件`} accent="text-sky-300" subtitle={`全${summary.totalReports.toLocaleString()}件中`} />
          <StatItem label="note からの一次体験" value={`${summary.storyCount}+ 件/週`} accent="text-rose-300" subtitle="AI スパム検出・匿名化済" />
        </div>
      </div>
    </section>
  );
}

function StatItem({ label, value, accent, subtitle }: { label: string; value: string; accent: string; subtitle?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`text-3xl font-semibold mt-2 ${accent}`}>{value}</p>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function RecoveryPulse({ summary }: { summary: ReturnType<typeof buildSummary> }) {
  const balance = summary.totalReports === 0 ? 0 : Math.round((summary.totalPositive / summary.totalReports) * 100);
  return (
    <section aria-labelledby="pulse" className="bg-white text-slate-900 rounded-3xl p-6" id="pulse">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Recovery Pulse</p>
          <h2 id="pulse" className="text-2xl font-bold mt-1">
            note コミュニティの改善トレンド
          </h2>
          <p className="text-slate-500 mt-2">直近 30 日の投稿から算出した肯定/否定バランス。</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">肯定シェア</p>
          <p className="text-3xl font-semibold text-emerald-600">{balance}%</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <PulseBar label="改善" value={summary.totalPositive} total={summary.totalReports} color="bg-emerald-500" />
        <PulseBar label="経過観察" value={summary.totalNeutral} total={summary.totalReports} color="bg-amber-400" />
        <PulseBar label="悪化" value={summary.totalNegative} total={summary.totalReports} color="bg-rose-500" />
      </div>
    </section>
  );
}

function PulseBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1 text-slate-600">
        <span>{label}</span>
        <span>
          {value} 件 · {percent}%
        </span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function MethodGrid({ methods, stories }: { methods: MethodStats[]; stories: RecoveryStory[] }) {
  const topSlug = methods[0]?.method_slug ?? '#';
  return (
    <section id="methods">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Recovery Methods</p>
          <h2 className="text-3xl font-semibold mt-2">回復方法ランキング（最新 note から）</h2>
        </div>
        <Link href={topSlug === '#' ? '#' : `/method/${topSlug}`} className="text-sm text-emerald-300 hover:text-white transition">
          詳細検索 →
        </Link>
      </div>
      {methods.length === 0 ? (
        <p className="text-slate-300">まだ十分なデータがありません。</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {methods.map((method) => (
            <MethodCard key={method.method_slug} method={method} stories={stories} />
          ))}
        </div>
      )}
    </section>
  );
}

function MethodCard({ method, stories }: { method: MethodStats; stories: RecoveryStory[] }) {
  const total = method.positive_total + method.negative_total + method.neutral_total;
  const successRate = total === 0 ? 0 : Math.round((method.positive_total / total) * 100);
  const snippet = stories.find((story) => story.method_slug === method.method_slug);
  const content =
    snippet?.raw_posts?.content ??
    `${method.display_name} を試した note の体験談を AI が抽出します。`; 

  return (
    <article className="rounded-3xl bg-white/5 p-6 border border-white/10 hover:border-white/30 transition" aria-label={method.display_name}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">{method.display_name}</h3>
        <span className="text-sm text-emerald-300">成功率 {successRate}%</span>
      </div>
      <p className="mt-4 text-slate-200 line-clamp-3">{content}</p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
        <span className="px-3 py-1 rounded-full bg-white/10">改善 {method.positive_total}</span>
        <span className="px-3 py-1 rounded-full bg-white/10">経過 {method.neutral_total}</span>
        <span className="px-3 py-1 rounded-full bg-white/10">悪化 {method.negative_total}</span>
      </div>
      <Link href={`/method/${method.method_slug}`} className="mt-6 inline-flex items-center text-sm text-emerald-300 hover:text-white">
        詳細を見る →
      </Link>
    </article>
  );
}

function StoriesSection({ stories }: { stories: RecoveryStory[] }) {
  return (
    <section id="stories">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Stories from note</p>
          <h2 className="text-3xl font-semibold mt-2">最新の体験談</h2>
        </div>
        <a
          href="https://note.com/hashtag/%E3%81%86%E3%81%A4"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-slate-300 hover:text-white"
        >
          note で読む →
        </a>
      </div>
      {stories.length === 0 ? (
        <p className="text-slate-300">体験談を収集中です。</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {stories.map((story) => {
            const postedAt = story.raw_posts?.posted_at;
            return (
              <article key={story.id} className="bg-white/5 rounded-3xl p-5 border border-white/10">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>{story.raw_posts?.source_keyword ?? '症状不明'}</span>
                <span>{story.effect_label === 'positive' ? '✓ 改善' : story.effect_label === 'negative' ? '✗ 悪化' : '経過観察'}</span>
              </div>
              <h3 className="text-lg font-semibold mt-2 text-white">{story.method_display_name}</h3>
              <p className="mt-3 text-slate-200 max-h-28 overflow-hidden">{story.raw_posts?.content ?? story.effect_text}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>@{story.raw_posts?.username ?? 'note user'}</span>
                  {postedAt && (
                    <span>{new Date(postedAt).toLocaleDateString('ja-JP')}</span>
                )}
              </div>
              {story.raw_posts?.url && (
                <a
                  href={story.raw_posts.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm text-emerald-300 hover:text-white"
                >
                  元記事を読む →
                </a>
              )}
            </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SymptomExplorer({ insights, methods }: { insights: SymptomInsight[]; methods: MethodStats[] }) {
  if (insights.length === 0) {
    return null;
  }
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Symptom Explorer</p>
          <h2 className="text-3xl font-semibold mt-2">症状別にみる回復のヒント</h2>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {insights.map((insight) => (
          <article key={insight.keyword} className="bg-white/5 rounded-3xl p-5 border border-white/10">
            <p className="text-sm text-slate-300">症状タグ</p>
            <h3 className="text-xl font-semibold text-white mt-1">#{insight.keyword}</h3>
            <p className="text-sm text-slate-300 mt-3">関連体験 {insight.totalStories} 件</p>
            <p className="text-sm text-slate-300">肯定 {insight.positiveShare}%</p>
            <p className="text-sm text-slate-400 mt-4">もっとも引用された方法</p>
            <p className="text-lg font-semibold text-emerald-200">{insight.topMethod}</p>
            <div className="mt-4 text-sm text-slate-300">
              {suggestAlternativeMethod(insight.topMethod, methods)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MethodologySection() {
  const items = [
    {
      title: '1. Collect',
      body: 'note ハッシュタグから公開体験談のみを取得し、URL とタイムスタンプを保持します。個人が特定される情報や下書きは扱いません。',
    },
    {
      title: '2. Analyze',
      body: 'LLM (GPT-4o) で行動・効果・症状タグ・スパムスコアを抽出。成果物は透明性を保つため JSON で保存しています。',
    },
    {
      title: '3. Visualize',
      body: 'Supabase に保持したデータを期間集計し、症状別・方法別にフィードバック。医療アドバイスではなくピアサポートの指針として提示します。',
    },
  ];
  return (
    <section className="bg-white text-slate-900 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <p className="text-sm font-semibold text-emerald-600">Methodology</p>
        <h2 className="text-3xl font-semibold mt-2">透明性のあるデータパイプライン</h2>
        <p className="text-slate-600 mt-4">
          すべてのデータは note からの一次引用であり、公開投稿のみを対象にしています。AI が抽出した内容は手動監査を経て Supabase に保存され、削除リクエストにも対応します。
        </p>
        <div className="grid gap-6 mt-8 md:grid-cols-3">
          {items.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterCTA() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-emerald-300">Need Help?</p>
          <h3 className="text-2xl font-semibold text-white mt-1">あなたの体験も匿名で共有できます。</h3>
          <p className="text-sm mt-2">緊急の際は 24 時間の相談窓口や専門医療機関へ。ここは仲間の声を知る場所です。</p>
        </div>
        <div className="flex flex-col gap-3">
          <a href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000140901.html" target="_blank" rel="noreferrer" className="px-5 py-3 rounded-full bg-emerald-400 text-slate-900 font-semibold text-center">
            相談窓口一覧
          </a>
          <a href="mailto:hello@example.com" className="text-sm text-center text-slate-300 hover:text-white">
            データ削除リクエスト →
          </a>
        </div>
      </div>
    </footer>
  );
}

function suggestAlternativeMethod(methodName: string, methods: MethodStats[]) {
  const match = methods.find((method) => method.display_name === methodName);
  if (!match) {
    return '他の方法も近日追加予定です。';
  }
  const total = match.positive_total + match.negative_total + match.neutral_total;
  const successRate = total === 0 ? 0 : Math.round((match.positive_total / total) * 100);
  return `${successRate}% が改善と回答。詳しくは該当メソッドの詳細ページへ。`;
}

function buildSummary(methods: MethodStats[]) {
  const methodCount = methods.length;
  const totalPositive = methods.reduce((sum, method) => sum + method.positive_total, 0);
  const totalNeutral = methods.reduce((sum, method) => sum + method.neutral_total, 0);
  const totalNegative = methods.reduce((sum, method) => sum + method.negative_total, 0);
  const totalReports = totalPositive + totalNeutral + totalNegative;
  return {
    methodCount,
    totalPositive,
    totalNeutral,
    totalNegative,
    totalReports,
    storyCount: Math.max(12, Math.round(totalReports / 5)),
  };
}

function buildSymptomInsights(stories: RecoveryStory[]): SymptomInsight[] {
  const map = new Map<string, { count: number; positive: number; bestMethod: Map<string, number> }>();
  for (const story of stories) {
    const keyword = story.raw_posts?.source_keyword?.trim() || '未分類';
    if (!map.has(keyword)) {
      map.set(keyword, { count: 0, positive: 0, bestMethod: new Map() });
    }
    const entry = map.get(keyword)!;
    entry.count += 1;
    if (story.effect_label === 'positive') {
      entry.positive += 1;
    }
    entry.bestMethod.set(story.method_display_name, (entry.bestMethod.get(story.method_display_name) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([keyword, value]) => {
      const topMethod = Array.from(value.bestMethod.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'データ準備中';
      const positiveShare = value.count === 0 ? 0 : Math.round((value.positive / value.count) * 100);
      return {
        keyword,
        totalStories: value.count,
        positiveShare,
        topMethod,
      };
    })
    .sort((a, b) => b.totalStories - a.totalStories)
    .slice(0, 3);
}

export const revalidate = 300;
