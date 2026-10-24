"""
Deterministic coding platform profile evidence fetcher.
Supports Codeforces and LeetCode with throttling, defensive parsing,
on-disk caching, and offline fixture support.
"""
from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Literal, Optional, Tuple, Union
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from pydantic import BaseModel, Field

# Constants
DEFAULT_TIMEOUT_SECONDS = 10.0
DEFAULT_CACHE_TTL_SECONDS = 86400  # 24 hours
CODEFORCES_THROTTLE_INTERVAL = 2.0  # 1 request per 2 seconds
USER_AGENT = "ProofPass-Verification/2.0 (+https://proofpass.dev)"
MAX_CODEFORCES_SUBMISSIONS = 10000


class PlatformEvidence(BaseModel):
    platform: str
    handle: str
    url: str
    status: Literal["ok", "cached", "unavailable", "not_found"]
    fetched_at: str
    rating: Optional[int] = None
    max_rating: Optional[int] = None
    rank_title: Optional[str] = None
    global_rank: Optional[int] = None
    solved_total: int = 0
    solved_by_difficulty: Dict[str, int] = Field(default_factory=dict)
    topics: Dict[str, int] = Field(default_factory=dict)
    languages: Dict[str, int] = Field(default_factory=dict)
    contest_rating: Optional[float] = None
    contest_top_pct: Optional[float] = None
    truncated: bool = False
    ownership_verified: bool = False
    error: Optional[str] = None


class Throttler:
    """Module-level rate throttler with injectable clock and sleep function for testing."""
    def __init__(
        self,
        min_interval: float = CODEFORCES_THROTTLE_INTERVAL,
        clock: Callable[[], float] = time.monotonic,
        sleep_fn: Callable[[float], None] = time.sleep,
    ):
        self.min_interval = min_interval
        self.clock = clock
        self.sleep_fn = sleep_fn
        self.last_call: float = 0.0

    def wait(self) -> float:
        """Wait if required to respect min_interval. Returns seconds waited."""
        now = self.clock()
        elapsed = now - self.last_call
        waited = 0.0
        if self.last_call > 0.0 and elapsed < self.min_interval:
            waited = self.min_interval - elapsed
            self.sleep_fn(waited)
        self.last_call = self.clock()
        return waited


# Global throttle instance for Codeforces API
codeforces_throttler = Throttler()


def _get_cache_dir(custom_dir: Optional[str] = None) -> Path:
    if custom_dir:
        path = Path(custom_dir)
    else:
        path = Path.cwd() / ".cache" / "platforms"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _read_cache(
    platform: str,
    handle: str,
    cache_dir: Path,
    ttl_seconds: int = DEFAULT_CACHE_TTL_SECONDS,
    clock: Callable[[], float] = time.time,
) -> Optional[PlatformEvidence]:
    cache_file = cache_dir / f"{platform.lower()}_{handle.lower().strip()}.json"
    if not cache_file.exists():
        return None
    try:
        with open(cache_file, "r", encoding="utf-8") as f:
            entry = json.load(f)
        cached_time = entry.get("timestamp", 0)
        now = clock()
        if (now - cached_time) > ttl_seconds:
            return None
        data = entry.get("data", {})
        data["status"] = "cached"
        return PlatformEvidence(**data)
    except Exception:
        return None


def _write_cache(
    evidence: PlatformEvidence,
    cache_dir: Path,
    clock: Callable[[], float] = time.time,
) -> None:
    if evidence.status not in ("ok", "cached"):
        return
    cache_file = cache_dir / f"{evidence.platform.lower()}_{evidence.handle.lower().strip()}.json"
    try:
        entry = {
            "timestamp": clock(),
            "data": evidence.model_dump(),
        }
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(entry, f, indent=2)
    except Exception:
        pass


