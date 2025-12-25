from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence

import httpx


GRAPHQL_ENDPOINT = "https://twitter.com/i/api/graphql/7jT5GT59P8IFjgxwqnEdQw/SearchTimeline"
GUEST_ACTIVATE_ENDPOINT = "https://api.twitter.com/1.1/guest/activate.json"
API_V2_ENDPOINT = "https://api.twitter.com/2/tweets/search/recent"
DEFAULT_BEARER = os.getenv(
    "X_BEARER_TOKEN",
    "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
)

FEATURE_FLAGS = {
    "rweb_lists_timeline_redesign_enabled": False,
    "blue_business_profile_image_shape_enabled": False,
    "responsive_web_graphql_exclude_directive_enabled": True,
    "verified_phone_label_enabled": False,
    "creator_subscriptions_tweet_preview_api_enabled": False,
    "responsive_web_graphql_timeline_navigation_enabled": True,
    "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
    "tweetypie_unmention_optimization_enabled": True,
    "vibe_api_enabled": True,
    "responsive_web_edit_tweet_api_enabled": True,
    "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
    "view_counts_everywhere_api_enabled": True,
    "longform_notetweets_consumption_enabled": True,
    "tweet_awards_web_tipping_enabled": False,
    "freedom_of_speech_not_reach_fetch_enabled": False,
    "standardized_nudges_misinfo": True,
    "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": False,
    "interactive_text_enabled": True,
    "responsive_web_text_conversations_enabled": False,
    "longform_notetweets_rich_text_read_enabled": False,
    "longform_notetweets_inline_media_enabled": False,
    "responsive_web_enhance_cards_enabled": False,
    "responsive_web_twitter_blue_verified_badge_is_enabled": True,
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
        self._referer = "https://x.com/search"

    def collect(self, keywords: Sequence[str]) -> List[CollectedPost]:
        dataset: List[CollectedPost] = []
        for keyword in keywords:
            dataset.extend(self._collect_keyword(keyword))
        return dataset

    def _collect_keyword(self, keyword: str) -> List[CollectedPost]:
        cursor: Optional[str] = None
        collected: List[CollectedPost] = []
        while len(collected) < self.max_results:
            variables = self._build_variables(keyword, cursor)
            params = {
                "variables": json.dumps(variables, separators=(",", ":")),
                "features": json.dumps(FEATURE_FLAGS, separators=(",", ":")),
            }
            response = self._client.get(
                GRAPHQL_ENDPOINT,
                params=params,
                headers=self._build_headers(),
                cookies=self._build_cookies(),
            )

            if response.status_code == 403:
                raise TwitterAuthError("Forbidden: auth token or guest token rejected by X")
            if response.status_code == 401:
                raise TwitterAuthError("Unauthorized: provide X_AUTH_TOKEN/X_CSRF_TOKEN or guest token")
            if response.status_code == 404:
                raise TwitterCollectorError(
                    f"SearchTimeline GraphQL endpoint returned 404: {response.text[:200]}"
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

    def _build_variables(self, keyword: str, cursor: Optional[str]) -> Dict[str, object]:
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
        return variables

    def _build_headers(self) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "User-Agent": self.user_agent,
            "Accept": "application/json",
            "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
            "x-twitter-active-user": "yes",
            "x-twitter-client-language": self.lang or "ja",
            "Referer": self._referer,
        }
        if self.auth_token and self.csrf_token:
            headers["x-csrf-token"] = self.csrf_token
            headers["x-twitter-auth-type"] = "OAuth2Session"
        else:
            headers["x-guest-token"] = self._ensure_guest_token()
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


class TwitterApiCollector:
    """Collector that uses the official Twitter API v2 recent search endpoint."""

    def __init__(
        self,
        *,
        lang: str = "ja",
        max_results: int = 200,
        bearer_token: Optional[str] = None,
        user_agent: str = "Mozilla/5.0",
    ) -> None:
        self.lang = lang
        self.max_results = max_results
        self.user_agent = user_agent
        self.bearer_token = (
            bearer_token
            or os.getenv("TWITTER_BEARER_TOKEN")
            or os.getenv("X_BEARER_TOKEN")
        )
        if not self.bearer_token:
            raise TwitterAuthError(
                "TWITTER_BEARER_TOKEN not set. Provide your official Twitter v2 bearer token."
            )
        self._client = httpx.Client(timeout=20.0)

    def collect(self, keywords: Sequence[str]) -> List[CollectedPost]:
        dataset: List[CollectedPost] = []
        for keyword in keywords:
            dataset.extend(self._collect_keyword(keyword))
        return dataset

    def _collect_keyword(self, keyword: str) -> List[CollectedPost]:
        collected: List[CollectedPost] = []
        next_token: Optional[str] = None
        while len(collected) < self.max_results:
            remaining = self.max_results - len(collected)
            batch_size = max(10, min(100, remaining))
            params = self._build_params(keyword, batch_size, next_token)
            payload = self._request(params)
            posts = self._parse_tweets(keyword, payload)
            if not posts:
                break
            collected.extend(posts)
            next_token = payload.get("meta", {}).get("next_token")
            if not next_token:
                break
        return collected[: self.max_results]

    def _build_params(self, keyword: str, limit: int, next_token: Optional[str]) -> Dict[str, Any]:
        query = f"({keyword}) lang:{self.lang}" if self.lang else keyword
        params: Dict[str, Any] = {
            "query": query,
            "max_results": limit,
            "tweet.fields": "id,text,author_id,created_at,lang,possibly_sensitive",
            "expansions": "author_id",
            "user.fields": "name,username,verified",
        }
        if next_token:
            params["next_token"] = next_token
        return params

    def _request(self, params: Dict[str, Any]) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "User-Agent": self.user_agent,
        }
        response = self._client.get(API_V2_ENDPOINT, params=params, headers=headers)
        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After", "60")
            raise TwitterCollectorError(
                f"Twitter API rate limit hit (429). Retry after {retry_after} seconds."
            )
        if response.status_code >= 400:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text
            raise TwitterCollectorError(
                f"Twitter API error {response.status_code}: {detail}"
            )
        return response.json()

    def _parse_tweets(self, keyword: str, payload: Dict[str, Any]) -> List[CollectedPost]:
        tweets = payload.get("data") or []
        includes = payload.get("includes", {})
        users = {user["id"]: user for user in includes.get("users", [])}
        posts: List[CollectedPost] = []
        for tweet in tweets:
            normalized = self._to_collected(keyword, tweet, users)
            if normalized:
                posts.append(normalized)
        return posts

    def _to_collected(
        self,
        keyword: str,
        tweet: Dict[str, Any],
        users: Dict[str, Dict[str, Any]],
    ) -> Optional[CollectedPost]:
        tweet_id = tweet.get("id")
        text = tweet.get("text")
        author_id = tweet.get("author_id")
        if not tweet_id or not text or not author_id:
            return None

        user = users.get(author_id, {})
        username = user.get("username") or author_id
        display_name = user.get("name") or username
        handle = f"@{username}" if not username.startswith("@") else username

        created_at = tweet.get("created_at")
        posted_at = self._parse_datetime(created_at)
        lang = tweet.get("lang") or self.lang or "und"
        url = f"https://x.com/{username}/status/{tweet_id}"
        return CollectedPost(
            source_keyword=keyword,
            platform_id=tweet_id,
            username=handle,
            display_name=display_name,
            content=text,
            posted_at=posted_at,
            url=url,
            lang=lang,
        )

    @staticmethod
    def _parse_datetime(value: Optional[str]) -> datetime:
        if not value:
            return datetime.now(timezone.utc)
        try:
            normalized = value.replace("Z", "+00:00")
            return datetime.fromisoformat(normalized)
        except Exception:
            return datetime.now(timezone.utc)
