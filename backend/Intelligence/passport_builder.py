"""
Builds the canonical PassportPayload.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from .models import (
    Claim, SkillAssessment, TargetRole, PassportPayload, QuizQuestion,
    PlatformProfileSummary,
)
from .role_matcher import match_role, compute_gaps
from .learning_planner import generate_learning_plan


def format_platform_profile_summary(evidence: Any) -> PlatformProfileSummary:
    """Format a PlatformEvidence instance into the canonical PlatformProfileSummary model."""
    raw_topics = getattr(evidence, "topics", {}) or {}
    sorted_topics = sorted(raw_topics.items(), key=lambda x: x[1], reverse=True)[:8]
    top_topics = [{"name": name, "count": count} for name, count in sorted_topics]

    raw_langs = getattr(evidence, "languages", {}) or {}
    sorted_langs = sorted(raw_langs.items(), key=lambda x: x[1], reverse=True)[:5]
    top_languages = [{"name": name, "count": count} for name, count in sorted_langs]

    ownership_verified = getattr(evidence, "ownership_verified", False)
    caveat = "Handle ownership not verified" if not ownership_verified else None

    return PlatformProfileSummary(
        platform=getattr(evidence, "platform", ""),
        handle=getattr(evidence, "handle", ""),
        url=getattr(evidence, "url", ""),
        status=getattr(evidence, "status", "unavailable"),
        fetched_at=getattr(evidence, "fetched_at", ""),
        rating=getattr(evidence, "rating", None),
        rank_title=getattr(evidence, "rank_title", None),
        global_rank=getattr(evidence, "global_rank", None),
        solved_total=getattr(evidence, "solved_total", 0),
        solved_by_difficulty=getattr(evidence, "solved_by_difficulty", {}) or {},
        top_topics=top_topics,
        top_languages=top_languages,
        ownership_verified=ownership_verified,
        caveat=caveat,
    )


def extract_platform_notes(evidence_list: List[Any]) -> List[str]:
    """Extract factual notes for unavailable, not found, or truncated platform profiles."""
    notes: List[str] = []
    for ev in evidence_list:
        plat = getattr(ev, "platform", "").title()
        handle = getattr(ev, "handle", "")
        status = getattr(ev, "status", "")
        truncated = getattr(ev, "truncated", False)

        if status == "unavailable":
            notes.append(f"{plat} profile '{handle}' was unavailable during verification.")
        elif status == "not_found":
            notes.append(f"{plat} profile '{handle}' was not found.")
        if truncated:
            notes.append(f"{plat} submission history for '{handle}' was truncated at API limits.")
    return notes


def build_passport(
    claims: List[Claim],
    assessments: List[SkillAssessment],
    target_role: TargetRole,
    quiz_questions: List[QuizQuestion],
    candidate_consent: bool = True,
    platform_profiles: Optional[List[PlatformProfileSummary]] = None,
    notes: Optional[List[str]] = None,
    platform_evidence_list: Optional[List[Any]] = None,
) -> PassportPayload:
    score, breakdown = match_role(assessments, target_role)
    gaps = compute_gaps(breakdown)
    learning_plan = generate_learning_plan(gaps)

    all_notes = list(notes or [])
    all_profiles = list(platform_profiles or [])

    if platform_evidence_list:
        if not platform_profiles:
            all_profiles = [format_platform_profile_summary(ev) for ev in platform_evidence_list]
        extracted_notes = extract_platform_notes(platform_evidence_list)
        for n in extracted_notes:
            if n not in all_notes:
                all_notes.append(n)

    return PassportPayload(
        candidate_consent=candidate_consent,
        target_role=target_role.role_name,
        skills=assessments,
        role_match_score=score,
        skill_gaps=gaps,
        role_breakdown=breakdown,
        quiz_questions=quiz_questions,
        learning_plan=learning_plan,
        platform_profiles=all_profiles,
        notes=all_notes,
        signature=None,
        public_key_id=None,
    )