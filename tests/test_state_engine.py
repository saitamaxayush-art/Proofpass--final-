"""
Unit tests for every state transition.
"""
import pytest
from backend.intelligence.state_engine import (
    determine_claim_state, assess_skill, assess_all, compute_credibility,
)
from backend.intelligence.models import (
    Claim, Evidence, VerificationResult, RepoMetadata,
    ClaimState, TrustCeiling, UsageDepth, AuthorshipSignal,
)


def test_no_evidence_returns_claimed():
    state = determine_claim_state([], quiz_passed=False)
    assert state == ClaimState.CLAIMED


def test_conflict_returns_contradicted():
    ev = Evidence(
        evidence_id="e1", claim_id="c1", skill="React",
        source_type="github_code", file_exists=True,
        usage_depth=UsageDepth.SUBSTANTIAL,
        authorship_pct=0.9, authorship_signal=AuthorshipSignal.STRONG,
        commit_count=1, conflicts=["forked tutorial"],
    )
    state = determine_claim_state([ev], quiz_passed=True)
    assert state == ClaimState.CONTRADICTED


def test_strong_evidence_no_quiz_returns_supported():
    ev = Evidence(
        evidence_id="e1", claim_id="c1", skill="React",
        source_type="github_code", file_exists=True,
        usage_depth=UsageDepth.SUBSTANTIAL,
        authorship_pct=0.9, authorship_signal=AuthorshipSignal.STRONG,
        commit_count=10,
    )
    state = determine_claim_state([ev], quiz_passed=False)
    assert state == ClaimState.SUPPORTED


def test_strong_evidence_quiz_passed_returns_verified():
    ev = Evidence(
        evidence_id="e1", claim_id="c1", skill="React",
        source_type="github_code", file_exists=True,
        usage_depth=UsageDepth.SUBSTANTIAL,
        authorship_pct=0.9, authorship_signal=AuthorshipSignal.STRONG,
        commit_count=10,
    )
    state = determine_claim_state([ev], quiz_passed=True)
    assert state == ClaimState.VERIFIED


def test_weak_evidence_returns_supported():
    ev = Evidence(
        evidence_id="e1", claim_id="c1", skill="React",
        source_type="github_code", file_exists=True,
        usage_depth=UsageDepth.DETECTED,
        authorship_pct=0.2, authorship_signal=AuthorshipSignal.PARTIAL,
        commit_count=2,
    )
    state = determine_claim_state([ev], quiz_passed=True)
    assert state == ClaimState.SUPPORTED


def test_ceiling_caps_candidate_supplied_to_supported():
    ev = Evidence(
        evidence_id="e1", claim_id="c1", skill="React",
        source_type="zip_upload", file_exists=True,
        usage_depth=UsageDepth.SUBSTANTIAL,
        authorship_pct=0.9, authorship_signal=AuthorshipSignal.STRONG,
        commit_count=10,
    )
    state = determine_claim_state(
        [ev], quiz_passed=True, provenance=TrustCeiling.CANDIDATE_SUPPLIED
    )
    assert state == ClaimState.SUPPORTED  # capped


def test_ceiling_caps_unverified_to_claimed():
    ev = Evidence(
        evidence_id="e1", claim_id="c1", skill="React",
        source_type="github_code", file_exists=True,
        usage_depth=UsageDepth.SUBSTANTIAL,
        authorship_pct=0.9, authorship_signal=AuthorshipSignal.STRONG,
        commit_count=10,
    )
    state = determine_claim_state(
        [ev], quiz_passed=True, provenance=TrustCeiling.UNVERIFIED
    )
    assert state == ClaimState.CLAIMED  # capped


def test_credibility_verified_with_quiz():
    ev = Evidence(
        evidence_id="e1", claim_id="c1", skill="React",
        source_type="github_code", file_exists=True,
        authorship_pct=0.8, authorship_signal=AuthorshipSignal.STRONG,
    )
    cred = compute_credibility([ev], ClaimState.VERIFIED, quiz_passed=True)
    # 0.8 * 1.0 + 0.2 = 1.0 (clamped)
    assert cred == 1.0


def test_credibility_supported_no_quiz():
    ev = Evidence(
        evidence_id="e1", claim_id="c1", skill="React",
        source_type="github_code", file_exists=True,
        authorship_pct=0.5,
    )
    cred = compute_credibility([ev], ClaimState.SUPPORTED, quiz_passed=False)
    # 0.5 * 0.6 = 0.3
    assert abs(cred - 0.3) < 1e-6


def test_assess_skill_end_to_end(verification_strong):
    claim = Claim(claim_id="cl_001", skill="React", resume_pointer="p", repo_hint=None)
    sa = assess_skill(claim, verification_strong, quiz_passed=False)
    assert sa.claim_state == ClaimState.SUPPORTED
    assert sa.quiz_status.value == "available"
    assert sa.evidence_ceiling == TrustCeiling.PLATFORM_VERIFIED

    sa2 = assess_skill(claim, verification_strong, quiz_passed=True)
    assert sa2.claim_state == ClaimState.VERIFIED
    assert sa2.quiz_status.value == "passed"


def test_assess_all(claims, verification_strong):
    results = assess_all(claims, verification_strong)
    assert len(results) == len(claims)
    # cl_001 React: strong evidence -> Supported (no quiz)
    assert results[0].claim_state == ClaimState.SUPPORTED
    # cl_003 AWS: no evidence -> Claimed
    assert results[2].claim_state == ClaimState.CLAIMED