def _find_fixture_file(platform: str, handle: str) -> Optional[Path]:
    fixtures_dir = Path(__file__).resolve().parent.parent.parent / "tests" / "fixtures" / "platforms"
    if not fixtures_dir.exists():
        return None

    handle_clean = handle.lower().strip()
    direct_file = fixtures_dir / f"{platform.lower()}_{handle_clean}.json"
    if direct_file.exists():
        return direct_file

    # Alias mappings for tests
    if platform.lower() == "codeforces":
        if handle_clean in ("tourist_mock", "tourist", "strong"):
            return fixtures_dir / "codeforces_strong.json"
        if handle_clean in ("weak_coder", "weak"):
            return fixtures_dir / "codeforces_weak.json"
        if handle_clean in ("ghost_user", "not_found"):
            return fixtures_dir / "codeforces_not_found.json"
        if handle_clean in ("spammer", "rate_limited"):
            return fixtures_dir / "codeforces_rate_limited.json"
    elif platform.lower() == "leetcode":
        if handle_clean in ("alexrivera", "strong", "full"):
            return fixtures_dir / "leetcode_full.json"
        if handle_clean in ("novice_coder", "weak", "missing_fields"):
            return fixtures_dir / "leetcode_missing_fields.json"

    return None


def _parse_codeforces_data(
    handle: str,
    url: str,
    user_info: Dict[str, Any],
    user_status: Dict[str, Any],
    fetched_at: str,
) -> PlatformEvidence:
    # Check status
    if user_info.get("status") != "OK":
        comment = user_info.get("comment", "")
        if "not found" in comment.lower():
            return PlatformEvidence(
                platform="codeforces",
                handle=handle,
                url=url,
                status="not_found",
                fetched_at=fetched_at,
                error=comment or "User not found",
            )
        return PlatformEvidence(
            platform="codeforces",
            handle=handle,
            url=url,
            status="unavailable",
            fetched_at=fetched_at,
            error=comment or "Codeforces API error",
        )

    users = user_info.get("result", [])
    if not users:
        return PlatformEvidence(
            platform="codeforces",
            handle=handle,
            url=url,
            status="not_found",
            fetched_at=fetched_at,
            error="User not found",
        )

    user = users[0]
    rating = user.get("rating")
    max_rating = user.get("maxRating")
    rank_title = user.get("rank")

    # Parse submissions
    submissions = user_status.get("result", [])
    truncated = len(submissions) >= MAX_CODEFORCES_SUBMISSIONS

    solved_problems: set[Tuple[Any, Any]] = set()
    topics: Dict[str, int] = {}
    languages: Dict[str, int] = {}
    solved_by_difficulty: Dict[str, int] = {
        "800-1199": 0,
        "1200-1599": 0,
        "1600-1899": 0,
        "1900+": 0,
    }

    for sub in submissions:
        if sub.get("verdict") != "OK":
            continue

        problem = sub.get("problem", {})
        contest_id = problem.get("contestId")
        index = problem.get("index")
        prob_key = (contest_id, index)

        # Track language count for accepted submissions
        lang = sub.get("programmingLanguage", "")
        if lang:
            languages[lang] = languages.get(lang, 0) + 1

        if prob_key in solved_problems:
            continue
        solved_problems.add(prob_key)

        prob_rating = problem.get("rating")
        if prob_rating is not None and isinstance(prob_rating, int):
            if prob_rating < 1200:
                solved_by_difficulty["800-1199"] += 1
            elif prob_rating < 1600:
                solved_by_difficulty["1200-1599"] += 1
            elif prob_rating < 1900:
                solved_by_difficulty["1600-1899"] += 1
            else:
                solved_by_difficulty["1900+"] += 1

        tags = problem.get("tags", [])
        for tag in tags:
            tag_str = str(tag).strip()
            if tag_str:
                topics[tag_str] = topics.get(tag_str, 0) + 1

    return PlatformEvidence(
        platform="codeforces",
        handle=handle,
        url=url,
        status="ok",
        fetched_at=fetched_at,
        rating=rating,
        max_rating=max_rating,
        rank_title=rank_title,
        solved_total=len(solved_problems),
        solved_by_difficulty=solved_by_difficulty,
        topics=topics,
        languages=languages,
        truncated=truncated,
        ownership_verified=False,
    )


