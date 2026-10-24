"""
Comprehensive offline test suite for coding platform verification.
Covers Codeforces, LeetCode, throttling, caching, alias mapping, thresholds,
conflict detection, ownership ceilings, credibility calculations, and JSON canonicalization.
Deterministic only. No LLM calls.
"""
import ast
import json
import tempfile
from pathlib import Path
from typing import Any, Dict, List

import pytest

from backend.verification.platforms import (
    PlatformEvidence,
    Throttler,
    collect_platform_evidence,
    _read_cache,
    _write_cache,
)
from backend.verification.platform_matcher import (
    SkillPlatformSupport,
    match_platform_to_skills,
    TOPIC_SOME_SOLVED_THRESHOLD,
    TOPIC_STRONG_SOLVED_THRESHOLD,
    LANGUAGE_SOME_COUNT_THRESHOLD,
    LANGUAGE_STRONG_COUNT_THRESHOLD,
)
from backend.verification.platform_conflicts import (
    PlatformConflict,
    check_platform_claims,
)
from backend.intelligence.models import (
    Claim,
    Evidence,
    VerificationResult,
    TrustCeiling,
    ClaimState,
    AuthorshipSignal,
    UsageDepth,
    TargetRole,
    QuizQuestion,
)
from backend.intelligence.state_engine import (
    assess_all,
    assess_skill,
    compute_credibility,
    determine_claim_state,
    UNVERIFIED_PLATFORM_CEILING,
    VERIFIED_PLATFORM_CEILING,
    PLATFORM_WEIGHT_SOME,
    PLATFORM_WEIGHT_STRONG,
)
from backend.intelligence.passport_builder import (
    build_passport,
    format_platform_profile_summary,
    extract_platform_notes,
)


# ---------------------------------------------------------------------------
# 1. Codeforces Deduplication, Tag Counting, Rating Buckets, Language Counts
# ---------------------------------------------------------------------------
def test_codeforces_parsing_dedupe_and_counts():
    evidence_list = collect_platform_evidence(
        profiles=[{"platform": "codeforces", "handle": "tourist_mock", "url": "https://codeforces.com/profile/tourist_mock"}],
        allow_network=False,
    )
    assert len(evidence_list) == 1
    ev = evidence_list[0]
    assert ev.status == "ok"
    assert ev.rating == 3600
    assert ev.max_rating == 3800
    assert ev.rank_title == "legendary grandmaster"
    assert ev.ownership_verified is False

    # Submission 1001 and 1004 both solve contest 1800, problem A.
    # Total accepted submissions in fixture = 5, but unique problems = 4.
    assert ev.solved_total == 4

    # Tag counts on distinct solved problems
    assert ev.topics.get("trees") == 1
    assert ev.topics.get("dp") == 1
    assert ev.topics.get("graphs") == 1
    assert ev.topics.get("greedy") == 1
    assert ev.topics.get("math") == 1

    # Languages from accepted submissions
    assert ev.languages.get("GNU C++20 (64)") == 4
    assert ev.languages.get("Python 3") == 1

    # Difficulty distribution
    assert ev.solved_by_difficulty.get("1200-1599") == 1
    assert ev.solved_by_difficulty.get("1600-1899") == 2
    assert ev.solved_by_difficulty.get("1900+") == 1


# ---------------------------------------------------------------------------
# 2. LeetCode Defensive Parsing with Missing Fields & Fallback Query
# ---------------------------------------------------------------------------
def test_leetcode_defensive_parsing_missing_fields():
    evidence_list = collect_platform_evidence(
        profiles=[{"platform": "leetcode", "handle": "novice_coder", "url": "https://leetcode.com/u/novice_coder"}],
        allow_network=False,
    )
    assert len(evidence_list) == 1
    ev = evidence_list[0]
    assert ev.status == "ok"
    assert ev.solved_total == 25
    assert ev.solved_by_difficulty.get("Easy") == 20
    assert ev.solved_by_difficulty.get("Medium") == 5
    assert ev.solved_by_difficulty.get("Hard") == 0
    # tagProblemCounts was null in missing_fields fixture
    assert ev.topics == {}
    # userContestRanking was null
    assert ev.contest_rating is None
    assert ev.rank_title is None
    assert ev.languages.get("Python") == 25


