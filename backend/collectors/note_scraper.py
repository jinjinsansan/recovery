"""Collector for note.com hashtag pages."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Iterable, List, Optional, Sequence
from urllib.parse import quote

import httpx
import quickjs

from .twitter_search import CollectedPost

NUXT_PATTERN = re.compile(r"window.__NUXT__=(.*?);\s*</script>", re.S)


class NoteCollectorError(RuntimeError):
    """Raised when note scraping fails."""


class NoteHashtagCollector:
    """Scrape note hashtag pages rendered by Nuxt."""

    BASE_URL = "https://note.com"

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
            notes = self._fetch_tag_notes(tag)
            for entry in notes:
                post = self._to_collected(tag, entry)
                if post:
                    dataset.append(post)
                if len(dataset) >= self.max_results:
                    break
            if len(dataset) >= self.max_results:
                break
        return dataset[: self.max_results]

    def _fetch_tag_notes(self, tag: str) -> Iterable[dict]:
        encoded = quote(tag.strip("#"))
        url = f"{self.BASE_URL}/hashtag/{encoded}"
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "ja,en;q=0.9",
            "Referer": self.BASE_URL,
        }
        resp = self._client.get(url, headers=headers)
        if resp.status_code != 200:
            raise NoteCollectorError(
                f"Failed to fetch note hashtag '{tag}' (status {resp.status_code})"
            )
        match = NUXT_PATTERN.search(resp.text)
        if not match:
            raise NoteCollectorError("Failed to locate window.__NUXT__ state in response")
        script = match.group(1)
        try:
            ctx = quickjs.Context()
            ctx.eval("var window = {};")
            ctx.eval("window.__NUXT__=" + script + ";")
            raw_json = ctx.eval("JSON.stringify(window.__NUXT__)")
            data = json.loads(raw_json)
        except Exception as exc:  # pragma: no cover
            raise NoteCollectorError(f"Failed to evaluate Nuxt payload: {exc}") from exc

        notes = (
            data.get("state", {})
            .get("hashtagTimeline", {})
            .get("notes", [])
        )
        if not notes:
            raise NoteCollectorError("No notes returned from hashtag timeline")
        return notes

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
        content = body.strip()
        return CollectedPost(
            source_keyword=tag,
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
