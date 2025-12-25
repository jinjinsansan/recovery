from __future__ import annotations

import argparse
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from collectors import (
    CollectedPost,
    NoteHashtagCollector,
    TwitterApiCollector,
    TwitterSearchCollector,
)
from supabase_client import SupabaseClient


DEFAULT_KEYWORDS = [
    "うつ 治った",
    "パニック 改善",
    "不眠 克服",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect recent mental health testimonials from X."
    )
    parser.add_argument(
        "--keywords",
        "-k",
        nargs="+",
        default=DEFAULT_KEYWORDS,
        help="Search keywords to query (default: %(default)s)",
    )
    parser.add_argument(
        "--max-results",
        type=int,
        default=200,
        help="Maximum tweets to fetch per keyword",
    )
    parser.add_argument(
        "--mode",
        choices=["live", "legacy", "mock", "note"],
        default="live",
        help=(
            "Data source: 'live' uses Twitter API v2, 'legacy' uses the deprecated GraphQL scraper, "
            "'note' scrapes note.com hashtag pages, 'mock' emits synthetic data"
        ),
    )
    parser.add_argument(
        "--lang",
        type=str,
        default="ja",
        help="Tweet language filter (default: ja)",
    )
    parser.add_argument(
        "--bearer-token",
        type=str,
        default=None,
        help="Override the bearer token (defaults to TWITTER_BEARER_TOKEN or X_BEARER_TOKEN)",
    )
    parser.add_argument(
        "--auth-token",
        type=str,
        default=None,
        help="X auth_token cookie (legacy GraphQL mode only)",
    )
    parser.add_argument(
        "--csrf-token",
        type=str,
        default=None,
        help="X ct0 cookie (required with --auth-token in legacy mode)",
    )
    parser.add_argument(
        "--guest-token",
        type=str,
        default=None,
        help="Optional guest token override for legacy mode",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for mock dataset generation",
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Upload collected posts to Supabase raw_posts table",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=ROOT_DIR / "data/collections",
        help="Directory to store the resulting JSON file",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    load_env()

    if args.mode == "mock":
        records = generate_mock_records(
            keywords=args.keywords,
            per_keyword_limit=args.max_results,
            seed=args.seed,
        )
    elif args.mode == "legacy":
        collector = TwitterSearchCollector(
            lang=args.lang,
            max_results=args.max_results,
            bearer_token=args.bearer_token,
            auth_token=args.auth_token,
            csrf_token=args.csrf_token,
            guest_token=args.guest_token,
        )
        records = collector.collect(args.keywords)
    elif args.mode == "note":
        collector = NoteHashtagCollector(
            max_results=args.max_results,
        )
        records = collector.collect(args.keywords)
    else:
        collector = TwitterApiCollector(
            lang=args.lang,
            max_results=args.max_results,
            bearer_token=args.bearer_token,
        )
        records = collector.collect(args.keywords)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    output_dir: Path = args.output
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"sample-{timestamp}.json"

    serializable = [record.to_dict() for record in records]
    output_path.write_text(json.dumps(serializable, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"Saved {len(records)} posts "
        f"({args.max_results} max / keyword across {len(args.keywords)} keywords) to {output_path}"
    )

    if args.upload:
        client = SupabaseClient.from_env()
        payload = [record_to_supabase_dict(r) for r in records]
        inserted = client.insert_raw_posts(payload)
        print(f"Uploaded {inserted} posts to Supabase raw_posts table")


def generate_mock_records(
    *, keywords: List[str], per_keyword_limit: int, seed: int
) -> List[CollectedPost]:
    random.seed(seed)
    now = datetime.now(timezone.utc)
    methods = [
        ("朝散歩+日光浴", "午前中の希死念慮が薄れた"),
        ("低用量SSRI再開", "二週間で睡眠が戻った"),
        ("瞑想アプリ10分", "発作の頻度が半分に"),
        ("カフェイン断ち", "動悸と不安が落ち着いた"),
        ("管理栄養士のPFC調整", "倦怠感がなくなった"),
        ("作業療法の陶芸", "自己肯定感が戻ってきた"),
        ("高照度ライト30分", "体内時計が整った"),
        ("専門医の減薬プラン", "離脱症状なく断薬できた"),
    ]
    sentiments = [
        "本当に救われた",
        "まだ波はあるけど前進",
        "信じられないくらい楽",
        "副作用もなく順調",
        "家族も驚いてる",
    ]
    records: List[CollectedPost] = []
    user_counter = 0
    for keyword in keywords:
        for idx in range(per_keyword_limit):
            method, effect = random.choice(methods)
            sentiment = random.choice(sentiments)
            user_counter += 1
            minutes_ago = random.randint(5, 60 * 24)
            posted_at = now - timedelta(minutes=minutes_ago)
            username = f"mock_user_{user_counter:04d}"
            content = f"{keyword}→{method}で{effect}。{sentiment}"
            records.append(
                CollectedPost(
                    source_keyword=keyword,
                    platform_id=f"mock-{keyword}-{idx}-{user_counter}",
                    username=f"@{username}",
                    display_name=f"サンプル{user_counter}",
                    content=content,
                    posted_at=posted_at,
                    url=f"https://x.com/{username}/status/mock-{idx}",
                    lang="ja",
                )
            )
    return records


def record_to_supabase_dict(record: CollectedPost) -> dict:
    ingestion_source = infer_ingestion_source(record)
    return {
        "source_keyword": record.source_keyword,
        "platform_id": record.platform_id,
        "username": record.username,
        "display_name": record.display_name,
        "content": record.content,
        "posted_at": record.posted_at.isoformat(),
        "url": record.url,
        "lang": record.lang,
        "ingestion_source": ingestion_source,
        "metadata": {
            "collector": "scripts.collect_samples",
            "keyword": record.source_keyword,
            "ingestion_source": ingestion_source,
        },
    }


def infer_ingestion_source(record: CollectedPost) -> str:
    url = (record.url or "").lower()
    if "note.com" in url:
        return "note_hashtag"
    if "x.com" in url or "twitter.com" in url:
        return "x_search"
    return "collect_samples_cli"


def load_env() -> None:
    dotenv_path = ROOT_DIR / ".env"
    load_dotenv(dotenv_path=dotenv_path, override=True)
    # Load repo-root .env only to fill missing values without overriding backend settings
    load_dotenv(override=False)


if __name__ == "__main__":
    main()
