from __future__ import annotations

import os
from typing import Iterable, List, Sequence

import httpx


class SupabaseClient:
    """Minimal REST client for inserting raw posts and method events."""

    def __init__(self, *, url: str, service_role_key: str) -> None:
        if not url or not service_role_key:
            raise ValueError("Supabase URL and service role key are required")
        self.base_url = url.rstrip("/")
        self.rest_url = f"{self.base_url}/rest/v1"
        self.service_role_key = service_role_key
        self._client = httpx.Client(timeout=30.0)

    @classmethod
    def from_env(cls) -> "SupabaseClient":
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません")
        return cls(url=url, service_role_key=key)

    def insert_raw_posts(self, records: Sequence[dict]) -> int:
        if not records:
            return 0
        inserted = 0
        for chunk in _chunk(records, size=500):
            resp = self._client.post(
                f"{self.rest_url}/raw_posts",
                headers=self._headers(prefer="resolution=ignore-duplicates"),
                json=chunk,
            )
            resp.raise_for_status()
            inserted += len(chunk)
        return inserted

    def _headers(self, *, prefer: str | None = None) -> dict:
        headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers


def _chunk(items: Sequence[dict], size: int) -> Iterable[List[dict]]:
    bucket: List[dict] = []
    for record in items:
        bucket.append(record)
        if len(bucket) >= size:
            yield bucket
            bucket = []
    if bucket:
        yield bucket
