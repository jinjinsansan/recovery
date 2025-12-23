#!/usr/bin/env python3
"""Analyze all raw_posts from Supabase and generate SQL to save method_events."""

import json
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from analyzer import MethodAnalyzer

# Load environment
dotenv_path = ROOT_DIR / ".env"
load_dotenv(dotenv_path=dotenv_path)

# Sample data from Supabase (the 9 posts we inserted)
# In production, this would be fetched via API
SAMPLE_POSTS = [
    {"id": "75bf6e98-7d01-4ca8-b15e-0b7bb2ac1d83", "content": "うつ 治った→低用量SSRI再開で二週間で睡眠が戻った。本当に救われた"},
    {"id": "11c6e711-293a-4e47-aba1-70fcdc912e50", "content": "うつ 治った→カフェイン断ちで動悸と不安が落ち着いた。まだ波はあるけど前進"},
    {"id": "7759ce43-68fa-4a54-a9de-18e7476a05f5", "content": "うつ 治った→低用量SSRI再開で二週間で睡眠が戻った。家族も驚いてる"},
    {"id": "95bd1954-7c92-44a9-a93d-2ca51ced1290", "content": "パニック 改善→高照度ライト30分で体内時計が整った。本当に救われた"},
    {"id": "990c58bc-2039-472f-b434-cb5b0f895f88", "content": "パニック 改善→低用量SSRI再開で二週間で睡眠が戻った。まだ波はあるけど前進"},
]

print("=== Analyze and Generate SQL for method_events ===")
print()

# Initialize analyzer
analyzer = MethodAnalyzer()
print(f"Analyzing {len(SAMPLE_POSTS)} posts...")
print()

# Analyze all posts
all_inserts = []

for post in SAMPLE_POSTS:
    methods = analyzer.analyze(post["content"])
    
    for method in methods:
        # Escape single quotes
        def esc(s):
            if s is None:
                return "NULL"
            return f"'{str(s).replace(chr(39), chr(39)+chr(39))}'"
        
        raw_json = json.dumps(method.raw_response, ensure_ascii=False).replace("'", "''")
        
        sql = f"""INSERT INTO method_events (
    post_id, method_slug, method_display_name,
    action_text, effect_text, effect_label,
    sentiment_score, spam_flag, confidence,
    analyzer_version, raw_response
) VALUES (
    '{post["id"]}',
    {esc(method.method_slug)},
    {esc(method.method_display_name)},
    {esc(method.action_text)},
    {esc(method.effect_text)},
    '{method.effect_label}',
    {method.sentiment_score},
    {str(method.spam_flag).lower()},
    {method.confidence},
    '{analyzer.version}',
    '{raw_json}'::jsonb
);"""
        all_inserts.append(sql)

print("-- Extracted method events from raw posts")
print("-- Copy and paste into Supabase SQL Editor")
print()

for sql in all_inserts:
    print(sql)

print()
print(f"-- Total: {len(all_inserts)} method events extracted")
print()
print("-- Verify")
print("SELECT COUNT(*) FROM method_events;")
print("SELECT method_slug, method_display_name, effect_label, COUNT(*) FROM method_events GROUP BY method_slug, method_display_name, effect_label;")
