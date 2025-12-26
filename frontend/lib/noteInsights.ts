import { supabase } from '@/lib/supabase';
import type { MethodEvent, RawPost } from '@/lib/supabase';

export type NoteEvent = MethodEvent & {
  raw_posts: RawPost;
};

export type MethodInsight = {
  method_slug: string;
  display_name: string;
  positive: number;
  neutral: number;
  negative: number;
  successRate: number;
  totalReports: number;
  lastReportedAt: string;
  sample?: NoteEvent;
};

export type SymptomInsight = {
  keyword: string;
  totalStories: number;
  positiveShare: number;
  topMethod: string;
};

export type SummaryMetrics = {
  methodCount: number;
  totalPositive: number;
  totalNeutral: number;
  totalNegative: number;
  totalReports: number;
  storyCount: number;
  lastUpdated?: string;
};

export type TagSummaryItem = {
  id: string;
  tag: string;
  method: string;
  content: string;
  url: string;
  postedAt: string;
  username: string;
};

type FetchOptions = {
  limit?: number;
  methodSlug?: string;
  sourceKeyword?: string;
};

export async function fetchNoteEvents(options: FetchOptions = {}): Promise<NoteEvent[]> {
  let query = supabase
    .from('method_events')
    .select(
      `
        *,
        raw_posts:post_id!inner (
          id,
          source_keyword,
          platform_id,
          username,
          display_name,
          content,
          posted_at,
          collected_at,
          url,
          lang,
          ingestion_source
        )
      `
    )
    .eq('spam_flag', false)
    .eq('raw_posts.ingestion_source', 'note_hashtag')
    .order('created_at', { ascending: false });

  if (options.methodSlug) {
    query = query.eq('method_slug', options.methodSlug);
  }
  if (options.sourceKeyword) {
    query = query.eq('raw_posts.source_keyword', options.sourceKeyword);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching note events:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    raw_posts: row.raw_posts as RawPost,
  }));
}

export function buildMethodInsights(events: NoteEvent[]): MethodInsight[] {
  const map = new Map<string, MethodInsight>();

  for (const event of events) {
    const slug = event.method_slug;
    if (!map.has(slug)) {
      map.set(slug, {
        method_slug: slug,
        display_name: event.method_display_name,
        positive: 0,
        neutral: 0,
        negative: 0,
        successRate: 0,
        totalReports: 0,
        lastReportedAt: event.raw_posts.posted_at,
        sample: event,
      });
    }

    const entry = map.get(slug)!;
    entry.totalReports += 1;
    if (!entry.sample || new Date(event.created_at) > new Date(entry.sample.created_at)) {
      entry.sample = event;
    }

    if (event.raw_posts.posted_at && (!entry.lastReportedAt || new Date(event.raw_posts.posted_at) > new Date(entry.lastReportedAt))) {
      entry.lastReportedAt = event.raw_posts.posted_at;
    }

    switch (event.effect_label) {
      case 'positive':
        entry.positive += 1;
        break;
      case 'negative':
        entry.negative += 1;
        break;
      default:
        entry.neutral += 1;
        break;
    }
  }

  return Array.from(map.values()).map((entry) => ({
    ...entry,
    successRate: entry.totalReports === 0 ? 0 : Math.round((entry.positive / entry.totalReports) * 100),
  }));
}

export function buildSummary(events: NoteEvent[]): SummaryMetrics {
  const methodInsights = buildMethodInsights(events);
  const totalPositive = methodInsights.reduce((sum, method) => sum + method.positive, 0);
  const totalNeutral = methodInsights.reduce((sum, method) => sum + method.neutral, 0);
  const totalNegative = methodInsights.reduce((sum, method) => sum + method.negative, 0);
  const totalReports = totalPositive + totalNeutral + totalNegative;
  const lastUpdated = events[0]?.raw_posts.posted_at;

  return {
    methodCount: methodInsights.length,
    totalPositive,
    totalNeutral,
    totalNegative,
    totalReports,
    storyCount: events.length,
    lastUpdated,
  };
}

export function buildSymptomInsights(events: NoteEvent[]): SymptomInsight[] {
  const map = new Map<string, { count: number; positive: number; bestMethod: Map<string, number> }>();

  for (const event of events) {
    const keyword = event.raw_posts.source_keyword?.trim() || '未分類';
    if (!map.has(keyword)) {
      map.set(keyword, { count: 0, positive: 0, bestMethod: new Map() });
    }
    const bucket = map.get(keyword)!;
    bucket.count += 1;
    if (event.effect_label === 'positive') {
      bucket.positive += 1;
    }
    bucket.bestMethod.set(event.method_display_name, (bucket.bestMethod.get(event.method_display_name) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([keyword, stats]) => {
      const [topMethod] = Array.from(stats.bestMethod.entries()).sort((a, b) => b[1] - a[1])[0] ?? ['データ準備中', 0];
      return {
        keyword,
        totalStories: stats.count,
        positiveShare: stats.count === 0 ? 0 : Math.round((stats.positive / stats.count) * 100),
        topMethod,
      };
    })
    .sort((a, b) => b.totalStories - a.totalStories);
}

export function buildTagSummaries(events: NoteEvent[]): Record<string, TagSummaryItem[]> {
  const positiveEvents = dedupeEventsByPost(events).filter((event) => event.effect_label === 'positive');
  const grouped = new Map<string, TagSummaryItem[]>();
  for (const event of positiveEvents) {
    const tag = normalizeTag(event.raw_posts?.source_keyword);
    if (!grouped.has(tag)) {
      grouped.set(tag, []);
    }
    grouped.get(tag)!.push({
      id: event.id,
      tag,
      method: event.method_display_name,
      content: event.raw_posts?.content ?? '',
      url: event.raw_posts?.url ?? '#',
      postedAt: event.raw_posts?.posted_at ?? event.created_at,
      username: event.raw_posts?.username ?? 'noteユーザー',
    });
  }
  for (const items of grouped.values()) {
    items.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }
  return Object.fromEntries(grouped);
}

export function dedupeEventsByPost(events: NoteEvent[]): NoteEvent[] {
  const seen = new Set<string>();
  const unique: NoteEvent[] = [];
  for (const event of events) {
    const postId = event.raw_posts?.id;
    if (!postId) continue;
    if (seen.has(postId)) continue;
    seen.add(postId);
    unique.push(event);
  }
  return unique;
}

function normalizeTag(keyword?: string | null) {
  if (!keyword) return '#未分類';
  return keyword.startsWith('#') ? keyword : `#${keyword}`;
}
