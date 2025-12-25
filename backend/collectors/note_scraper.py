"""Collector for note.com hashtag pages."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Sequence
from urllib.parse import quote

import httpx

from .twitter_search import CollectedPost


class NoteCollectorError(RuntimeError):
    """Raised when note scraping fails."""


class NoteHashtagCollector:
    """Scrape note hashtag pages rendered by Nuxt."""

    BASE_URL = "https://note.com"
    API_BASE = f"{BASE_URL}/api/v3"

    def __init__(
        self,
        *,
        max_results: int = 50,
        user_agent: str = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        ),
    ) -> None:
        self.max_results = max_results
        self.user_agent = user_agent
        self._client = httpx.Client(timeout=20.0)

    def collect(self, tags: Sequence[str]) -> List[CollectedPost]:
        dataset: List[CollectedPost] = []
        for tag in tags:
            tag_records: List[CollectedPost] = []
            page = 1
            while len(tag_records) < self.max_results:
                notes, next_page = self._fetch_tag_notes(tag, page)
                if not notes:
                    break
                for entry in notes:
                    if len(tag_records) >= self.max_results:
                        break
                    post = self._to_collected(tag, entry)
                    if post:
                        tag_records.append(post)
                if not next_page or next_page == page:
                    break
                page = next_page
            dataset.extend(tag_records)
        return dataset

    def _fetch_tag_notes(self, tag: str, page: int) -> tuple[List[dict], Optional[int]]:
        slug = quote(tag.lstrip("#"))
        params = {
            "order": "new",
            "page": page,
            "paid_only": "false",
        }
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json",
            "Referer": f"{self.BASE_URL}/hashtag/{slug}",
        }
        resp = self._client.get(
            f"{self.API_BASE}/hashtags/{slug}/notes",
            params=params,
            headers=headers,
        )
        if resp.status_code != 200:
            raise NoteCollectorError(
                f"Failed to fetch note hashtag '{tag}' page {page} (status {resp.status_code})"
            )
        payload = resp.json().get("data") or {}
        notes = payload.get("notes", [])
        next_page = payload.get("next_page")
        return notes, next_page

    def _to_collected(self, tag: str, note: dict) -> Optional[CollectedPost]:
        note_key = note.get("key")
        body = note.get("body")
        user = note.get("user") or {}
        if not note_key or not body:
            return None
        posted_at = self._parse_datetime(note.get("publishAt"))
        username = user.get("urlname") or user.get("nickname") or "unknown"
        display_name = user.get("name") or user.get("nickname") or username
        url = f"{self.BASE_URL}/{username}/n/{note_key}"
        keyword = tag if tag.startswith("#") else f"#{tag}"
        content = body.strip()
        return CollectedPost(
            source_keyword=keyword,
            platform_id=note_key,
            username=f"@{username}",
            display_name=display_name,
            content=content,
            posted_at=posted_at,
            url=url,
            lang="ja",
        )

    @staticmethod
    def _parse_datetime(value: Optional[str]) -> datetime:
        if not value:
            return datetime.now(timezone.utc)
        try:
            normalized = value.replace("Z", "+00:00")
            return datetime.fromisoformat(normalized)
        except ValueError:
            return datetime.now(timezone.utc)
