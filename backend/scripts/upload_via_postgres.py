#!/usr/bin/env python3
"""Upload mock data directly via PostgreSQL connection."""

import json
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from postgres_client import PostgresClient
from scripts.collect_samples import generate_mock_records, record_to_supabase_dict

# Load environment
dotenv_path = ROOT_DIR / ".env"
load_dotenv(dotenv_path=dotenv_path)

print("=== Upload Mock Data via Direct PostgreSQL Connection ===")
print()

# Generate mock data
print("1. Generating mock data...")
records = generate_mock_records(keywords=["うつ 治った", "パニック 改善", "不眠 克服"], per_keyword_limit=50, seed=42)
print(f"   Generated {len(records)} mock posts")
print()

# Convert to Supabase format
payload = [record_to_supabase_dict(r) for r in records]

# Convert metadata dict to JSON string for PostgreSQL
for p in payload:
    if "metadata" in p and isinstance(p["metadata"], dict):
        p["metadata"] = json.dumps(p["metadata"])

# Upload via PostgreSQL
print("2. Connecting to PostgreSQL...")
try:
    with PostgresClient.from_env() as client:
        print("   Connected!")
        print()
        
        print("3. Uploading data...")
        inserted = client.insert_raw_posts(payload)
        print(f"   Inserted {inserted} new posts (duplicates skipped)")
        print()
        
        print("4. Verifying...")
        total = client.count_raw_posts()
        print(f"   Total posts in database: {total}")
        print()
        
        print("✓ SUCCESS! Data uploaded via direct PostgreSQL connection")
        
except Exception as e:
    print(f"✗ ERROR: {e}")
    print()
    if "SUPABASE_DB_PASSWORD" in str(e):
        print("To get your database password:")
        print("1. Go to Supabase Dashboard → Project Settings")
        print("2. Click 'Database' in the left sidebar")
        print("3. Scroll to 'Connection string' section")
        print("4. Click 'Connection pooling' → 'Transaction mode'")
        print("5. Copy the password from the connection string")
        print("6. Add it to backend/.env as SUPABASE_DB_PASSWORD=your-password")
    sys.exit(1)
