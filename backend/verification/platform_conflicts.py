"""
Deterministic contradiction checking between candidate claims and platform evidence.
Identifies title inflation, overstated problem counts, badge mismatches, and handle discrepancies.
No LLM calls. Factual, neutral conflict descriptions with zero em dashes.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Literal, Optional, Tuple, Union

from pydantic import BaseModel

from .platforms import PlatformEvidence

# ---------------------------------------------------------------------------
# Official Codeforces Rating Lower Bounds
# Source: Codeforces Rating System & Divisions (https://codeforces.com/blog/entry/20638)
# ---------------------------------------------------------------------------
CODEFORCES_TITLE_BOUNDS: Dict[str, int] = {
    "pupil": 1200,
    "specialist": 1400,
    "expert": 1600,
    "candidate master": 1900,
    "master": 2100,
    "international master": 2300,
    "grandmaster": 2400,
    "international grandmaster": 2600,
    "legendary grandmaster": 3000,
}

# ---------------------------------------------------------------------------
# LeetCode Badge Grounded Thresholds
# Source: LeetCode Contest Ranking & Badges documentation
# - Knight: Top 25% of active contest participants, typically requires ~1850+ rating
# - Guardian: Top 5% of active contest participants, typically requires ~2150+ rating
# ---------------------------------------------------------------------------
LEETCODE_BADGE_BOUNDS: Dict[str, float] = {
    "knight": 1850.0,
    "guardian": 2150.0,
}

COUNT_TOLERANCE_RATIO = 0.8  # Flag if fetched solves < 80% of claimed count


class PlatformConflict(BaseModel):
    claim_id: Optional[str] = None
    skill: Optional[str] = None
    platform: str
    handle: str
    conflict_type: Literal["title_mismatch", "count_mismatch", "badge_mismatch", "handle_mismatch"]
    claimed_value: str
    observed_value: str
    detail: str


def _extract_claim_texts(
    claims: Union[List[Any], Dict[str, Any]],
    resume_text: Optional[str] = None,
) -> List[Tuple[Optional[str], Optional[str], str]]:
    """Returns list of (claim_id, skill, statement_text)."""
    items: List[Tuple[Optional[str], Optional[str], str]] = []

    if isinstance(claims, list):
        for c in claims:
            c_id = getattr(c, "claim_id", None) if not isinstance(c, dict) else c.get("claim_id")
            skill = getattr(c, "skill", None) if not isinstance(c, dict) else c.get("skill")

            if hasattr(c, "raw_statement") and getattr(c, "raw_statement"):
                items.append((c_id, skill, getattr(c, "raw_statement")))
            elif hasattr(c, "resume_pointer") and getattr(c, "resume_pointer"):
                items.append((c_id, skill, getattr(c, "resume_pointer")))
            elif isinstance(c, dict):
                text = c.get("raw_statement") or c.get("text") or c.get("resume_pointer") or ""
                if text:
                    items.append((c_id, skill, text))
            elif isinstance(c, str):
                items.append((None, None, c))

    if resume_text:
        items.append((None, None, resume_text))

    return items


def check_platform_claims(
    claims: Union[List[Any], Dict[str, Any]],
    platform_evidence: List[PlatformEvidence],
    resume_text: Optional[str] = None,
) -> List[PlatformConflict]:
    """
    Check candidate claims against platform evidence deterministically.
    Missing or unavailable platform data NEVER creates a conflict.
    """
    conflicts: List[PlatformConflict] = []
    texts = _extract_claim_texts(claims, resume_text)

    # Filter to profiles that actually succeeded (status ok or cached)
    # Missing / unavailable profiles must NEVER trigger a conflict!
    active_profiles = [p for p in platform_evidence if p.status in ("ok", "cached")]
    if not active_profiles:
        return conflicts

    cf_profiles = [p for p in active_profiles if p.platform.lower() == "codeforces"]
    lc_profiles = [p for p in active_profiles if p.platform.lower() == "leetcode"]

    for claim_id, skill, statement in texts:
        # Check A: Codeforces Rank / Title
        if cf_profiles:
            for p in cf_profiles:
                cf_conflict = _check_codeforces_title(statement, p, claim_id, skill)
                if cf_conflict:
                    conflicts.append(cf_conflict)

        # Check B: Numeric solve count claims
        for p in active_profiles:
            count_conflict = _check_numeric_count(statement, p, claim_id, skill)
            if count_conflict:
                conflicts.append(count_conflict)

        # Check C: LeetCode contest badge
        if lc_profiles:
            for p in lc_profiles:
                badge_conflict = _check_leetcode_badge(statement, p, claim_id, skill)
                if badge_conflict:
                    conflicts.append(badge_conflict)

        # Check D: Platform handle mismatch
        for p in active_profiles:
            handle_conflict = _check_handle_mismatch(statement, p, claim_id, skill)
            if handle_conflict:
                conflicts.append(handle_conflict)

    return conflicts


def _check_codeforces_title(
    statement: str,
    evidence: PlatformEvidence,
    claim_id: Optional[str],
    skill: Optional[str],
) -> Optional[PlatformConflict]:
    # Look for titles in statement
    title_pattern = r"\b(legendary grandmaster|international grandmaster|candidate master|international master|grandmaster|master|expert|specialist|pupil)\b"
    matches = re.findall(title_pattern, statement, flags=re.IGNORECASE)
    if not matches:
        return None

    for m in matches:
        norm_title = m.lower().strip()
        lower_bound = CODEFORCES_TITLE_BOUNDS.get(norm_title)
        if not lower_bound:
            continue

        cur_rating = evidence.rating or 0
        max_rating = evidence.max_rating or cur_rating

        # Only flag when BOTH current and max rating are strictly below the required bound
        if cur_rating < lower_bound and max_rating < lower_bound:
            observed_title = evidence.rank_title or "Unrated"
            detail = (
                f"Resume says {m.title()}; "
                f"Codeforces shows max rating {max_rating} ({observed_title})."
            )
            return PlatformConflict(
                claim_id=claim_id,
                skill=skill or "Competitive Programming",
                platform=evidence.platform,
                handle=evidence.handle,
                conflict_type="title_mismatch",
                claimed_value=m.title(),
                observed_value=f"max rating {max_rating} ({observed_title})",
                detail=detail,
            )
    return None


def _check_numeric_count(
    statement: str,
    evidence: PlatformEvidence,
    claim_id: Optional[str],
    skill: Optional[str],
) -> Optional[PlatformConflict]:
    plat = evidence.platform.lower()

    # Match patterns like "500+ problems on LeetCode", "solved 300 Codeforces problems", etc.
    patterns = [
        rf"(?:solved\s+)?(\d+)\+?\s*(?:problems|questions|challenges)?\s*(?:solved\s+)?(?:on\s+)?{plat}\b",
        rf"\b{plat}\b[^.\n,;]*?(\d+)\+?\s*(?:problems|questions|challenges|solves)",
        rf"(\d+)\+?\s*{plat}\s+(?:problems|questions|solves)",
    ]

    for pat in patterns:
        m = re.search(pat, statement, flags=re.IGNORECASE)
        if m:
            try:
                claimed_count = int(m.group(1))
            except (ValueError, IndexError):
                continue

            if claimed_count <= 0:
                continue

            # 80 percent threshold rule
            threshold = claimed_count * COUNT_TOLERANCE_RATIO
            if evidence.solved_total < threshold:
                plat_name = "Codeforces" if plat == "codeforces" else "LeetCode"
                detail = (
                    f"Resume claims {claimed_count}+ problems solved on {plat_name}; "
                    f"fetched profile shows {evidence.solved_total} solved problems."
                )
                return PlatformConflict(
                    claim_id=claim_id,
                    skill=skill or plat_name,
                    platform=evidence.platform,
                    handle=evidence.handle,
                    conflict_type="count_mismatch",
                    claimed_value=f"{claimed_count}+ solved",
                    observed_value=f"{evidence.solved_total} solved",
                    detail=detail,
                )
    return None


def _check_leetcode_badge(
    statement: str,
    evidence: PlatformEvidence,
    claim_id: Optional[str],
    skill: Optional[str],
) -> Optional[PlatformConflict]:
    badge_pat = r"\b(guardian|knight)\b"
    matches = re.findall(badge_pat, statement, flags=re.IGNORECASE)
    if not matches:
        return None

    for m in matches:
        norm_badge = m.lower().strip()
        expected_rating = LEETCODE_BADGE_BOUNDS.get(norm_badge)
        if not expected_rating:
            continue

        cur_badge = (evidence.rank_title or "").lower().strip()
        contest_rating = evidence.contest_rating or 0.0

        # If user explicitly has that badge title or higher, no conflict
        if norm_badge == "knight" and cur_badge in ("knight", "guardian"):
            continue
        if norm_badge == "guardian" and cur_badge == "guardian":
            continue

        # If contest rating is recorded and strictly below the threshold
        if contest_rating > 0.0 and contest_rating < expected_rating:
            detail = (
                f"Resume claims {m.title()} badge; "
                f"LeetCode shows contest rating {contest_rating} (below {m.title()} threshold of ~{int(expected_rating)})."
            )
            return PlatformConflict(
                claim_id=claim_id,
                skill=skill or "LeetCode",
                platform=evidence.platform,
                handle=evidence.handle,
                conflict_type="badge_mismatch",
                claimed_value=m.title(),
                observed_value=f"contest rating {contest_rating}",
                detail=detail,
            )
    return None


def _check_handle_mismatch(
    statement: str,
    evidence: PlatformEvidence,
    claim_id: Optional[str],
    skill: Optional[str],
) -> Optional[PlatformConflict]:
    plat = evidence.platform.lower()
    if plat == "codeforces":
        pat = r"codeforces\.com/profile/([a-zA-Z0-9_\.-]+)"
    elif plat == "leetcode":
        pat = r"leetcode\.com/(?:u/)?([a-zA-Z0-9_\.-]+)"
    else:
        return None

    matches = re.findall(pat, statement, flags=re.IGNORECASE)
    for claimed_handle in matches:
        # Strip trailing slashes or punctuation
        clean_claimed = claimed_handle.strip("/.").lower()
        if clean_claimed and clean_claimed != evidence.handle.lower().strip():
            plat_name = "Codeforces" if plat == "codeforces" else "LeetCode"
            detail = (
                f"Resume references {plat_name} handle '{clean_claimed}'; "
                f"submitted profile handle is '{evidence.handle}'."
            )
            return PlatformConflict(
                claim_id=claim_id,
                skill=skill or plat_name,
                platform=evidence.platform,
                handle=evidence.handle,
                conflict_type="handle_mismatch",
                claimed_value=clean_claimed,
                observed_value=evidence.handle,
                detail=detail,
            )
    return None