def _parse_leetcode_data(
    handle: str,
    url: str,
    payload: Dict[str, Any],
    fetched_at: str,
) -> PlatformEvidence:
    data = payload.get("data") or {}
    matched_user = data.get("matchedUser")

    if not matched_user:
        return PlatformEvidence(
            platform="leetcode",
            handle=handle,
            url=url,
            status="not_found",
            fetched_at=fetched_at,
            error="User not found",
        )

    profile = matched_user.get("profile") or {}
    global_rank = profile.get("ranking")

    # Solved counts
    submit_stats = matched_user.get("submitStatsGlobal") or matched_user.get("submitStats") or {}
    ac_sub_num = submit_stats.get("acSubmissionNum") or []

    solved_total = 0
    solved_by_difficulty: Dict[str, int] = {"Easy": 0, "Medium": 0, "Hard": 0}
    for item in ac_sub_num:
        diff = item.get("difficulty")
        cnt = item.get("count", 0)
        if diff == "All":
            solved_total = cnt
        elif diff in solved_by_difficulty:
            solved_by_difficulty[diff] = cnt

    # Topics from tagProblemCounts
    topics: Dict[str, int] = {}
    tag_counts = matched_user.get("tagProblemCounts") or {}
    for level in ("fundamental", "intermediate", "advanced"):
        for tag_item in (tag_counts.get(level) or []):
            name = tag_item.get("tagName")
            solved = tag_item.get("problemsSolved", 0)
            if name:
                topics[name] = topics.get(name, 0) + solved

    # Languages
    languages: Dict[str, int] = {}
    for lang_item in (matched_user.get("languageProblemCount") or []):
        lname = lang_item.get("languageName")
        lsolved = lang_item.get("problemsSolved", 0)
        if lname:
            languages[lname] = lsolved

    # Contest ranking
    contest_ranking = data.get("userContestRanking") or {}
    contest_rating = contest_ranking.get("rating")
    contest_top_pct = contest_ranking.get("topPercentage")
    badge = contest_ranking.get("badge") or {}
    rank_title = badge.get("name")

    return PlatformEvidence(
        platform="leetcode",
        handle=handle,
        url=url,
        status="ok",
        fetched_at=fetched_at,
        rank_title=rank_title,
        global_rank=global_rank,
        solved_total=solved_total,
        solved_by_difficulty=solved_by_difficulty,
        topics=topics,
        languages=languages,
        contest_rating=round(float(contest_rating), 1) if contest_rating is not None else None,
        contest_top_pct=round(float(contest_top_pct), 1) if contest_top_pct is not None else None,
        ownership_verified=False,
    )


