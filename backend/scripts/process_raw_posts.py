#!/usr/bin/env python3
"""Analyze raw posts and update method_events/method_stats in Supabase."""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Sequence

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from analyzer import MethodAnalyzer
from supabase_client import SupabaseClient


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze raw_posts with LLM and refresh method_stats"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximum raw posts to fetch for analysis",
    )
    parser.add_argument(
        "--since-hours",
        type=int,
        default=72,
        help="Only consider posts collected within the past N hours (default: 72)",
    )
    parser.add_argument(
        "--url-domain",
        type=str,
        default="note.com",
        help="Filter raw posts whose URL contains this domain (default: note.com)",
    )
    parser.add_argument(
        "--ingestion-source",
        type=str,
        default=None,
        help="Optional ingestion_source filter (e.g., note_hashtag)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Analyze posts but skip Supabase writes",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    load_env()

    client = SupabaseClient.from_env()
    analyzer = MethodAnalyzer()

    collected_after = None
    if args.since_hours:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=args.since_hours)
        collected_after = cutoff.isoformat()

    raw_posts = client.fetch_raw_posts(
        limit=args.limit,
        ingestion_source=args.ingestion_source,
        url_contains=args.url_domain,
        collected_after=collected_after,
    )

    if not raw_posts:
        print("No raw_posts found matching filters.")
        return

    post_ids = [post["id"] for post in raw_posts if post.get("id")]
    processed_ids = client.fetch_method_event_post_ids(post_ids)
    to_process = [post for post in raw_posts if post.get("id") not in processed_ids]

    print(f"Fetched {len(raw_posts)} raw_posts, {len(to_process)} need analysis.")

    event_payload: List[dict] = []
    for post in to_process:
        content = post.get("content") or ""
        if not content:
            continue
        methods = analyzer.analyze(content)
        if not methods:
            continue
        for method in methods:
            event_payload.append(
                {
                    "post_id": post["id"],
                    "method_slug": method.method_slug,
                    "method_display_name": method.method_display_name,
                    "action_text": method.action_text,
                    "effect_text": method.effect_text,
                    "effect_label": method.effect_label,
                    "sentiment_score": method.sentiment_score,
                    "spam_flag": method.spam_flag,
                    "confidence": method.confidence,
                    "analyzer_version": analyzer.version,
                    "raw_response": method.raw_response,
                }
            )

    if not event_payload:
        print("No new method events to insert.")
    elif args.dry_run:
        print(f"[Dry Run] Would insert {len(event_payload)} method_events.")
    else:
        inserted = client.insert_method_events(event_payload)
        print(f"Inserted {inserted} method_events.")

    if args.dry_run:
        print("Skipping method_stats refresh (dry run).")
        return

    events = client.fetch_method_events_with_posts()
    stats_payload = build_method_stats(events)
    if not stats_payload:
        print("No method_stats payload generated.")
        return

    client.upsert_method_stats(stats_payload)
    print(f"Upserted {len(stats_payload)} method_stats rows.")


def build_method_stats(events: Sequence[Dict[str, Any]]) -> List[dict]:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)
    stats: Dict[str, Dict[str, Any]] = {}

    for event in events:
        if event.get("spam_flag"):
            continue
        slug = event.get("method_slug")
        if not slug:
            continue
        entry = stats.setdefault(
            slug,
            {
                "display_names": Counter(),
                "positive_total": 0,
                "negative_total": 0,
                "neutral_total": 0,
                "rolling_pos": 0,
                "rolling_neg": 0,
                "rolling_neu": 0,
                "last_post_at": None,
            },
        )
        display_name = event.get("method_display_name") or slug
        entry["display_names"][display_name] += 1

        label = (event.get("effect_label") or "unknown").lower()
        if label == "positive":
            entry["positive_total"] += 1
        elif label == "negative":
            entry["negative_total"] += 1
        elif label == "neutral":
            entry["neutral_total"] += 1

        posted_at = parse_datetime(event.get("raw_posts", {}).get("posted_at"))
        if posted_at:
            if entry["last_post_at"] is None or posted_at > entry["last_post_at"]:
                entry["last_post_at"] = posted_at
            if posted_at >= cutoff:
                if label == "positive":
                    entry["rolling_pos"] += 1
                elif label == "negative":
                    entry["rolling_neg"] += 1
                elif label == "neutral":
                    entry["rolling_neu"] += 1

    payload: List[dict] = []
    for slug, data in stats.items():
        display_name = slug
        if data["display_names"]:
            display_name = data["display_names"].most_common(1)[0][0]
        payload.append(
            {
                "method_slug": slug,
                "display_name": display_name,
                "locale": "ja",
                "positive_total": data["positive_total"],
                "negative_total": data["negative_total"],
                "neutral_total": data["neutral_total"],
                "rolling_30d_positive": data["rolling_pos"],
                "rolling_30d_negative": data["rolling_neg"],
                "rolling_30d_neutral": data["rolling_neu"],
                "last_post_at": data["last_post_at"].isoformat() if data["last_post_at"] else None,
                "updated_at": now.isoformat(),
            }
        )
    return payload


def parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        text = str(value).replace("Z", "+00:00")
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def load_env() -> None:
    dotenv_path = ROOT_DIR / ".env"
    load_dotenv(dotenv_path=dotenv_path, override=True)
    load_dotenv(override=False)


if __name__ == "__main__":
    main()
