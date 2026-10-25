"""
Role matching and gap analysis.
"""
from __future__ import annotations
from typing import Dict, List, Tuple
from .models import SkillAssessment, TargetRole, SkillGap, RoleMatchBreakdown, ClaimState
from .state_engine import STATE_MULTIPLIERS
from .ontology_service import ontology_service

_CANONICAL_ALIASES: Dict[str, str] = {
    "react.js": "react", "reactjs": "react", "node.js": "node.js", "nodejs": "node.js",
    "python 3": "python", "postgres": "postgresql", "mongo db": "mongodb", "ts": "typescript",
}

def _canonical(skill: str) -> str:
    s = skill.strip().lower()
    return _CANONICAL_ALIASES.get(s, s)

def match_role(assessments: List[SkillAssessment], target_role: TargetRole) -> Tuple[float, List[RoleMatchBreakdown], List[str]]:
    skill_lookup = {_canonical(a.name): a for a in assessments}
    breakdown: List[RoleMatchBreakdown] = []
    total_weight = 0.0
    earned = 0.0
    bonus_skills = []
    required_canonical = {_canonical(req.skill) for req in target_role.required_skills}

    for req in target_role.required_skills:
        canon = _canonical(req.skill)
        total_weight += req.weight
        if canon in skill_lookup:
            sa = skill_lookup[canon]
            multiplier = STATE_MULTIPLIERS[sa.claim_state]
            contribution = req.weight * multiplier
            earned += contribution
            breakdown.append(RoleMatchBreakdown(skill=req.skill, required_weight=req.weight, current_state=sa.claim_state, contribution=round(contribution, 4), evidence_ids=sa.evidence_ids))
        else:
            breakdown.append(RoleMatchBreakdown(skill=req.skill, required_weight=req.weight, current_state=ClaimState.CLAIMED, contribution=0.0))

    # Bonus skills via Ontology
    for assessment in assessments:
        canon = _canonical(assessment.name)
        if canon not in required_canonical:
            for req in target_role.required_skills:
                req_canon = _canonical(req.skill)
                adjacent = ontology_service.get_adjacent_skills(req_canon)
                if canon in [a.lower() for a in adjacent]:
                    bonus_skills.append(assessment.name)
                    break

    score = earned / total_weight if total_weight > 0 else 0.0
    return round(score, 4), breakdown, list(set(bonus_skills))

def compute_gaps(breakdown: List[RoleMatchBreakdown]) -> List[SkillGap]:
    gaps: List[SkillGap] = []
    for b in breakdown:
        if b.current_state == ClaimState.VERIFIED: continue
        # BLUEPRINT ALIGNMENT: Categorize gap
        gap_type = "proof_gap" if b.current_state == ClaimState.SUPPORTED else "knowledge_gap"
        if b.current_state == ClaimState.SUPPORTED:
            gaps.append(SkillGap(skill=b.skill, required_weight=b.required_weight, current_state=b.current_state, recommended_action="Complete the micro-verification quiz to upgrade to Verified.", gap_reduction_pct=0.4, gap_type=gap_type))
        elif b.current_state in (ClaimState.CLAIMED, ClaimState.CONTRADICTED):
            gaps.append(SkillGap(skill=b.skill, required_weight=b.required_weight, current_state=b.current_state, recommended_action="Take the iMocha assessment for this skill.", gap_reduction_pct=1.0, gap_type=gap_type))
    gaps.sort(key=lambda g: g.required_weight, reverse=True)
    return gaps