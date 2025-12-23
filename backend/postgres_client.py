"""Direct PostgreSQL client to bypass PostgREST cache issues."""

from __future__ import annotations

import os
from typing import Any, List
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import execute_batch


class PostgresClient:
    """Direct PostgreSQL connection for Supabase."""

    def __init__(self, connection_string: str) -> None:
        self.connection_string = connection_string
        self.conn = None

    @classmethod
    def from_env(cls) -> "PostgresClient":
        """Create client from environment variable."""
        # Try connection string first
        conn_str = os.getenv("SUPABASE_DB_CONNECTION_STRING", "").strip()
        
        if not conn_str:
            raise RuntimeError(
                "SUPABASE_DB_CONNECTION_STRING not set. "
                "Get it from Supabase Dashboard → Project Settings → Database → Connection string → Connection pooling → Transaction mode"
            )
        
        return cls(connection_string=conn_str)

    def connect(self) -> None:
        """Establish database connection."""
        if not self.conn or self.conn.closed:
            self.conn = psycopg2.connect(self.connection_string)

    def close(self) -> None:
        """Close database connection."""
        if self.conn and not self.conn.closed:
            self.conn.close()

    def insert_raw_posts(self, records: List[dict]) -> int:
        """Insert raw posts directly into PostgreSQL."""
        if not records:
            return 0

        self.connect()
        
        sql = """
            INSERT INTO raw_posts (
                source_keyword, platform_id, username, display_name,
                content, posted_at, url, lang, ingestion_source, metadata
            ) VALUES (
                %(source_keyword)s, %(platform_id)s, %(username)s, %(display_name)s,
                %(content)s, %(posted_at)s, %(url)s, %(lang)s, %(ingestion_source)s, %(metadata)s
            )
            ON CONFLICT (platform_id) DO NOTHING
        """
        
        try:
            with self.conn.cursor() as cur:
                execute_batch(cur, sql, records, page_size=100)
                self.conn.commit()
                inserted = cur.rowcount
            return inserted
        except Exception as e:
            self.conn.rollback()
            raise e

    def count_raw_posts(self) -> int:
        """Count total raw posts."""
        self.connect()
        with self.conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM raw_posts")
            return cur.fetchone()[0]

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
