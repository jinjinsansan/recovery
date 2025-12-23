import { supabase } from '@/lib/supabase';
import type { MethodStats } from '@/lib/supabase';
import Link from 'next/link';

async function getMethodStats(): Promise<MethodStats[]> {
  const { data, error } = await supabase
    .from('method_stats')
    .select('*')
    .order('positive_total', { ascending: false });

  if (error) {
    console.error('Error fetching method stats:', error);
    return [];
  }

  return data || [];
}

export default async function HomePage() {
  const methods = await getMethodStats();
  const totalReports = methods.reduce((sum, m) => sum + m.positive_total + m.negative_total + m.neutral_total, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Mental Collective Intelligence</h1>
          <p className="mt-2 text-gray-600">
            メンタルヘルスの回復方法を、実際のユーザー体験から学ぶ
          </p>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{methods.length}</div>
              <div className="text-sm text-gray-600 mt-1">回復方法</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{totalReports}</div>
              <div className="text-sm text-gray-600 mt-1">報告件数</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">
                {methods.filter(m => m.positive_total > 0).length}
              </div>
              <div className="text-sm text-gray-600 mt-1">効果あり</div>
            </div>
          </div>
        </div>

        {/* Methods Leaderboard */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              回復方法ランキング
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              報告件数が多いほど、多くの人が効果を実感しています
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {methods.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                まだデータがありません
              </div>
            ) : (
              methods.map((method, index) => {
                const totalReports = method.positive_total + method.negative_total + method.neutral_total;
                const successRate = totalReports > 0 
                  ? Math.round((method.positive_total / totalReports) * 100) 
                  : 0;

                return (
                  <Link
                    key={method.method_slug}
                    href={`/method/${method.method_slug}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl font-bold text-gray-400 w-8">
                          #{index + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {method.display_name}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-green-600 font-medium">
                              ✓ {method.positive_total} 件改善報告
                            </span>
                            {method.negative_total > 0 && (
                              <span className="text-sm text-red-600">
                                ✗ {method.negative_total} 件
                              </span>
                            )}
                            {method.neutral_total > 0 && (
                              <span className="text-sm text-gray-600">
                                − {method.neutral_total} 件
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {successRate}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          成功率
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            このサイトは実際のユーザー体験を集約しています。
            医療アドバイスではありません。
          </p>
          <p className="mt-2">
            最新更新: {methods[0]?.updated_at ? new Date(methods[0].updated_at).toLocaleString('ja-JP') : '---'}
          </p>
        </div>
      </div>
    </div>
  );
}

export const revalidate = 300; // Revalidate every 5 minutes
