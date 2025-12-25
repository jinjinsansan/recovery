export const MENTAL_HEALTH_TAGS = [
  '#うつ',
  '#鬱病',
  '#双極性障害',
  '#パニック',
  '#不安障害',
  '#不眠',
  '#自律神経失調症',
  '#適応障害',
  '#強迫性障害',
  '#摂食障害',
  '#統合失調症',
  '#発達障害',
  '#ADHD',
  '#ASD',
  '#HSP',
  '#PTSD',
  '#トラウマ',
  '#解離性障害',
  '#産後うつ',
  '#季節性うつ',
];

export function tagSlugFromLabel(label: string) {
  return encodeURIComponent(label.replace(/^#/, ''));
}

export function labelFromTagSlug(slug: string) {
  if (!slug) return '#未分類';
  return slug.startsWith('#') ? slug : `#${slug}`;
}
