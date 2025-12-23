from __future__ import annotations

import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional, Sequence

import httpx


GRAPHQL_ENDPOINT = "https://twitter.com/i/api/graphql/M1jEez78PEfVfbQLvlWMvQ/SearchTimeline"
GUEST_ACTIVATE_ENDPOINT = "https://api.twitter.com/1.1/guest/activate.json"
DEFAULT_BEARER = os.getenv(
    "X_BEARER_TOKEN",
    "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
)

FEATURE_FLAGS = {
    "rweb_video_screen_enabled": True,
    "profile_label_improvements_pcf_label_in_post_enabled": True,
    "responsive_web_profile_redirect_enabled": True,
    "rweb_tipjar_consumption_enabled": True,
    "verified_phone_label_enabled": True,
    "creator_subscriptions_tweet_preview_api_enabled": True,
    "responsive_web_graphql_timeline_navigation_enabled": True,
    "responsive_web_graphql_skip_user_profile_image_extensions_enabled": True,
    "premium_content_api_read_enabled": True,
    "communities_web_enable_tweet_community_results_fetch": True,
    "c9s_tweet_anatomy_moderator_badge_enabled": True,
    "responsive_web_grok_analyze_button_fetch_trends_enabled": True,
    "responsive_web_grok_analyze_post_followups_enabled": True,
    "responsive_web_jetfuel_frame": True,
    "responsive_web_grok_share_attachment_enabled": True,
    "articles_preview_enabled": True,
    "responsive_web_edit_tweet_api_enabled": True,
    "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
    "view_counts_everywhere_api_enabled": True,
    "longform_notetweets_consumption_enabled": True,
    "responsive_web_twitter_article_tweet_consumption_enabled": True,
    "tweet_awards_web_tipping_enabled": True,
    "responsive_web_grok_show_grok_translated_post": True,
    "responsive_web_grok_analysis_button_from_backend": True,
    "creator_subscriptions_quote_tweet_preview_enabled": True,
    "freedom_of_speech_not_reach_fetch_enabled": True,
    "standardized_nudges_misinfo": True,
    "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": True,
    "longform_notetweets_rich_text_read_enabled": True,
    "longform_notetweets_inline_media_enabled": True,
    "responsive_web_grok_image_annotation_enabled": True,
    "responsive_web_grok_imagine_annotation_enabled": True,
    "responsive_web_grok_community_note_auto_translation_is_enabled": True,
    "responsive_web_enhance_cards_enabled": True,
}

FIELD_TOGGLES = {
    "withPayments": True,
    "withAuxiliaryUserLabels": True,
    "withArticleRichContentState": True,
    "withArticlePlainText": True,
    "withGrokAnalyze": True,
    "withDisallowedReplyControls": True,
}


class TwitterCollectorError(RuntimeError):
    """Generic collector failure."""


class TwitterAuthError(TwitterCollectorError):
    """Raised when authentication/guest activation fails."""


@dataclass
class CollectedPost:
    source_keyword: str
    platform_id: str
    username: str
    display_name: str
    content: str
    posted_at: datetime
    url: str
    lang: str = "ja"

    def to_dict(self) -> dict:
        data = asdict(self)
        data["posted_at"] = self.posted_at.isoformat()
        return data