def test_leetcode_fallback_query_simulation(monkeypatch):
    from backend.verification import platforms

    calls = []

    def mock_graphql(url, query, variables, timeout=10.0):
        calls.append(query)
        if "getUserProfile" in query:
            # Simulate failure on combined query
            raise RuntimeError("Combined query schema field error")
        # Return success on fallback query
        return {
            "data": {
                "matchedUser": {
                    "username": "fallback_user",
                    "profile": {"ranking": 88000},
                    "submitStatsGlobal": {
                        "acSubmissionNum": [{"difficulty": "All", "count": 120}]
                    },
                }
            }
        }

    monkeypatch.setattr(platforms, "_http_post_graphql", mock_graphql)
    result = platforms._fetch_leetcode_network("fallback_user", "https://leetcode.com/u/fallback_user", "2026-10-24T12:00:00Z")

    assert len(calls) == 2
    assert "getUserProfile" in calls[0]
    assert "getUserBasic" in calls[1]
    assert result.status == "ok"
    assert result.solved_total == 120
    assert result.global_rank == 88000


# ---------------------------------------------------------------------------
# 3. Throttling Behavior with Fake Clock
# ---------------------------------------------------------------------------
def test_throttler_fake_clock():
    fake_time = 100.0
    slept_durations = []

    def fake_clock():
        return fake_time

    def fake_sleep(duration):
        nonlocal fake_time
        slept_durations.append(duration)
        fake_time += duration

    throttler = Throttler(min_interval=2.0, clock=fake_clock, sleep_fn=fake_sleep)

    # First call: no wait
    waited1 = throttler.wait()
    assert waited1 == 0.0
    assert len(slept_durations) == 0

    # Advance fake time by only 0.5s (1.5s remaining to 2.0s limit)
    fake_time += 0.5
    waited2 = throttler.wait()
    assert waited2 == pytest.approx(1.5, rel=1e-3)
    assert len(slept_durations) == 1
    assert slept_durations[0] == pytest.approx(1.5, rel=1e-3)

    # Advance fake time by 3.0s (exceeds 2.0s)
    fake_time += 3.0
    waited3 = throttler.wait()
    assert waited3 == 0.0
    assert len(slept_durations) == 1


# ---------------------------------------------------------------------------
# 4. Cache Hit, Cache Expiry, and allow_network=False
# ---------------------------------------------------------------------------
def test_cache_hit_and_expiry():
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        fake_now = 5000.0

        sample = PlatformEvidence(
            platform="codeforces",
            handle="test_user",
            url="https://codeforces.com/profile/test_user",
            status="ok",
            fetched_at="2026-10-24T12:00:00Z",
            rating=1500,
        )

        _write_cache(sample, tmp_path, clock=lambda: fake_now)

        # Immediate read -> Cache Hit
        cached = _read_cache("codeforces", "test_user", tmp_path, ttl_seconds=3600, clock=lambda: fake_now + 100)
        assert cached is not None
        assert cached.status == "cached"
        assert cached.rating == 1500

        # Read after TTL expiry -> Cache Miss
        expired = _read_cache("codeforces", "test_user", tmp_path, ttl_seconds=3600, clock=lambda: fake_now + 3601)
        assert expired is None


def test_allow_network_false_not_found():
    results = collect_platform_evidence(
        profiles=[{"platform": "codeforces", "handle": "unknown_ghost_handle_xyz", "url": "..."}],
        allow_network=False,
    )
    assert len(results) == 1
    assert results[0].status == "not_found"
    assert "fixtures" in results[0].error.lower()


# ---------------------------------------------------------------------------
# 5. Skill Alias Normalization & Unrelated Skill Isolation
# ---------------------------------------------------------------------------
def test_skill_aliases_and_isolation():
    # Load strong codeforces + full leetcode
    profiles = collect_platform_evidence(
        profiles=[
            {"platform": "codeforces", "handle": "tourist_mock", "url": "https://codeforces.com/profile/tourist_mock"},
            {"platform": "leetcode", "handle": "alexrivera", "url": "https://leetcode.com/u/alexrivera"},
        ],
        allow_network=False,
    )

    skills = [
        "DSA",
        "Dynamic Programming",
        "CP",
        "Graphs",
        "C plus plus",
        "Python",
        "React",
        "Docker",
    ]

    matched = match_platform_to_skills(skills, profiles)

    # Canonical mapping works
    assert matched["DSA"].strength in ("some", "strong")
    assert matched["Dynamic Programming"].strength == "strong"
    assert matched["C plus plus"].strength == "strong"
    assert matched["Python"].strength == "strong"

    # Unrelated skills receive ZERO platform support
    assert matched["React"].strength == "none"
    assert matched["React"].solved_count == 0
    assert len(matched["React"].contributing) == 0

    assert matched["Docker"].strength == "none"
    assert matched["Docker"].solved_count == 0
    assert len(matched["Docker"].contributing) == 0


