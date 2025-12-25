export const revalidate = 86400;

const pillars = [
  {
    title: 'データソース',
    body: 'note の公開投稿のみを収集。ハッシュタグで症状を特定し、URL と投稿 ID を保存して再現性を確保します。',
  },
  {
    title: '解析',
    body: 'GPT-4o で行動・効果・症状タグ・スパム指標を抽出。生データは JSON で保持し、人手チェックのフィードバックループを回しています。',
  },
  {
    title: '公開',
    body: 'Supabase 上で統計を集計し、肯定/中立/否定のラベルを可視化。医療行為ではなくピアサポート用途に限定しています。',
  },
];

const safeguards = [
  'note で非公開化された記事は毎晩クロールし、データベースからも自動削除',
  '感情的に過激な投稿やプロモーション投稿を LLM とルールベースで除外',
  '匿名希望や削除依頼は 48 時間以内に処理',
  '成功率だけでなく悪化の声も必ず並列表現',
];

export default function AboutPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-16 text-white space-y-12">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">About</p>
        <h1 className="text-4xl font-semibold">プロジェクトの目的とポリシー</h1>
        <p className="text-slate-300 text-sm md:text-base">
          X の API 制限でリアルタイムな声が届きにくくなったため、国内で当事者の一次情報が多い note を新しい一次ソースに選びました。毎日収集 → LLM 整形 → 人手監査 → 公開までのループを透明化します。
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {pillars.map((pillar) => (
          <article key={pillar.title} className="rounded-2xl bg-white/5 p-5 border border-white/10">
            <h2 className="text-xl font-semibold">{pillar.title}</h2>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">{pillar.body}</p>
          </article>
        ))}
      </section>

      <section className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4">
        <h2 className="text-2xl font-semibold">バイアスを抑えるための取り組み</h2>
        <ul className="list-disc list-inside text-slate-300 space-y-2">
          {safeguards.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="bg-white text-slate-900 rounded-3xl p-6 space-y-3">
        <h2 className="text-2xl font-semibold">削除依頼・改善提案</h2>
        <p className="text-sm text-slate-600">
          当事者が安心して声を出せる場を守るため、削除リクエストやタグ追加、誤分類の報告を受け付けています。
        </p>
        <a href="mailto:team@mental-ci.jp" className="inline-flex px-5 py-3 bg-emerald-500 text-white font-semibold rounded-full">
          運営チームに連絡する
        </a>
      </section>
    </main>
  );
}
