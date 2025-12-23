-- Mental Collective Intelligence Supabase schema
-- Extensions --------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Custom types -----------------------------------------------------------
do $$
begin
    if not exists (select 1 from pg_type where typname = 'effect_label') then
        create type effect_label as enum ('positive', 'negative', 'neutral', 'unknown');
    end if;
end $$;

-- Raw posts harvested from X---------------------------------------------
create table if not exists public.raw_posts (
    id uuid primary key default gen_random_uuid(),
    source_keyword text not null,
    platform_id text not null,
    username text not null,
    display_name text,
    content text not null,
    posted_at timestamptz not null,
    collected_at timestamptz not null default now(),
    url text,
    lang text default 'ja',
    ingestion_source text default 'x_search',
    spam_score numeric,
    spam_reason text,
    metadata jsonb,
    constraint raw_posts_platform_unique unique (platform_id)
);
create index if not exists raw_posts_posted_at_idx on public.raw_posts (posted_at desc);
create index if not exists raw_posts_lang_idx on public.raw_posts (lang);

-- Extracted method events per testimonial -------------------------------
create table if not exists public.method_events (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.raw_posts(id) on delete cascade,
    method_slug text not null,
    method_display_name text not null,
    action_text text,
    effect_text text,
    effect_label effect_label not null default 'unknown',
    sentiment_score numeric,
    spam_flag boolean default false,
    confidence numeric,
    analyzer_version text,
    raw_response jsonb,
    created_at timestamptz not null default now()
);
create index if not exists method_events_method_slug_idx on public.method_events (method_slug, created_at desc);
create index if not exists method_events_effect_label_idx on public.method_events (effect_label);

-- Aggregated stats for leaderboard --------------------------------------
create table if not exists public.method_stats (
    method_slug text primary key,
    display_name text not null,
    category text,
    locale text default 'ja',
    positive_total integer not null default 0,
    negative_total integer not null default 0,
    neutral_total integer not null default 0,
    last_post_at timestamptz,
    rolling_30d_positive integer not null default 0,
    rolling_30d_negative integer not null default 0,
    rolling_30d_neutral integer not null default 0,
    updated_at timestamptz not null default now()
);

-- Synonyms for normalization --------------------------------------------
create table if not exists public.method_synonyms (
    id uuid primary key default gen_random_uuid(),
    method_slug text not null references public.method_stats(method_slug) on delete cascade,
    synonym text not null,
    locale text default 'ja'
);
create unique index if not exists method_synonyms_unique_idx on public.method_synonyms (synonym, locale);

-- Row Level Security -----------------------------------------------------
alter table public.raw_posts enable row level security;
alter table public.method_events enable row level security;
alter table public.method_stats enable row level security;
alter table public.method_synonyms enable row level security;

-- Policies: allow anon read of aggregated data, restrict writes to service role
do $$
begin
    if not exists (select 1 from pg_policies where policyname = 'raw_posts_read') then
        create policy raw_posts_read on public.raw_posts for select using (auth.role() = 'anon');
    end if;
    if not exists (select 1 from pg_policies where policyname = 'raw_posts_write_service') then
        create policy raw_posts_write_service on public.raw_posts
            for insert with check (auth.role() = 'service_role');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_policies where policyname = 'method_events_read') then
        create policy method_events_read on public.method_events for select using (auth.role() = 'anon');
    end if;
    if not exists (select 1 from pg_policies where policyname = 'method_events_write_service') then
        create policy method_events_write_service on public.method_events
            for insert with check (auth.role() = 'service_role');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_policies where policyname = 'method_stats_read') then
        create policy method_stats_read on public.method_stats for select using (true);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'method_stats_write_service') then
        create policy method_stats_write_service on public.method_stats
            for insert with check (auth.role() = 'service_role');
    end if;
    if not exists (select 1 from pg_policies where policyname = 'method_stats_update_service') then
        create policy method_stats_update_service on public.method_stats
            for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_policies where policyname = 'method_synonyms_read') then
        create policy method_synonyms_read on public.method_synonyms for select using (true);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'method_synonyms_write_service') then
        create policy method_synonyms_write_service on public.method_synonyms
            for insert with check (auth.role() = 'service_role');
    end if;
    if not exists (select 1 from pg_policies where policyname = 'method_synonyms_update_service') then
        create policy method_synonyms_update_service on public.method_synonyms
            for update using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
    end if;
end $$;
