from __future__ import annotations

import os
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set

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
                params={"on_conflict": "platform_id"},
                headers=self._headers(prefer="resolution=ignore-duplicates"),
                json=chunk,
            )
            resp.raise_for_status()
            inserted += len(chunk)
        return inserted

    def fetch_raw_posts(
        self,
        *,
        limit: int = 100,
        ingestion_source: str | None = None,
        url_contains: str | None = None,
        collected_after: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {
            "select": "*",
            "order": "posted_at.desc",
            "limit": limit,
        }
        if ingestion_source:
            params["ingestion_source"] = f"eq.{ingestion_source}"
        if url_contains:
            params["url"] = f"ilike.*{url_contains}*"
        if collected_after:
            params["collected_at"] = f"gt.{collected_after}"

        resp = self._client.get(
            f"{self.rest_url}/raw_posts",
            params=params,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    def fetch_method_event_post_ids(self, post_ids: Sequence[str]) -> Set[str]:
        if not post_ids:
            return set()
        filter_values = ",".join(post_ids)
        params = {
            "select": "post_id",
            "post_id": f"in.({filter_values})",
        }
        resp = self._client.get(
            f"{self.rest_url}/method_events",
            params=params,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return {row["post_id"] for row in resp.json() if row.get("post_id")}

    def insert_method_events(self, records: Sequence[dict]) -> int:
        if not records:
            return 0
        inserted = 0
        for chunk in _chunk(records, size=500):
            resp = self._client.post(
                f"{self.rest_url}/method_events",
                headers=self._headers(prefer="resolution=ignore-duplicates"),
                json=chunk,
            )
            resp.raise_for_status()
            inserted += len(chunk)
        return inserted

    def fetch_method_events_with_posts(self, batch_size: int = 500) -> List[Dict[str, Any]]:
        select = (
            "id,method_slug,method_display_name,effect_label,action_text,effect_text,"
            "sentiment_score,spam_flag,confidence,created_at,post_id,"
            "raw_posts:post_id(id,posted_at,source_keyword,url,content)"
        )
        events: List[Dict[str, Any]] = []
        offset = 0
        while True:
            headers = self._headers()
            headers["Range"] = f"{offset}-{offset + batch_size - 1}"
            resp = self._client.get(
                f"{self.rest_url}/method_events",
                params={
                    "select": select,
                    "order": "created_at.asc",
                },
                headers=headers,
            )
            resp.raise_for_status()
            chunk = resp.json()
            events.extend(chunk)
            if len(chunk) < batch_size:
                break
            offset += batch_size
        return events

    def upsert_method_stats(self, records: Sequence[dict]) -> int:
        if not records:
            return 0
        resp = self._client.post(
            f"{self.rest_url}/method_stats",
            params={"on_conflict": "method_slug"},
            headers=self._headers(prefer="resolution=merge-duplicates"),
            json=list(records),
        )
        resp.raise_for_status()
        return len(records)

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
