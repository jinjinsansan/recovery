#!/usr/bin/env python3
"""Test Supabase connection and table existence."""

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

print("=== Supabase Configuration Check ===")
print(f"SUPABASE_URL: {url[:50]}..." if len(url) > 50 else f"SUPABASE_URL: {url}")
print(f"SERVICE_ROLE_KEY: {'✓ Set (' + str(len(service_key)) + ' chars)' if service_key else '✗ Not set'}")
print()

if not url or "your-project" in url:
    print("❌ ERROR: SUPABASE_URL is not configured properly in .env file")
    print("   Please set it to your actual Supabase project URL")
    sys.exit(1)

if not service_key or len(service_key) < 20:
    print("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is not configured properly")
    sys.exit(1)

# Test connection
print("Testing connection to Supabase...")
rest_url = f"{url.rstrip('/')}/rest/v1/raw_posts"
headers = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}",
}

try:
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(rest_url, headers=headers, params={"limit": 1})
        print(f"Status Code: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            print(f"✓ Success! raw_posts table exists and is accessible")
            print(f"  Current row count: {len(data)} (showing max 1)")
        elif resp.status_code == 404:
            print("❌ ERROR: raw_posts table not found (404)")
            print("   Please run the schema.sql file in Supabase SQL Editor:")
            print(f"   → {ROOT_DIR.parent}/supabase/schema.sql")
        elif resp.status_code == 401:
            print("❌ ERROR: Authentication failed (401)")
            print("   Check your SUPABASE_SERVICE_ROLE_KEY")
        else:
            print(f"⚠ Unexpected response: {resp.status_code}")
            print(f"   Response: {resp.text[:200]}")
except httpx.ConnectError as e:
    print(f"❌ Connection Error: {e}")
    print("   Check your internet connection and SUPABASE_URL")
except Exception as e:
    print(f"❌ Error: {e}")