def _http_get_json(url: str, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> Dict[str, Any]:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return json.loads(response.read().decode(charset))


def _http_post_graphql(
    url: str,
    query: str,
    variables: Dict[str, Any],
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> Dict[str, Any]:
    data_bytes = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    req = Request(
        url,
        data=data_bytes,
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json",
        },
    )
    with urlopen(req, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return json.loads(response.read().decode(charset))


def _fetch_codeforces_network(handle: str, url: str, fetched_at: str) -> PlatformEvidence:
    try:
        codeforces_throttler.wait()
        info_url = f"https://codeforces.com/api/user.info?handles={handle}"
        user_info = _http_get_json(info_url)

        if user_info.get("status") != "OK":
            return _parse_codeforces_data(handle, url, user_info, {}, fetched_at)

        codeforces_throttler.wait()
        status_url = f"https://codeforces.com/api/user.status?handle={handle}&from=1&count={MAX_CODEFORCES_SUBMISSIONS}"
        user_status = _http_get_json(status_url)

        return _parse_codeforces_data(handle, url, user_info, user_status, fetched_at)
    except HTTPError as e:
        status_code = getattr(e, "code", None)
        if status_code in (400, 404):
            return PlatformEvidence(
                platform="codeforces",
                handle=handle,
                url=url,
                status="not_found",
                fetched_at=fetched_at,
                error=f"User not found (HTTP {status_code})",
            )
        return PlatformEvidence(
            platform="codeforces",
            handle=handle,
            url=url,
            status="unavailable",
            fetched_at=fetched_at,
            error=f"Codeforces HTTP {status_code}",
        )
    except Exception as e:
        return PlatformEvidence(
            platform="codeforces",
            handle=handle,
            url=url,
            status="unavailable",
            fetched_at=fetched_at,
            error=str(e),
        )


LEETCODE_COMBINED_QUERY = """
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      ranking
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
      }
    }
    tagProblemCounts {
      fundamental {
        tagName
        problemsSolved
      }
      intermediate {
        tagName
        problemsSolved
      }
      advanced {
        tagName
        problemsSolved
      }
    }
    languageProblemCount {
      languageName
      problemsSolved
    }
  }
  userContestRanking(username: $username) {
    rating
    topPercentage
    globalRanking
    badge {
      name
    }
  }
}
"""

LEETCODE_FALLBACK_QUERY = """
query getUserBasic($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      ranking
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
      }
    }
  }
}
"""


def _fetch_leetcode_network(handle: str, url: str, fetched_at: str) -> PlatformEvidence:
    endpoint = "https://leetcode.com/graphql"
    # Try combined query first
    try:
        res = _http_post_graphql(endpoint, LEETCODE_COMBINED_QUERY, {"username": handle})
        if "errors" not in res and res.get("data"):
            return _parse_leetcode_data(handle, url, res, fetched_at)
    except Exception:
        pass

    # Fallback to smaller query if combined query fails
    try:
        res = _http_post_graphql(endpoint, LEETCODE_FALLBACK_QUERY, {"username": handle})
        if "errors" not in res and res.get("data"):
            return _parse_leetcode_data(handle, url, res, fetched_at)
        return PlatformEvidence(
            platform="leetcode",
            handle=handle,
            url=url,
            status="unavailable",
            fetched_at=fetched_at,
            error="LeetCode GraphQL query returned errors",
        )
    except HTTPError as e:
        status_code = getattr(e, "code", None)
        return PlatformEvidence(
            platform="leetcode",
            handle=handle,
            url=url,
            status="unavailable",
            fetched_at=fetched_at,
            error=f"LeetCode HTTP {status_code}",
        )
    except Exception as e:
        return PlatformEvidence(
            platform="leetcode",
            handle=handle,
            url=url,
            status="unavailable",
            fetched_at=fetched_at,
            error=str(e),
        )


def _fetch_single_profile(
    platform: str,
    handle: str,
    url: str,
    allow_network: bool,
    cache_dir: Path,
    cache_ttl_seconds: int,
) -> PlatformEvidence:
    fetched_at = datetime.now(timezone.utc).isoformat()

    # 1. Check on-disk cache
    cached = _read_cache(platform, handle, cache_dir, ttl_seconds=cache_ttl_seconds)
    if cached is not None:
        return cached

    # 2. If allow_network=False, load from fixture
    if not allow_network:
        fixture_path = _find_fixture_file(platform, handle)
        if not fixture_path or not fixture_path.exists():
            return PlatformEvidence(
                platform=platform,
                handle=handle,
                url=url,
                status="not_found",
                fetched_at=fetched_at,
                error="Profile not found in offline fixtures",
            )
        try:
            with open(fixture_path, "r", encoding="utf-8") as f:
                content = json.load(f)
            if platform.lower() == "codeforces":
                u_info = content.get("user_info", {})
                u_status = content.get("user_status", {})
                return _parse_codeforces_data(handle, url, u_info, u_status, fetched_at)
            elif platform.lower() == "leetcode":
                return _parse_leetcode_data(handle, url, content, fetched_at)
        except Exception as e:
            return PlatformEvidence(
                platform=platform,
                handle=handle,
                url=url,
                status="unavailable",
                fetched_at=fetched_at,
                error=f"Error reading fixture: {e}",
            )

    # 3. Network fetch
    if platform.lower() == "codeforces":
        evidence = _fetch_codeforces_network(handle, url, fetched_at)
    elif platform.lower() == "leetcode":
        evidence = _fetch_leetcode_network(handle, url, fetched_at)
    else:
        evidence = PlatformEvidence(
            platform=platform,
            handle=handle,
            url=url,
            status="unavailable",
            fetched_at=fetched_at,
            error=f"Unsupported platform: {platform}",
        )

    # 4. Cache successful result
    _write_cache(evidence, cache_dir)
    return evidence


def collect_platform_evidence(
    profiles: List[Dict[str, Any]],
    allow_network: bool = False,
    cache_dir: Optional[str] = None,
    cache_ttl_seconds: int = DEFAULT_CACHE_TTL_SECONDS,
) -> List[PlatformEvidence]:
    """
    Public entry point to collect platform evidence for given profile links.
    Never raises exceptions on fetch failure.
    """
    c_dir = _get_cache_dir(cache_dir)
    results: List[PlatformEvidence] = []

    for item in profiles:
        platform = str(item.get("platform", "")).lower().strip()
        handle = str(item.get("handle", "")).strip()
        url = str(item.get("url", "")).strip()
        if not platform or not handle:
            continue

        evidence = _fetch_single_profile(
            platform=platform,
            handle=handle,
            url=url,
            allow_network=allow_network,
            cache_dir=c_dir,
            cache_ttl_seconds=cache_ttl_seconds,
        )
        results.append(evidence)

    return results
