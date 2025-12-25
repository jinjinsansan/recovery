export const revalidate = 86400;

const pillars = [
  {
    title: '1. Collect (一次情報のみ)',
    body: 'note の公開投稿だけを収集し、症状タグ・投稿 URL・タイムスタンプをセットで保存。鍵付き・下書き・引用のみの投稿は除外します。',
  },
  {
    title: '2. Analyze (文脈を壊さない要約)',
    body: 'GPT-4o で行動・感じた変化・症状タグ・スパムスコアを抽出し、人手レビューでラベルを補正。元文は常に note へリンクします。',
  },
  {
    title: '3. Publish (ピアサポート向け可視化)',
    body: 'Supabase で肯定/経過/悪化を日次集計し、症状タグ別に開示。医療アドバイスではなく、当事者同士の「参考文献」として位置づけています。',
  },
];

const safeguards = [
  'note 側で非公開になった記事は毎晩クロールし、同じ ID をデータベースから即時削除',
  '企業アカウントやアフィリエイト目的の投稿は LLM + ルールでフィルタリング',
  '削除・匿名化リクエストは 48 時間以内に対応し、履歴も残さない',
  '改善だけでなく悪化・経過の声も同じレイアウトで表示して過度な期待を防ぐ',
];

const ethics = [
  {
    title: '誰のためのツールか',
    body: '医療従事者ではなく、当事者・家族・サポーターが「似た症状の人が何を試し、どう感じたか」を安全に調べるためのダッシュボードです。',
  },
  {
    title: 'なぜ note なのか',
    body: '国内でメンタルヘルス当事者の長文一次体験が最も蓄積されており、投稿者が自分の言葉で背景を記しているためです。広告や RT に左右されません。',
  },
  {
    title: 'どこまで自動化するか',
    body: '収集と初回ラベリングは自動化しつつ、レビューや削除依頼は必ず人間が判断します。アルゴリズムだけで決めないことを原則にしています。',
  },
];

export default function AboutPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-16 text-slate-900 space-y-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">About</p>
        <h1 className="text-4xl font-semibold">プロジェクトの目的とポリシー</h1>
        <p className="text-slate-600 text-sm md:text-base">
          日々投稿される note の一次体験を失わず、症状タグごとに「何を試し、どう感じたか」を残すことが目的です。医療広告でも SNS のトレンドでもなく、当事者が安心して引用できる公共アーカイブを目指します。
        </p>
      </header>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
        <h2 className="text-2xl font-semibold">意思決定を支える 3 つの柱</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="rounded-2xl bg-slate-50 p-5 border border-slate-200">
              <h3 className="text-lg font-semibold">{pillar.title}</h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 rounded-3xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-2xl font-semibold">中立性を守るためのルール</h2>
        <ul className="list-disc list-inside text-slate-600 space-y-2">
          {safeguards.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {ethics.map((item) => (
          <article key={item.title} className="rounded-2xl bg-white p-5 border border-slate-200">
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="bg-slate-900 text-white rounded-3xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold">削除依頼・改善提案</h2>
        <p className="text-sm text-slate-200">
          当事者が安心して声を出せる場を守るため、削除リクエスト・匿名化・症状タグの追加依頼を常時受け付けています。メール本文に note の URL と理由をご記入ください。
        </p>
        <a href="mailto:team@mental-ci.jp" className="inline-flex px-5 py-3 bg-white text-slate-900 font-semibold rounded-full">
          運営チームに連絡する
        </a>
      </section>
    </main>
  );
}
