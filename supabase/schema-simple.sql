-- Simplified schema for Mental Collective Intelligence
-- Run this in Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Custom enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'effect_label') THEN
        CREATE TYPE effect_label AS ENUM ('positive', 'negative', 'neutral', 'unknown');
    END IF;
END $$;

-- Raw posts table
CREATE TABLE IF NOT EXISTS public.raw_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_keyword TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    content TEXT NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    url TEXT,
    lang TEXT DEFAULT 'ja',
    ingestion_source TEXT DEFAULT 'x_search',
    spam_score NUMERIC,
    spam_reason TEXT,
    metadata JSONB,
    CONSTRAINT raw_posts_platform_unique UNIQUE (platform_id)
);

CREATE INDEX IF NOT EXISTS raw_posts_posted_at_idx ON public.raw_posts (posted_at DESC);
CREATE INDEX IF NOT EXISTS raw_posts_lang_idx ON public.raw_posts (lang);

-- Method events table
CREATE TABLE IF NOT EXISTS public.method_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.raw_posts(id) ON DELETE CASCADE,
    method_slug TEXT NOT NULL,
    method_display_name TEXT NOT NULL,
    action_text TEXT,
    effect_text TEXT,
    effect_label effect_label NOT NULL DEFAULT 'unknown',
    sentiment_score NUMERIC,
    spam_flag BOOLEAN DEFAULT FALSE,
    confidence NUMERIC,
    analyzer_version TEXT,
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS method_events_method_slug_idx ON public.method_events (method_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS method_events_effect_label_idx ON public.method_events (effect_label);

-- Method stats table
CREATE TABLE IF NOT EXISTS public.method_stats (
    method_slug TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    category TEXT,
    locale TEXT DEFAULT 'ja',
    positive_total INTEGER NOT NULL DEFAULT 0,
    negative_total INTEGER NOT NULL DEFAULT 0,
    neutral_total INTEGER NOT NULL DEFAULT 0,
    last_post_at TIMESTAMPTZ,
    rolling_30d_positive INTEGER NOT NULL DEFAULT 0,
    rolling_30d_negative INTEGER NOT NULL DEFAULT 0,
    rolling_30d_neutral INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Method synonyms table
CREATE TABLE IF NOT EXISTS public.method_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    method_slug TEXT NOT NULL REFERENCES public.method_stats(method_slug) ON DELETE CASCADE,
    synonym TEXT NOT NULL,
    locale TEXT DEFAULT 'ja'
);

CREATE UNIQUE INDEX IF NOT EXISTS method_synonyms_unique_idx ON public.method_synonyms (synonym, locale);

-- Enable RLS
ALTER TABLE public.raw_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.method_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.method_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.method_synonyms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS raw_posts_read ON public.raw_posts;
DROP POLICY IF EXISTS raw_posts_write_service ON public.raw_posts;
DROP POLICY IF EXISTS method_events_read ON public.method_events;
DROP POLICY IF EXISTS method_events_write_service ON public.method_events;
DROP POLICY IF EXISTS method_stats_read ON public.method_stats;
DROP POLICY IF EXISTS method_stats_write_service ON public.method_stats;
DROP POLICY IF EXISTS method_stats_update_service ON public.method_stats;
DROP POLICY IF EXISTS method_synonyms_read ON public.method_synonyms;
DROP POLICY IF EXISTS method_synonyms_write_service ON public.method_synonyms;
DROP POLICY IF EXISTS method_synonyms_update_service ON public.method_synonyms;

-- Create policies - allow service_role full access
CREATE POLICY raw_posts_read ON public.raw_posts FOR SELECT USING (TRUE);
CREATE POLICY raw_posts_write_service ON public.raw_posts FOR INSERT WITH CHECK (TRUE);

CREATE POLICY method_events_read ON public.method_events FOR SELECT USING (TRUE);
CREATE POLICY method_events_write_service ON public.method_events FOR INSERT WITH CHECK (TRUE);

CREATE POLICY method_stats_read ON public.method_stats FOR SELECT USING (TRUE);
CREATE POLICY method_stats_write_service ON public.method_stats FOR INSERT WITH CHECK (TRUE);
CREATE POLICY method_stats_update_service ON public.method_stats FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY method_synonyms_read ON public.method_synonyms FOR SELECT USING (TRUE);
CREATE POLICY method_synonyms_write_service ON public.method_synonyms FOR INSERT WITH CHECK (TRUE);
CREATE POLICY method_synonyms_update_service ON public.method_synonyms FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- Verify tables were created
SELECT 'Tables created successfully!' AS status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('raw_posts', 'method_events', 'method_stats', 'method_synonyms');
