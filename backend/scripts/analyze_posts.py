#!/usr/bin/env python3
"""Analyze raw posts and save extracted methods to database."""

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

print("=== Analyze Mental Health Posts ===")
print()

# Initialize analyzer
print("1. Initializing OpenAI analyzer...")
try:
    analyzer = MethodAnalyzer()
    print(f"   Model: {analyzer.model}")
    print(f"   Version: {analyzer.version}")
except Exception as e:
    print(f"   ✗ Error: {e}")
    print()
    print("Make sure OPENAI_API_KEY is set in backend/.env")
    sys.exit(1)
print()

# Sample posts to analyze (you can fetch from Supabase later)
sample_posts = [
    {
        "id": "test-1",
        "content": "うつ 治った→低用量SSRI再開で二週間で睡眠が戻った。本当に救われた"
    },
    {
        "id": "test-2",
        "content": "パニック 改善→高照度ライト30分で体内時計が整った。本当に救われた"
    },
    {
        "id": "test-3",
        "content": "不眠 克服→管理栄養士のPFC調整で倦怠感がなくなった。本当に救われた"
    },
]

print("2. Analyzing sample posts...")
results = analyzer.analyze_batch(sample_posts)
print(f"   Analyzed {len(results)} posts")
print()

print("3. Extracted methods:")
print()

for post_id, methods in results.items():
    post_content = next((p["content"] for p in sample_posts if p["id"] == post_id), "")
    print(f"Post: {post_content[:60]}...")
    
    if not methods:
        print("  → No methods extracted")
    else:
        for method in methods:
            print(f"  → Method: {method.method_display_name} ({method.method_slug})")
            print(f"     Action: {method.action_text}")
            print(f"     Effect: {method.effect_text}")
            print(f"     Label: {method.effect_label}")
            print(f"     Sentiment: {method.sentiment_score:.2f}")
            print(f"     Confidence: {method.confidence:.2f}")
            print(f"     Spam: {method.spam_flag}")
    print()

print()
print("✓ Analysis complete!")
print()
print("Next step: Save these results to method_events table in Supabase")
print("Run: python backend/scripts/save_method_events_sql.py")
