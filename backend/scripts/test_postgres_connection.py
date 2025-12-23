#!/usr/bin/env python3
"""Test PostgreSQL connection with different formats."""

import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
import psycopg2

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

# Load environment
dotenv_path = ROOT_DIR / ".env"
load_dotenv(dotenv_path=dotenv_path)

supabase_url = os.getenv("SUPABASE_URL", "").strip()
password = os.getenv("SUPABASE_DB_PASSWORD", "").strip()

if not password:
    print("ERROR: SUPABASE_DB_PASSWORD not set in .env")
    sys.exit(1)

# Parse project ref
parsed = urlparse(supabase_url)
project_ref = parsed.hostname.split(".")[0] if parsed.hostname else None

print("=== PostgreSQL Connection Test ===")
print(f"Supabase URL: {supabase_url}")
print(f"Project Ref: {project_ref}")
print(f"Password length: {len(password)}")
print()

# Try different connection string formats
connection_strings = [
    # Format 1: Transaction pooler (IPv4, port 6543)
    f"postgresql://postgres.{project_ref}:{password}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
    
    # Format 2: Session pooler (direct, port 5432)
    f"postgresql://postgres:{password}@db.{project_ref}.supabase.co:5432/postgres",
    
    # Format 3: Transaction pooler (IPv6, port 6543)
    f"postgresql://postgres.{project_ref}:{password}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require",
]

for i, conn_str in enumerate(connection_strings, 1):
    # Hide password in display
    display_str = conn_str.replace(password, "***")
    print(f"Test {i}: {display_str}")
    
    try:
        conn = psycopg2.connect(conn_str)
        print(f"  ✓ SUCCESS! Connected with format {i}")
        
        # Test query
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM raw_posts")
            count = cur.fetchone()[0]
            print(f"  ✓ Query successful: {count} rows in raw_posts")
        
        conn.close()
        print()
        print(f"Use this connection string format in postgres_client.py")
        break
        
    except Exception as e:
        error_msg = str(e).split('\n')[0]
        print(f"  ✗ Failed: {error_msg}")
        print()

print()
print("If all formats failed, please:")
print("1. Go to Supabase Dashboard → Project Settings → Database")
print("2. Copy the FULL connection string from 'Connection pooling' → 'Transaction mode'")
print("3. It should look like: postgresql://postgres.PROJECT:[PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres")
