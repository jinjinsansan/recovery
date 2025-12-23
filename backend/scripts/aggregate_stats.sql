-- Aggregate method_events into method_stats
-- This creates a leaderboard of mental health methods ranked by frequency

-- First, insert or update method_stats based on method_events
INSERT INTO method_stats (
    method_slug,
    display_name,
    locale,
    positive_total,
    negative_total,
    neutral_total,
    last_post_at,
    rolling_30d_positive,
    rolling_30d_negative,
    rolling_30d_neutral,
    updated_at
)
SELECT 
    me.method_slug,
    -- Use the most common display_name for this method_slug
    MODE() WITHIN GROUP (ORDER BY me.method_display_name) as display_name,
    'ja' as locale,
    COUNT(*) FILTER (WHERE me.effect_label = 'positive') as positive_total,
    COUNT(*) FILTER (WHERE me.effect_label = 'negative') as negative_total,
    COUNT(*) FILTER (WHERE me.effect_label = 'neutral') as neutral_total,
    MAX(rp.posted_at) as last_post_at,
    COUNT(*) FILTER (WHERE me.effect_label = 'positive' AND rp.posted_at > NOW() - INTERVAL '30 days') as rolling_30d_positive,
    COUNT(*) FILTER (WHERE me.effect_label = 'negative' AND rp.posted_at > NOW() - INTERVAL '30 days') as rolling_30d_negative,
    COUNT(*) FILTER (WHERE me.effect_label = 'neutral' AND rp.posted_at > NOW() - INTERVAL '30 days') as rolling_30d_neutral,
    NOW() as updated_at
FROM method_events me
JOIN raw_posts rp ON me.post_id = rp.id
WHERE me.spam_flag = false
GROUP BY me.method_slug
ON CONFLICT (method_slug) 
DO UPDATE SET
    display_name = EXCLUDED.display_name,
    positive_total = EXCLUDED.positive_total,
    negative_total = EXCLUDED.negative_total,
    neutral_total = EXCLUDED.neutral_total,
    last_post_at = EXCLUDED.last_post_at,
    rolling_30d_positive = EXCLUDED.rolling_30d_positive,
    rolling_30d_negative = EXCLUDED.rolling_30d_negative,
    rolling_30d_neutral = EXCLUDED.rolling_30d_neutral,
    updated_at = NOW();

-- Verify the aggregated stats
SELECT 
    method_slug,
    display_name,
    positive_total,
    negative_total,
    neutral_total,
    (positive_total + negative_total + neutral_total) as total_reports,
    ROUND(positive_total::numeric / NULLIF(positive_total + negative_total + neutral_total, 0) * 100, 1) as success_rate_pct,
    last_post_at
FROM method_stats
ORDER BY positive_total DESC, total_reports DESC;