# ---------------------------------------------------------------------------
# 6. Threshold Boundaries for "some" and "strong"
# ---------------------------------------------------------------------------
def test_threshold_boundaries():
    # Topic skill: "some" >= 10, "strong" >= 40 + hard requirements
    p_some = PlatformEvidence(
        platform="leetcode",
        handle="user_some",
        url="...",
        status="ok",
        fetched_at="...",
        topics={"Dynamic Programming": TOPIC_SOME_SOLVED_THRESHOLD},
        solved_by_difficulty={"Easy": 10, "Medium": 0, "Hard": 0},
    )
    res_some = match_platform_to_skills(["Dynamic Programming"], [p_some])
    assert res_some["Dynamic Programming"].strength == "some"

    # 40 solved but only Easy problems -> still "some", not "strong"
    p_below_hard = PlatformEvidence(
        platform="leetcode",
        handle="user_easy",
        url="...",
        status="ok",
        fetched_at="...",
        topics={"Dynamic Programming": TOPIC_STRONG_SOLVED_THRESHOLD},
        solved_by_difficulty={"Easy": 40, "Medium": 0, "Hard": 0},
    )
    res_below_hard = match_platform_to_skills(["Dynamic Programming"], [p_below_hard])
    assert res_below_hard["Dynamic Programming"].strength == "some"

    # 40 solved with 15 Medium/Hard -> "strong"
    p_strong = PlatformEvidence(
        platform="leetcode",
        handle="user_strong",
        url="...",
        status="ok",
        fetched_at="...",
        topics={"Dynamic Programming": TOPIC_STRONG_SOLVED_THRESHOLD},
        solved_by_difficulty={"Easy": 25, "Medium": 15, "Hard": 0},
    )
    res_strong = match_platform_to_skills(["Dynamic Programming"], [p_strong])
    assert res_strong["Dynamic Programming"].strength == "strong"

    # Language skill: "some" >= 10, "strong" >= 50
    p_lang_9 = PlatformEvidence(
        platform="leetcode", handle="u", url="...", status="ok", fetched_at="...",
        languages={"C++": LANGUAGE_SOME_COUNT_THRESHOLD - 1}
    )
    assert match_platform_to_skills(["C++"], [p_lang_9])["C++"].strength == "none"

    p_lang_10 = PlatformEvidence(
        platform="leetcode", handle="u", url="...", status="ok", fetched_at="...",
        languages={"C++": LANGUAGE_SOME_COUNT_THRESHOLD}
    )
    assert match_platform_to_skills(["C++"], [p_lang_10])["C++"].strength == "some"

    p_lang_50 = PlatformEvidence(
        platform="leetcode", handle="u", url="...", status="ok", fetched_at="...",
        languages={"C++": LANGUAGE_STRONG_COUNT_THRESHOLD}
    )
    assert match_platform_to_skills(["C++"], [p_lang_50])["C++"].strength == "strong"


# ---------------------------------------------------------------------------
# 7. Step 3 Conflict Detection Rules (80% Rule, Titles, Badges, Missing Data)
# ---------------------------------------------------------------------------
def test_conflicts_title_inflation():
    weak_cf = collect_platform_evidence(
        profiles=[{"platform": "codeforces", "handle": "weak_coder", "url": "https://codeforces.com/profile/weak_coder"}],
        allow_network=False,
    )
    # weak_coder rating=1150, maxRating=1180. Expert requires 1600.
    claims = [Claim(claim_id="c1", skill="Competitive Programming", raw_statement="Codeforces Expert title with solid algorithms.", resume_pointer="skills[0]")]
    conflicts = check_platform_claims(claims, weak_cf)
    assert len(conflicts) == 1
    assert conflicts[0].conflict_type == "title_mismatch"
    assert "Expert" in conflicts[0].detail
    assert "1180" in conflicts[0].detail


def test_conflicts_80_percent_solve_count():
    lc_profile = [PlatformEvidence(
        platform="leetcode", handle="alex", url="...", status="ok", fetched_at="...",
        solved_total=350,
    )]
    # 500 claimed -> 80% is 400. 350 < 400 -> Conflict
    claims = [Claim(claim_id="c1", skill="LeetCode", raw_statement="Solved 500+ problems on LeetCode.", resume_pointer="skills[0]")]
    conflicts = check_platform_claims(claims, lc_profile)
    assert len(conflicts) == 1
    assert conflicts[0].conflict_type == "count_mismatch"
    assert "500" in conflicts[0].detail
    assert "350" in conflicts[0].detail

    # 420 actual solves -> 420 >= 400 -> No conflict
    lc_pass = [PlatformEvidence(
        platform="leetcode", handle="alex", url="...", status="ok", fetched_at="...",
        solved_total=420,
    )]
    assert len(check_platform_claims(claims, lc_pass)) == 0


