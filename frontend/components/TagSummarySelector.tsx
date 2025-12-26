'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tagSlugFromLabel } from '@/lib/mentalTags';
import type { TagSummaryItem } from '@/lib/noteInsights';

type TagOption = {
  label: string;
  total: number;
};

type TagSummarySelectorProps = {
  tags: TagOption[];
  summaries: Record<string, TagSummaryItem[]>;
};

export function TagSummarySelector({ tags, summaries }: TagSummarySelectorProps) {
  const defaultTag =
    tags.find((tag) => (summaries[tag.label]?.length ?? 0) > 0)?.label ?? tags[0]?.label ?? '';
  const [selectedTag, setSelectedTag] = useState(defaultTag);
  const [activeTag, setActiveTag] = useState(defaultTag);

  const activeSummaries = (activeTag ? summaries[activeTag] : undefined) ?? [];
  const preview = activeSummaries.slice(0, 5);
  const remaining = Math.max(activeSummaries.length - preview.length, 0);

  const handleSubmit = () => {
    if (selectedTag) {
      setActiveTag(selectedTag);
    }
  };

  if (tags.length === 0) {
    return (
      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">Symptom selector</p>
          <h2 className="text-3xl font-semibold">症状タグのデータを準備中です</h2>
        </header>
        <p className="text-sm text-slate-500">note からの新しい投稿を解析中です。しばらくしてから再度アクセスしてください。</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-600">Symptom selector</p>
        <h2 className="text-3xl font-semibold">あなたが調べたい症状タグを選択してください</h2>
        <p className="text-sm text-slate-500">
          AI が note の一次体験から「改善した」と報告された方法だけをまとめています。タグを選んで「調べる」を押すと、最新 5 件のサマリーが表示されます。
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {tags.map((tag) => {
          const hasData = (summaries[tag.label]?.length ?? 0) > 0;
          const isSelected = selectedTag === tag.label;
          return (
            <button
              key={tag.label}
              type="button"
              onClick={() => setSelectedTag(tag.label)}
              className={`text-left rounded-2xl border px-4 py-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                isSelected ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200'
              }`}
            >
              <p className="text-sm font-medium text-slate-700">{tag.label}</p>
              <p className="text-xs text-slate-500 mt-1">{hasData ? `改善サマリー ${tag.total} 件` : 'データ準備中'}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-600">選択中: {selectedTag || '—'}</p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedTag}
          className="px-6 py-3 rounded-full bg-emerald-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          選択したタグを調べる
        </button>
      </div>

      <div className="space-y-4">
        {activeTag ? (
          preview.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Summary</p>
                  <h3 className="text-2xl font-semibold mt-1">{activeTag} の改善サマリー</h3>
                </div>
                {remaining > 0 && (
                  <Link
                    href={`/tags/${tagSlugFromLabel(activeTag)}`}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    もっと見る（残り {remaining} 件） →
                  </Link>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {preview.map((item) => (
                  <SummaryCard key={item.id} item={item} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState tag={activeTag} />
          )
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function SummaryCard({ item }: { item: TagSummaryItem }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{item.tag}</span>
        <span className="text-emerald-600 font-semibold">改善</span>
      </div>
      <div>
        <p className="text-sm text-slate-500">AIが読み取った方法</p>
        <h4 className="text-xl font-semibold text-slate-900 mt-1">{item.method}</h4>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">{item.content}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{new Date(item.postedAt).toLocaleDateString('ja-JP')}</span>
        <a href={item.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700">
          noteを読む →
        </a>
      </div>
    </article>
  );
}

function EmptyState({ tag }: { tag?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
      {tag ? `${tag} の改善サマリーを準備中です。別のタグを選んでください。` : 'タグを選択するとサマリーが表示されます。'}
    </div>
  );
}
