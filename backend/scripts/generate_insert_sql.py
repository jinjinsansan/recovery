#!/usr/bin/env python3
"""Generate SQL INSERT statements for mock data."""

import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from scripts.collect_samples import generate_mock_records, record_to_supabase_dict

# Generate mock data (10 samples for testing)
records = generate_mock_records(keywords=["うつ 治った", "パニック 改善", "不眠 克服"], per_keyword_limit=3, seed=42)

print("-- Insert mock mental health testimonials")
print("-- Copy and paste this into Supabase SQL Editor")
print()

for record in records[:10]:  # First 10 records only
    data = record_to_supabase_dict(record)
    
    # Escape single quotes in strings
    def escape(s):
        if s is None:
            return "NULL"
        return f"'{str(s).replace(chr(39), chr(39)+chr(39))}'"
    
    metadata_json = json.dumps(data.get("metadata", {}), ensure_ascii=False).replace("'", "''")
    
    sql = f"""
INSERT INTO raw_posts (
    source_keyword, platform_id, username, display_name,
    content, posted_at, url, lang, ingestion_source, metadata
) VALUES (
    {escape(data['source_keyword'])},
    {escape(data['platform_id'])},
    {escape(data['username'])},
    {escape(data['display_name'])},
    {escape(data['content'])},
    '{data['posted_at']}',
    {escape(data['url'])},
    {escape(data['lang'])},
    {escape(data['ingestion_source'])},
    '{metadata_json}'::jsonb
) ON CONFLICT (platform_id) DO NOTHING;
"""
    print(sql.strip())

print()
print("-- Verify inserted data")
print("SELECT COUNT(*) FROM raw_posts;")
print("SELECT * FROM raw_posts LIMIT 5;")