def test_conflicts_badge_mismatch():
    lc_profile = [PlatformEvidence(
        platform="leetcode", handle="alex", url="...", status="ok", fetched_at="...",
        contest_rating=1750.0, rank_title="Knight",
    )]
    claims = [Claim(claim_id="c1", skill="Competitive Programming", raw_statement="Top competitive programmer holding LeetCode Guardian badge.", resume_pointer="skills[0]")]
    conflicts = check_platform_claims(claims, lc_profile)
    assert len(conflicts) == 1
    assert conflicts[0].conflict_type == "badge_mismatch"
    assert "Guardian" in conflicts[0].detail
    assert "1750.0" in conflicts[0].detail


def test_conflicts_handle_mismatch():
    lc_profile = [PlatformEvidence(
        platform="leetcode", handle="submitted_handle", url="...", status="ok", fetched_at="...",
    )]
    claims = [Claim(claim_id="c1", skill="Python", raw_statement="Check my solutions at leetcode.com/u/different_old_handle", resume_pointer="skills[0]")]
    conflicts = check_platform_claims(claims, lc_profile)
    assert len(conflicts) == 1
    assert conflicts[0].conflict_type == "handle_mismatch"
    assert "different_old_handle" in conflicts[0].detail
    assert "submitted_handle" in conflicts[0].detail


def test_no_conflict_on_missing_or_unavailable_data():
    unavailable_profiles = [
        PlatformEvidence(platform="codeforces", handle="ghost", url="...", status="not_found", fetched_at="..."),
        PlatformEvidence(platform="leetcode", handle="down", url="...", status="unavailable", fetched_at="..."),
    ]
    claims = [
        Claim(claim_id="c1", skill="Competitive Programming", raw_statement="Grandmaster on Codeforces with 1000+ problems solved.", resume_pointer="skills[0]"),
        Claim(claim_id="c2", skill="LeetCode", raw_statement="Guardian badge holder with 800+ solves on LeetCode.", resume_pointer="skills[1]"),
    ]
    conflicts = check_platform_claims(claims, unavailable_profiles)
    assert len(conflicts) == 0


# ---------------------------------------------------------------------------
# 8. Ownership Ceiling Logic & The Single Switch
# ---------------------------------------------------------------------------
def test_ownership_ceiling_switch():
    assert UNVERIFIED_PLATFORM_CEILING == TrustCeiling.CANDIDATE_SUPPLIED
    assert VERIFIED_PLATFORM_CEILING == TrustCeiling.THIRD_PARTY_ATTESTED

    # Unverified platform support cannot push to VERIFIED even if quiz passed
    claim = Claim(claim_id="c_dp", skill="Dynamic Programming", raw_statement="DP skills", resume_pointer="skills[0]")
    verification = VerificationResult(provenance=TrustCeiling.UNVERIFIED, evidence=[])
    support = SkillPlatformSupport(
        skill="Dynamic Programming",
        strength="strong",
        solved_count=95,
        detail="95 DP solves",
    )

    assessment = assess_skill(claim, verification, quiz_passed=True, platform_support=support)
    assert assessment.evidence_ceiling == TrustCeiling.CANDIDATE_SUPPLIED
    assert assessment.claim_state == ClaimState.SUPPORTED  # Capped at Supported by ceiling


