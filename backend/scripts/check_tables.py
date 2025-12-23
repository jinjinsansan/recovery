#!/usr/bin/env python3
"""Check what tables exist in Supabase."""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
import httpx

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

# Load environment
dotenv_path = ROOT_DIR / ".env"
load_dotenv(dotenv_path=dotenv_path)

url = os.getenv("SUPABASE_URL", "").strip()
service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

print("=== Checking Supabase Tables ===")
print()

# Try to get table metadata via PostgREST
rest_url = f"{url.rstrip('/')}/rest/v1/"
headers = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}",
}

print("Available endpoints:")
print()

# Try multiple possible table names
tables_to_check = ["raw_posts", "method_events", "method_stats", "method_synonyms"]

with httpx.Client(timeout=10.0) as client:
    for table in tables_to_check:
        try:
            resp = client.get(
                f"{rest_url}{table}",
                headers=headers,
                params={"limit": 0}  # Don't return rows, just check if table exists
            )
            if resp.status_code == 200:
                print(f"✓ {table}: EXISTS (status {resp.status_code})")
            elif resp.status_code == 404:
                print(f"✗ {table}: NOT FOUND (status {resp.status_code})")
            elif resp.status_code == 401:
                print(f"? {table}: AUTH ERROR (status {resp.status_code})")
            else:
                print(f"? {table}: status {resp.status_code}")
                if resp.text:
                    print(f"  Response: {resp.text[:150]}")
        except Exception as e:
            print(f"✗ {table}: ERROR - {e}")

print()
print("If all tables show NOT FOUND, please:")
print("1. Go to Supabase Dashboard → SQL Editor")
print("2. Check if the query ran without errors")
print("3. Go to Table Editor and verify tables exist")
print("4. If tables don't exist, try running the schema.sql again")