class TwitterSearchCollector:
    """GraphQL-based collector for recent X posts matching keywords."""

    def __init__(
        self,
        *,
        lang: str = "ja",
        max_results: int = 200,
        bearer_token: Optional[str] = None,
        auth_token: Optional[str] = None,
        csrf_token: Optional[str] = None,
        guest_token: Optional[str] = None,
        user_agent: str = "Mozilla/5.0",
    ) -> None:
        self.lang = lang
        self.max_results = max_results
        self.bearer_token = bearer_token or DEFAULT_BEARER
        self.auth_token = auth_token or os.getenv("X_AUTH_TOKEN")
        self.csrf_token = csrf_token or os.getenv("X_CSRF_TOKEN")
        self._guest_token = guest_token or os.getenv("X_GUEST_TOKEN")
        self.user_agent = user_agent
        self._client = httpx.Client(timeout=20.0)

    def collect(self, keywords: Sequence[str]) -> List[CollectedPost]:
        dataset: List[CollectedPost] = []
        for keyword in keywords:
            dataset.extend(self._collect_keyword(keyword))
        return dataset

    def _collect_keyword(self, keyword: str) -> List[CollectedPost]:
        cursor: Optional[str] = None
        collected: List[CollectedPost] = []
        while len(collected) < self.max_results:
            payload = self._build_payload(keyword, cursor)
            response = self._client.post(
                GRAPHQL_ENDPOINT,
                json=payload,
                headers=self._build_headers(),
                cookies=self._build_cookies(),
            )

            if response.status_code == 403:
                raise TwitterAuthError("Forbidden: auth token or guest token rejected by X")
            if response.status_code == 401:
                raise TwitterAuthError("Unauthorized: provide X_AUTH_TOKEN/X_CSRF_TOKEN or guest token")
            if response.status_code == 404:
                raise TwitterCollectorError(
                    "SearchTimeline GraphQL endpoint returned 404 (likely requires logged-in cookies)."
                )
            response.raise_for_status()

            payload_json = response.json()
            new_posts, cursor = self._parse_response(keyword, payload_json)
            if not new_posts:
                break
            collected.extend(new_posts)
            if not cursor:
                break
        return collected[: self.max_results]

    def _build_payload(self, keyword: str, cursor: Optional[str]) -> Dict[str, object]:
        variables: Dict[str, object] = {
            "rawQuery": f"{keyword} lang:{self.lang}",
            "count": min(50, self.max_results),
            "product": "Latest",
            "withDownvotePerspective": False,
            "withReactionsMetadata": False,
            "withReactionsPerspective": False,
            "withVoice": False,
        }
        if cursor:
            variables["cursor"] = cursor
        return {
            "variables": variables,
            "features": FEATURE_FLAGS,
            "fieldToggles": FIELD_TOGGLES,
        }

    def _build_headers(self) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "User-Agent": self.user_agent,
            "Accept": "application/json",
            "x-twitter-active-user": "yes",
        }
        if self.auth_token and self.csrf_token:
            headers["x-csrf-token"] = self.csrf_token
            headers["content-type"] = "application/json"
        else:
            headers["x-guest-token"] = self._ensure_guest_token()
            headers["content-type"] = "application/json"
        return headers

    def _build_cookies(self) -> Dict[str, str]:
        if not self.auth_token:
            return {}
        cookies = {"auth_token": self.auth_token}
        if self.csrf_token:
            cookies["ct0"] = self.csrf_token
        return cookies

    def _ensure_guest_token(self) -> str:
        if self.auth_token:
            raise TwitterAuthError("Guest token not used when auth cookies are provided")
        if self._guest_token:
            return self._guest_token
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "User-Agent": self.user_agent,
        }
        resp = self._client.post(GUEST_ACTIVATE_ENDPOINT, headers=headers)
        if resp.status_code != 200:
            raise TwitterAuthError("Failed to activate guest token")
        token = resp.json().get("guest_token")
        if not token:
            raise TwitterAuthError("Guest token missing in activation response")
        self._guest_token = token
        return token

    def _parse_response(self, keyword: str, payload: dict) -> tuple[List[CollectedPost], Optional[str]]:
        data = (
            payload.get("data", {})
            .get("search_by_raw_query", {})
            .get("search_timeline", {})
            .get("timeline", {})
        )
        instructions = data.get("instructions", [])
        posts: List[CollectedPost] = []
        next_cursor: Optional[str] = None

        for instruction in instructions:
            itype = instruction.get("type")
            if itype == "TimelineClearCache" and instruction.get("direction") == "Forward" and instruction.get("cursor"):
                next_cursor = instruction["cursor"].get("value")
            if itype == "TimelinePinEntry" and instruction.get("entry"):
                cursor = self._extract_cursor(instruction["entry"])
                if cursor:
                    next_cursor = cursor
                else:
                    posts.extend(self._parse_entries(keyword, [instruction["entry"]]))
            if itype == "TimelineAddEntries":
                for entry in instruction.get("entries", []):
                    cursor = self._extract_cursor(entry)
                    if cursor:
                        next_cursor = cursor
                        continue
                    posts.extend(self._parse_entries(keyword, [entry]))
            if itype == "TimelineAddToModule":
                for entry in instruction.get("moduleItems", []):
                    cursor = self._extract_cursor(entry)
                    if cursor:
                        next_cursor = cursor
                        continue
                    posts.extend(self._parse_entries(keyword, [entry]))

        return posts, next_cursor

    def _parse_entries(self, keyword: str, entries: Iterable[dict]) -> List[CollectedPost]:
        parsed: List[CollectedPost] = []
        for entry in entries:
            content = entry.get("content") or entry.get("item") or {}
            item_content = content.get("itemContent") or {}
            tweet_result = self._extract_tweet(item_content)
            if not tweet_result:
                continue
            normalized = self._to_collected(keyword, tweet_result)
            if normalized:
                parsed.append(normalized)
        return parsed

    def _extract_cursor(self, entry: dict) -> Optional[str]:
        content = entry.get("content") or entry.get("item") or {}
        if content.get("entryType") == "TimelineTimelineCursor" and content.get("cursorType") == "Bottom":
            return content.get("value")
        return None

    def _extract_tweet(self, item_content: dict) -> Optional[dict]:
        tweet_results = item_content.get("tweet_results") or item_content.get("tweet")
        if not tweet_results:
            return None
        result = tweet_results.get("result") if isinstance(tweet_results, dict) else None
        if not result:
            return None
        typename = result.get("__typename")
        if typename == "TweetWithVisibilityResults":
            result = result.get("tweet")
        if not result:
            return None
        return result

    def _to_collected(self, keyword: str, tweet_result: dict) -> Optional[CollectedPost]:
        legacy = tweet_result.get("legacy")
        core = tweet_result.get("core", {})
        if not legacy:
            return None
        user_result = core.get("user_results", {}).get("result")
        if isinstance(user_result, dict) and user_result.get("__typename") == "UserResults" and "result" in user_result:
            user_result = user_result.get("result")
        if isinstance(user_result, dict) and user_result.get("__typename") == "UserUnavailable" and "reason" in user_result:
            return None
        user_legacy = user_result.get("legacy") if isinstance(user_result, dict) else None
        if not user_legacy:
            return None

        post_id = legacy.get("id_str") or tweet_result.get("rest_id")
        if not post_id:
            return None
        text = legacy.get("full_text") or legacy.get("text")
        if not text:
            return None

        created_raw = legacy.get("created_at")
        try:
            posted_at = datetime.strptime(created_raw, "%a %b %d %H:%M:%S %z %Y").astimezone(timezone.utc)
        except Exception:
            posted_at = datetime.now(timezone.utc)

        username = user_legacy.get("screen_name")
        display_name = user_legacy.get("name")
        if not username or not display_name:
            return None

        url = f"https://x.com/{username}/status/{post_id}"
        return CollectedPost(
            source_keyword=keyword,
            platform_id=post_id,
            username=f"@{username}",
            display_name=display_name,
            content=text,
            posted_at=posted_at,
            url=url,
            lang=self.lang,
        )
