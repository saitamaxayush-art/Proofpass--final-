import pytest
from backend.intelligence.role_matcher import match_role, compute_gaps, _canonical
from backend.intelligence.models import SkillAssessment, ClaimState, TrustCeiling, QuizStatus


def test_canonical_normalization():
    assert _canonical("React.js") == "react"
    assert _canonical("REACTJS") == "react"
    assert _canonical("Node.js") == "node.js"
    assert _canonical("postgres") == "postgresql"


def test_match_role_all_verified(target_role):
    assessments = [
        SkillAssessment(name="React", claim_state=ClaimState.VERIFIED, evidence_ceiling=TrustCeiling.PLATFORM_VERIFIED, quiz_status=QuizStatus.PASSED),
        SkillAssessment(name="Python", claim_state=ClaimState.VERIFIED, evidence_ceiling=TrustCeiling.PLATFORM_VERIFIED, quiz_status=QuizStatus.PASSED),
        SkillAssessment(name="PostgreSQL", claim_state=ClaimState.VERIFIED, evidence_ceiling=TrustCeiling.PLATFORM_VERIFIED, quiz_status=QuizStatus.PASSED),
        SkillAssessment(name="AWS", claim_state=ClaimState.VERIFIED, evidence_ceiling=TrustCeiling.PLATFORM_VERIFIED, quiz_status=QuizStatus.PASSED),
        SkillAssessment(name="Docker", claim_state=ClaimState.VERIFIED, evidence_ceiling=TrustCeiling.PLATFORM_VERIFIED, quiz_status=QuizStatus.PASSED),
    ]
    # UPDATED: Now unpacks 3 values (score, breakdown, bonus_skills)
    score, breakdown, bonus_skills = match_role(assessments, target_role)
    assert score == 1.0
    assert len(breakdown) == 5


def test_match_role_mixed(target_role):
    assessments = [
        SkillAssessment(name="React", claim_state=ClaimState.VERIFIED, evidence_ceiling=TrustCeiling.PLATFORM_VERIFIED, quiz_status=QuizStatus.PASSED),
        SkillAssessment(name="Python", claim_state=ClaimState.SUPPORTED, evidence_ceiling=TrustCeiling.PLATFORM_VERIFIED, quiz_status=QuizStatus.AVAILABLE),
    ]
    # UPDATED: Now unpacks 3 values
    score, breakdown, bonus_skills = match_role(assessments, target_role)
    # React 0.3*1.0 + Python 0.3*0.6 + others 0 = 0.3 + 0.18 = 0.48
    assert abs(score - 0.48) < 1e-6


def test_compute_gaps_identifies_missing(target_role):
    assessments = [
        SkillAssessment(name="React", claim_state=ClaimState.VERIFIED, evidence_ceiling=TrustCeiling.PLATFORM_VERIFIED, quiz_status=QuizStatus.PASSED),
    ]
    # UPDATED: Now unpacks 3 values
    _, breakdown, _ = match_role(assessments, target_role)
    gaps = compute_gaps(breakdown)
    # Python, PostgreSQL, AWS, Docker should be gaps
    gap_skills = {g.skill for g in gaps}
    assert "Python" in gap_skills
    assert "Docker" in gap_skills
    # First gap should recommend iMocha assessment
    top_gap = gaps[0]
    assert "iMocha" in top_gap.recommended_action