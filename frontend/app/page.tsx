import Link from 'next/link';
import {
  fetchNoteEvents,
  buildMethodInsights,
  buildSummary,
  buildSymptomInsights,
  dedupeEventsByPost,
  MethodInsight,
  NoteEvent,
  SymptomInsight,
  SummaryMetrics,
} from '@/lib/noteInsights';
import { MENTAL_HEALTH_TAGS, tagSlugFromLabel } from '@/lib/mentalTags';

export const revalidate = 300;

export default async function HomePage() {
  const events = await fetchNoteEvents();
  const summary = buildSummary(events);
  const methodInsights = buildMethodInsights(events).sort((a, b) => b.positive - a.positive);
  const symptomInsights = buildSymptomInsights(events);
  const normalizedInsights = symptomInsights.map((insight) => ({
    ...insight,
    keyword: normalizeKeyword(insight.keyword),
  }));
  const insightMap = new Map(normalizedInsights.map((insight) => [insight.keyword, insight]));
  const prioritizedTags = Array.from(
    new Set([
      ...MENTAL_HEALTH_TAGS,
      ...normalizedInsights.map((insight) => insight.keyword),
    ])
  ).filter((tag) => tag !== '#未分類');
  const timelineTags = prioritizedTags.slice(0, 6);
  const hashtagBuckets = buildHashtagBuckets(events, timelineTags, 100);
  const navigatorEntries = MENTAL_HEALTH_TAGS.map((tag) => ({
    label: tag,
    insight: insightMap.get(tag),
  }));

  return (
    <div className="bg-white text-slate-900">
      <HeroSection summary={summary} topMethod={methodInsights[0]} focusSymptom={symptomInsights[0]} />
      <main className="max-w-6xl mx-auto px-4 py-16 space-y-16">
        <HowToRead summary={summary} />
        <SymptomNavigator entries={navigatorEntries} />
        <RecoveryPulse summary={summary} />
        <MethodHighlights methods={methodInsights.slice(0, 4)} />
        <HashtagStories buckets={hashtagBuckets} />
        <SymptomExplorer insights={symptomInsights.slice(0, 3)} />
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
      body: 'note のハッシュタグをもとに、うつ・パニック・不眠などでグルーピングしています。タグをタップして事例を絞り込みます。',
    },
    {
      title: '行動と変化を確認',
      body: 'AI が要約した「行動」と「感じた変化」を読み、改善/経過/悪化の件数を比較します。',
    },
    {
      title: '元記事で文脈をチェック',
      body: 'カードの「元記事を読む」から note に移動し、生活背景や経過を含めて判断します。',
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

function SymptomNavigator({
  entries,
}: {
  entries: { label: string; insight?: SymptomInsight }[];
}) {
  if (entries.length === 0) return null;
  return (
    <section className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-500">Symptom tags</p>
          <h2 className="text-xl font-semibold mt-1">症状タグを選んで事例を探す</h2>
        </div>
        <Link href="/analysts" className="text-sm text-emerald-600 hover:text-emerald-700">
          分析コンソールへ →
        </Link>
      </div>
      <div className="flex flex-wrap gap-3">
        {entries.map(({ label, insight }) => (
          <Link
            key={label}
            href={`/tags/${tagSlugFromLabel(label)}`}
            className={`px-4 py-2 rounded-full border text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
              insight ? 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400' : 'bg-white border-slate-100 text-slate-400'
            }`}
          >
            {label}
            {insight ? ` · 肯定 ${insight.positiveShare}%` : ' · データ準備中'}
          </Link>
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
    <section className="bg-white rounded-3xl p-6 border border-slate-200" aria-labelledby="pulse">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Recovery Pulse</p>
          <h2 id="pulse" className="text-2xl font-semibold mt-1">note コミュニティの直近バランス</h2>
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
  if (methods.length === 0) return null;
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-500">Consensus snapshot</p>
          <h2 className="text-3xl font-semibold mt-2">改善報告が多い方法</h2>
        </div>
        <Link href="/analysts" className="text-sm text-emerald-600 hover:text-emerald-700">
          すべて見る →
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {methods.map((method) => (
          <article key={method.method_slug} className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">方法</p>
                <h3 className="text-xl font-semibold">{method.display_name}</h3>
              </div>
              <span className="text-sm text-emerald-600 font-semibold">成功率 {method.successRate}%</span>
            </div>
            {method.sample && (
              <p className="mt-4 text-slate-600 line-clamp-4">
                {method.sample.raw_posts.content}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="px-3 py-1 rounded-full bg-slate-100">改善 {method.positive}</span>
              <span className="px-3 py-1 rounded-full bg-slate-100">経過 {method.neutral}</span>
              <span className="px-3 py-1 rounded-full bg-slate-100">悪化 {method.negative}</span>
            </div>
            {method.sample?.raw_posts.url ? (
              <a
                href={method.sample.raw_posts.url}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
              >
                noteを読む →
              </a>
            ) : (
              <Link href={`/method/${method.method_slug}`} className="mt-6 inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700">
                詳細を見る →
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function HashtagStories({ buckets }: { buckets: HashtagBucket[] }) {
  if (buckets.length === 0) return null;
  return (
    <section className="bg-white rounded-3xl p-6 border border-slate-200 space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-500">Hashtag timeline</p>
          <h2 className="text-2xl font-semibold mt-1">症状タグごとの最新 100 投稿</h2>
          <p className="text-sm text-slate-500">note 公開投稿のみを引用し、ハッシュタグ単位で 100 件まで時系列に並べています。</p>
        </div>
      </div>
      <div className="space-y-10">
        {buckets.map((bucket) => {
          const previewStories = bucket.stories.slice(0, 5);
          const remaining = Math.max(bucket.total - previewStories.length, 0);
          return (
            <article key={bucket.keyword} className="space-y-4">
              <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Hashtag</p>
                  <h3 className="text-2xl font-semibold mt-1">{bucket.keyword}</h3>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span>最新 {previewStories.length} / 全 {bucket.total} 件</span>
                  {remaining > 0 && (
                    <Link href={`/tags/${tagSlugFromLabel(bucket.keyword)}`} className="text-emerald-600 hover:text-emerald-700">
                      もっと見る（残り {remaining} 件） →
                    </Link>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                {previewStories.map((event) => (
                  <HashtagStoryCard key={`${bucket.keyword}-${event.id}-${event.method_slug}`} event={event} hashtag={bucket.keyword} />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SymptomExplorer({ insights }: { insights: SymptomInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <section className="bg-white rounded-3xl p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-500">Symptom Explorer</p>
          <h2 className="text-3xl font-semibold mt-2">症状タグ別のシグナル</h2>
        </div>
        <Link href="/analysts" className="text-sm text-emerald-600 hover:text-emerald-700">
          タグ別内訳 →
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {insights.map((insight) => {
          const label = normalizeKeyword(insight.keyword);
          return (
            <article key={insight.keyword} className="bg-slate-50 rounded-3xl p-5 border border-slate-200">
            <p className="text-sm text-slate-500">症状タグ</p>
            <h3 className="text-xl font-semibold mt-1">{label}</h3>
            <p className="text-sm text-slate-500 mt-3">関連体験 {insight.totalStories} 件</p>
            <p className="text-sm text-slate-500">肯定 {insight.positiveShare}%</p>
            <p className="text-sm text-slate-500 mt-4">よく登場する方法</p>
            <p className="text-lg font-semibold text-slate-900">{insight.topMethod}</p>
            <Link
              href={`/tags/${tagSlugFromLabel(label)}`}
              className="mt-4 inline-flex text-sm text-emerald-600 hover:text-emerald-700"
            >
              投稿を読む →
            </Link>
            </article>
          );
        })}
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

type HashtagBucket = {
  keyword: string;
  total: number;
  stories: NoteEvent[];
};

function buildHashtagBuckets(events: NoteEvent[], tags: string[], perTagLimit: number): HashtagBucket[] {
  if (events.length === 0 || tags.length === 0) return [];
  const uniqueEvents = dedupeEventsByPost(events);
  const grouped = new Map<string, NoteEvent[]>();
  for (const event of uniqueEvents) {
    const key = normalizeKeyword(event.raw_posts.source_keyword);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(event);
  }
  return tags
    .map((tag) => normalizeKeyword(tag))
    .filter((tag) => grouped.has(tag))
    .map((tag) => {
      const ordered = grouped
        .get(tag)!
        .slice()
        .sort((a, b) => new Date(b.raw_posts.posted_at).getTime() - new Date(a.raw_posts.posted_at).getTime());
      return {
        keyword: tag,
        total: ordered.length,
        stories: ordered.slice(0, perTagLimit),
      } satisfies HashtagBucket;
    });
}

function normalizeKeyword(keyword?: string | null) {
  if (!keyword) return '#未分類';
  return keyword.startsWith('#') ? keyword : `#${keyword}`;
}

function HashtagStoryCard({ event, hashtag }: { event: NoteEvent; hashtag: string }) {
  const { label, badgeClass } = effectBadge(event.effect_label);
  return (
    <article className="bg-white px-4 py-5 md:px-6 md:py-6 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{hashtag}</span>
        <span className={badgeClass}>{label}</span>
      </div>
      <p className="text-lg font-semibold text-slate-900">{event.raw_posts.username}</p>
      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{event.raw_posts.content}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{formatDate(event.raw_posts.posted_at)}</span>
        <a href={event.raw_posts.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700">
          元記事を読む →
        </a>
      </div>
    </article>
  );
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
