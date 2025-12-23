#!/usr/bin/env python3
"""Debug Supabase API access."""

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
anon_key = os.getenv("SUPABASE_ANON_KEY", "").strip()

print("=== Supabase API Debug ===")
print(f"URL: {url}")
print(f"Service Key: {service_key[:20]}..." if service_key else "Not set")
print(f"Anon Key: {anon_key[:20]}..." if anon_key else "Not set")
print()

# Test with both service_role and anon keys
rest_url = f"{url.rstrip('/')}/rest/v1/raw_posts"

print(f"Testing endpoint: {rest_url}")
print()

with httpx.Client(timeout=10.0) as client:
    # Test 1: Service role key
    print("Test 1: Service role key")
    headers1 = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    try:
        resp = client.get(rest_url, headers=headers1, params={"limit": 1})
        print(f"  Status: {resp.status_code}")
        print(f"  Headers: {dict(resp.headers)}")
        if resp.text:
            print(f"  Response: {resp.text[:300]}")
    except Exception as e:
        print(f"  Error: {e}")
    print()

    # Test 2: Anon key (if available)
    if anon_key:
        print("Test 2: Anon key")
        headers2 = {
            "apikey": anon_key,
            "Authorization": f"Bearer {anon_key}",
            "Content-Type": "application/json",
        }
        try:
            resp = client.get(rest_url, headers=headers2, params={"limit": 1})
            print(f"  Status: {resp.status_code}")
            if resp.text:
                print(f"  Response: {resp.text[:300]}")
        except Exception as e:
            print(f"  Error: {e}")
        print()

    # Test 3: Check API root
    print("Test 3: API root endpoint")
    root_url = f"{url.rstrip('/')}/rest/v1/"
    try:
        resp = client.get(root_url, headers=headers1)
        print(f"  Status: {resp.status_code}")
        if resp.text:
            print(f"  Response: {resp.text[:500]}")
    except Exception as e:
        print(f"  Error: {e}")