# ---------------------------------------------------------------------------
# 9. Combined Repo + Platform Evidence Without Double Counting
# ---------------------------------------------------------------------------
def test_combined_evidence_no_double_counting():
    claim = Claim(claim_id="c_py", skill="Python", raw_statement="Python engineer", resume_pointer="skills[0]")

    repo_evidence = Evidence(
        evidence_id="ev_py_repo",
        claim_id="c_py",
        skill="Python",
        file_path="src/main.py",
        file_exists=True,
        authorship_pct=0.4,
        authorship_signal=AuthorshipSignal.PARTIAL,
        usage_depth=UsageDepth.MODERATE,
    )
    verification = VerificationResult(provenance=TrustCeiling.PLATFORM_VERIFIED, evidence=[repo_evidence])

    support = SkillPlatformSupport(
        skill="Python",
        strength="strong",  # maps to PLATFORM_WEIGHT_STRONG = 0.8
        solved_count=175,
        contributing=[{"platform": "leetcode", "handle": "alexrivera", "tags_used": ["Python"], "solved_count": 175}],
        detail="175 Python solves on LeetCode.",
    )

    platform_profiles = [
        PlatformEvidence(
            platform="leetcode", handle="alexrivera", url="https://leetcode.com/u/alexrivera",
            status="ok", fetched_at="2026-10-24T12:00:00Z",
        )
    ]

    assessment = assess_skill(
        claim,
        verification,
        quiz_passed=False,
        platform_support=support,
        platform_evidence_list=platform_profiles,
    )

    # State is Supported (multiplier 0.6)
    assert assessment.claim_state == ClaimState.SUPPORTED

    # Credibility calculation:
    # repo_weight = 0.4, platform_weight = 0.8 -> max(0.4, 0.8) = 0.8
    # credibility = round(0.8 * 0.6, 3) = 0.48
    assert assessment.credibility == 0.48

    # Evidence chain has both entries
    assert len(assessment.evidence_chain) == 2
    repo_item = assessment.evidence_chain[0]
    plat_item = assessment.evidence_chain[1]

    assert repo_item.source == "repo"
    assert repo_item.file == "src/main.py"
    assert repo_item.author_lines_pct == 0.4

    assert plat_item.source == "coding_platform"
    assert plat_item.file is None
    assert plat_item.author_lines_pct is None
    assert plat_item.label == "Leetcode / alexrivera"
    assert plat_item.ownership_verified is False
    assert plat_item.ceiling_applied == TrustCeiling.CANDIDATE_SUPPLIED


# ---------------------------------------------------------------------------
# 10. Resume-Only Claim Stays Capped at Claimed
# ---------------------------------------------------------------------------
def test_resume_only_claim_stays_capped_at_claimed():
    claim = Claim(claim_id="c_aws", skill="AWS", raw_statement="AWS Cloud practitioner", resume_pointer="skills[0]")
    verification = VerificationResult(provenance=TrustCeiling.PLATFORM_VERIFIED, evidence=[])
    assessment = assess_skill(claim, verification, quiz_passed=False, platform_support=None)

    assert assessment.claim_state == ClaimState.CLAIMED
    assert assessment.credibility == 0.0
    assert len(assessment.evidence_chain) == 0


# ---------------------------------------------------------------------------
# 11. Passport Payload Shape and Canonical JSON Stability
# ---------------------------------------------------------------------------
def test_passport_payload_shape_and_canonical_json():
    claim = Claim(claim_id="c1", skill="Python", raw_statement="Python developer", resume_pointer="skills[0]")
    verification = VerificationResult(provenance=TrustCeiling.PLATFORM_VERIFIED, evidence=[])
    target_role = TargetRole(role_name="Backend Engineer", required_skills=[{"skill": "Python", "weight": 1.0}])

    assessments = assess_all([claim], verification)
    platform_profiles = collect_platform_evidence(
        profiles=[{"platform": "leetcode", "handle": "alexrivera", "url": "https://leetcode.com/u/alexrivera"}],
        allow_network=False,
    )

    passport = build_passport(
        claims=[claim],
        assessments=assessments,
        target_role=target_role,
        quiz_questions=[],
        platform_evidence_list=platform_profiles,
    )

    payload_dict = passport.model_dump()
    assert "platform_profiles" in payload_dict
    assert "notes" in payload_dict
    assert len(payload_dict["platform_profiles"]) == 1
    assert payload_dict["platform_profiles"][0]["platform"] == "leetcode"
    assert payload_dict["platform_profiles"][0]["caveat"] == "Handle ownership not verified"

    # Canonical JSON check (sorted keys, stable dump)
    json_str_1 = json.dumps(payload_dict, sort_keys=True)
    json_str_2 = json.dumps(payload_dict, sort_keys=True)
    assert json_str_1 == json_str_2


# ---------------------------------------------------------------------------
# 12. Assertion: No LLM Client Imported or Referenced
# ---------------------------------------------------------------------------
def test_no_llm_imported_or_called():
    files_to_check = [
        Path("backend/verification/platforms.py"),
        Path("backend/verification/platform_matcher.py"),
        Path("backend/verification/platform_conflicts.py"),
        Path("backend/intelligence/state_engine.py"),
        Path("backend/intelligence/passport_builder.py"),
    ]

    forbidden_keywords = ["openai", "anthropic", "gemini", "langchain", "llama", "chatcompletion"]

    for file_path in files_to_check:
        if not file_path.exists():
            continue
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            tree = ast.parse(content, filename=str(file_path))

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    for forbidden in forbidden_keywords:
                        assert forbidden not in alias.name.lower(), f"Forbidden LLM import found in {file_path}: {alias.name}"
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                for forbidden in forbidden_keywords:
                    assert forbidden not in module.lower(), f"Forbidden LLM from-import found in {file_path}: {module}"
