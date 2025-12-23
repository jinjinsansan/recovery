import { supabase } from '@/lib/supabase';
import type { MethodStats, MethodEvent, RawPost } from '@/lib/supabase';
import Link from 'next/link';

async function getMethodDetails(slug: string) {
  // Get method stats
  const { data: stats } = await supabase
    .from('method_stats')
    .select('*')
    .eq('method_slug', slug)
    .single();

  // Get method events with related posts
  const { data: events } = await supabase
    .from('method_events')
    .select(`
      *,
      raw_posts:post_id (*)
    `)
    .eq('method_slug', slug)
    .order('created_at', { ascending: false });

  return { stats, events };
}

export default async function MethodDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { stats, events } = await getMethodDetails(slug);

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">方法が見つかりません</h1>
          <Link href="/" className="mt-4 text-blue-600 hover:underline">
            トップページに戻る
          </Link>
        </div>
      </div>
    );
  }

  const totalReports = stats.positive_total + stats.negative_total + stats.neutral_total;
  const successRate = totalReports > 0 ? Math.round((stats.positive_total / totalReports) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← トップページに戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{stats.display_name}</h1>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{totalReports}</div>
              <div className="text-sm text-gray-600 mt-1">総報告数</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{stats.positive_total}</div>
              <div className="text-sm text-gray-600 mt-1">改善報告</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600">{stats.negative_total}</div>
              <div className="text-sm text-gray-600 mt-1">悪化報告</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">{successRate}%</div>
              <div className="text-sm text-gray-600 mt-1">成功率</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">ユーザー体験談</h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalReports}件の報告から抽出された体験談
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {!events || events.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                まだ体験談がありません
              </div>
            ) : (
              events.map((event: any) => {
                const post = event.raw_posts;
                const labelColors: Record<string, string> = {
                  positive: 'bg-green-100 text-green-800',
                  negative: 'bg-red-100 text-red-800',
                  neutral: 'bg-gray-100 text-gray-800',
                  unknown: 'bg-gray-100 text-gray-800',
                };

                return (
                  <div key={event.id} className="px-6 py-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            labelColors[event.effect_label] || labelColors.unknown
                          }`}
                        >
                          {event.effect_label === 'positive' && '✓ 改善'}
                          {event.effect_label === 'negative' && '✗ 悪化'}
                          {event.effect_label === 'neutral' && '− 変化なし'}
                          {event.effect_label === 'unknown' && '? 不明'}
                        </span>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-gray-900">{post?.username || 'Anonymous'}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-sm text-gray-500">
                            {post?.posted_at ? new Date(post.posted_at).toLocaleDateString('ja-JP') : '---'}
                          </span>
                        </div>

                        <p className="text-gray-900 mb-2">{post?.content || event.action_text}</p>

                        <div className="bg-gray-50 rounded p-3 text-sm">
                          <div className="mb-1">
                            <span className="font-medium text-gray-700">行動:</span>{' '}
                            <span className="text-gray-900">{event.action_text}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">効果:</span>{' '}
                            <span className="text-gray-900">{event.effect_text}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span>信頼度: {Math.round(event.confidence * 100)}%</span>
                          <span>感情スコア: {event.sentiment_score?.toFixed(2) || 'N/A'}</span>
                          {post?.url && (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              元の投稿 →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>注意:</strong> これらは個人の体験談であり、医学的アドバイスではありません。
            症状がある場合は、必ず医療専門家にご相談ください。
          </p>
        </div>
      </div>
    </div>
  );
}

export const revalidate = 300; // Revalidate every 5 minutes
