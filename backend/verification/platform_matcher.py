"""
Deterministic skill matching for coding platform evidence.
Maps resume skills to canonical topics and languages using skill_aliases.json,
applies explicit thresholds, and outputs SkillPlatformSupport.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple, Union

from pydantic import BaseModel, Field

from .platforms import PlatformEvidence

# ---------------------------------------------------------------------------
# Thresholds (Deterministic and Tunable)
# ---------------------------------------------------------------------------
# Topic skills (Algorithms, Data Structures, DP, Graphs, etc.)
# "some": at least 10 distinct solved problems across the mapped tags
TOPIC_SOME_SOLVED_THRESHOLD = 10

# "strong": at least 40 total solved across mapped tags, PLUS:
# - at least 10 Codeforces solved problems rated >= 1400 (or user contest rating >= 1400 with 10+ solves), OR
# - at least 15 Medium or Hard solved problems on LeetCode.
TOPIC_STRONG_SOLVED_THRESHOLD = 40
TOPIC_STRONG_CF_RATING_THRESHOLD = 1400
TOPIC_STRONG_CF_HARD_COUNT = 10
TOPIC_STRONG_LC_HARD_COUNT = 15

# Programming language skills (C++, Python, Java, etc.)
# "some": at least 10 accepted submissions or solved problems
LANGUAGE_SOME_COUNT_THRESHOLD = 10
# "strong": at least 50 accepted submissions or solved problems
LANGUAGE_STRONG_COUNT_THRESHOLD = 50


class SkillPlatformSupport(BaseModel):
    skill: str
    strength: Literal["none", "some", "strong"] = "none"
    solved_count: int = 0
    best_rating_signal: Optional[Union[int, float]] = None
    contributing: List[Dict[str, Any]] = Field(default_factory=list)
    detail: str = ""


def _load_skill_aliases() -> Dict[str, Any]:
    file_path = Path(__file__).resolve().parent / "data" / "skill_aliases.json"
    if not file_path.exists():
        return {"skills": {}, "languages": {}}
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _normalize_string(text: str) -> str:
    cleaned = text.lower().strip()
    cleaned = re.sub(r"[\s\-_/&]+", " ", cleaned)
    return cleaned.strip()


class SkillAliasResolver:
    """Resolves arbitrary candidate skill names to canonical topics or languages."""
    def __init__(self, data: Optional[Dict[str, Any]] = None):
        if data is None:
            data = _load_skill_aliases()
        self.skills_config: Dict[str, Any] = data.get("skills", {})
        self.languages_config: Dict[str, Any] = data.get("languages", {})

        # Build alias maps
        self.skill_lookup: Dict[str, str] = {}
        for canonical, cfg in self.skills_config.items():
            self.skill_lookup[_normalize_string(canonical)] = canonical
            for syn in cfg.get("synonyms", []):
                self.skill_lookup[_normalize_string(syn)] = canonical

        self.lang_lookup: Dict[str, str] = {}
        for canonical, cfg in self.languages_config.items():
            self.lang_lookup[_normalize_string(canonical)] = canonical
            for syn in cfg.get("synonyms", []):
                self.lang_lookup[_normalize_string(syn)] = canonical

    def resolve(self, skill_name: str) -> Tuple[Optional[Literal["topic", "language"]], Optional[str]]:
        norm = _normalize_string(skill_name)
        if norm in self.skill_lookup:
            return ("topic", self.skill_lookup[norm])
        if norm in self.lang_lookup:
            return ("language", self.lang_lookup[norm])
        return (None, None)


_RESOLVER = SkillAliasResolver()


def match_platform_to_skills(
    skill_names: List[str],
    platform_evidence: List[PlatformEvidence],
) -> Dict[str, SkillPlatformSupport]:
    """
    Match resume skill claims against platform evidence deterministically.
    Skills outside the known skill_aliases taxonomy (e.g. React, Docker) receive no support.
    """
    results: Dict[str, SkillPlatformSupport] = {}
    valid_profiles = [p for p in platform_evidence if p.status in ("ok", "cached")]

    for raw_skill in skill_names:
        kind, canonical = _RESOLVER.resolve(raw_skill)

        # Unrelated skills receive no platform evidence
        if not kind or not canonical:
            results[raw_skill] = SkillPlatformSupport(
                skill=raw_skill,
                strength="none",
                solved_count=0,
                best_rating_signal=None,
                contributing=[],
                detail=f"No platform evidence mapping available for {raw_skill}.",
            )
            continue

        if kind == "topic":
            results[raw_skill] = _evaluate_topic_skill(
                raw_skill=raw_skill,
                canonical_name=canonical,
                config=_RESOLVER.skills_config.get(canonical, {}),
                profiles=valid_profiles,
            )
        else:
            results[raw_skill] = _evaluate_language_skill(
                raw_skill=raw_skill,
                canonical_name=canonical,
                config=_RESOLVER.languages_config.get(canonical, {}),
                profiles=valid_profiles,
            )

    return results


def _evaluate_topic_skill(
    raw_skill: str,
    canonical_name: str,
    config: Dict[str, Any],
    profiles: List[PlatformEvidence],
) -> SkillPlatformSupport:
    cf_tags = set(t.lower() for t in config.get("codeforces_tags", []))
    lc_topics = set(t.lower() for t in config.get("leetcode_topics", []))

    total_solved = 0
    contributing: List[Dict[str, Any]] = []
    best_rating: Optional[Union[int, float]] = None
    qualifies_cf_hard = False
    qualifies_lc_hard = False
    detail_parts: List[str] = []

    for p in profiles:
        plat = p.platform.lower()
        matched_tags: List[str] = []
        plat_solved = 0

        if plat == "codeforces":
            # Check problem tags
            for tag, count in p.topics.items():
                if tag.lower() in cf_tags:
                    matched_tags.append(tag)
                    plat_solved += count

            # Rating signal
            if p.rating:
                if best_rating is None or p.rating > best_rating:
                    best_rating = p.rating
            if p.max_rating:
                if best_rating is None or p.max_rating > best_rating:
                    best_rating = p.max_rating

            # Hard problem threshold for CF: rating >= 1400 (or solved_by_difficulty)
            hard_cf = (
                p.solved_by_difficulty.get("1200-1599", 0)
                + p.solved_by_difficulty.get("1600-1899", 0)
                + p.solved_by_difficulty.get("1900+", 0)
            )
            if hard_cf >= TOPIC_STRONG_CF_HARD_COUNT or (p.rating and p.rating >= TOPIC_STRONG_CF_RATING_THRESHOLD and plat_solved >= TOPIC_SOME_SOLVED_THRESHOLD):
                qualifies_cf_hard = True

            if plat_solved > 0:
                contributing.append({
                    "platform": p.platform,
                    "handle": p.handle,
                    "tags_used": matched_tags,
                    "solved_count": plat_solved,
                })
                detail_parts.append(f"{plat_solved} solved on Codeforces ({p.handle})")

        elif plat == "leetcode":
            # Check topics
            for topic, count in p.topics.items():
                if topic.lower() in lc_topics:
                    matched_tags.append(topic)
                    plat_solved += count

            if p.contest_rating:
                if best_rating is None or p.contest_rating > best_rating:
                    best_rating = p.contest_rating

            # Hard problem threshold for LeetCode: Medium + Hard >= 15
            med_hard = p.solved_by_difficulty.get("Medium", 0) + p.solved_by_difficulty.get("Hard", 0)
            if med_hard >= TOPIC_STRONG_LC_HARD_COUNT:
                qualifies_lc_hard = True

            if plat_solved > 0:
                contributing.append({
                    "platform": p.platform,
                    "handle": p.handle,
                    "tags_used": matched_tags,
                    "solved_count": plat_solved,
                })
                detail_parts.append(f"{plat_solved} solved on LeetCode ({p.handle})")

        total_solved += plat_solved

    # Determine strength
    strength: Literal["none", "some", "strong"] = "none"
    if total_solved >= TOPIC_STRONG_SOLVED_THRESHOLD and (qualifies_cf_hard or qualifies_lc_hard):
        strength = "strong"
    elif total_solved >= TOPIC_SOME_SOLVED_THRESHOLD:
        strength = "some"

    if strength != "none":
        detail = f"{total_solved} solved problems supporting {canonical_name}: " + ", ".join(detail_parts) + "."
    else:
        detail = f"Insufficient platform activity for {canonical_name} ({total_solved} solved problems found)."

    return SkillPlatformSupport(
        skill=raw_skill,
        strength=strength,
        solved_count=total_solved,
        best_rating_signal=best_rating,
        contributing=contributing,
        detail=detail,
    )


def _evaluate_language_skill(
    raw_skill: str,
    canonical_name: str,
    config: Dict[str, Any],
    profiles: List[PlatformEvidence],
) -> SkillPlatformSupport:
    cf_matches = [m.lower() for m in config.get("codeforces_matches", [])]
    lc_matches = [m.lower() for m in config.get("leetcode_matches", [])]

    total_count = 0
    contributing: List[Dict[str, Any]] = []
    best_rating: Optional[Union[int, float]] = None
    detail_parts: List[str] = []

    for p in profiles:
        plat = p.platform.lower()
        plat_count = 0
        matched_keys: List[str] = []

        if plat == "codeforces":
            for lang, count in p.languages.items():
                if any(m in lang.lower() for m in cf_matches):
                    matched_keys.append(lang)
                    plat_count += count

            if p.rating:
                if best_rating is None or p.rating > best_rating:
                    best_rating = p.rating

            if plat_count > 0:
                contributing.append({
                    "platform": p.platform,
                    "handle": p.handle,
                    "tags_used": matched_keys,
                    "solved_count": plat_count,
                })
                detail_parts.append(f"{plat_count} accepted submissions on Codeforces ({p.handle})")

        elif plat == "leetcode":
            for lang, count in p.languages.items():
                if any(m in lang.lower() for m in lc_matches):
                    matched_keys.append(lang)
                    plat_count += count

            if plat_count > 0:
                contributing.append({
                    "platform": p.platform,
                    "handle": p.handle,
                    "tags_used": matched_keys,
                    "solved_count": plat_count,
                })
                detail_parts.append(f"{plat_count} solved on LeetCode ({p.handle})")

        total_count += plat_count

    strength: Literal["none", "some", "strong"] = "none"
    if total_count >= LANGUAGE_STRONG_COUNT_THRESHOLD:
        strength = "strong"
    elif total_count >= LANGUAGE_SOME_COUNT_THRESHOLD:
        strength = "some"

    if strength != "none":
        detail = f"{total_count} problems/submissions in {canonical_name}: " + ", ".join(detail_parts) + "."
    else:
        detail = f"Insufficient platform activity for {canonical_name} ({total_count} submissions/solves found)."

    return SkillPlatformSupport(
        skill=raw_skill,
        strength=strength,
        solved_count=total_count,
        best_rating_signal=best_rating,
        contributing=contributing,
        detail=detail,
    )
