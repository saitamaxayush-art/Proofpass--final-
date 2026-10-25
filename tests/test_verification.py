"""
Unit tests for Member 3 (Evidence Verification Engine).
"""
import pytest
from pydantic import ValidationError

from backend.verification.models import (
    Claim,
    Evidence,
    RepoMetadata,
    VerificationResult,
    TrustCeiling,
    UsageDepth,
    AuthorshipSignal,
)


# ---------------------------------------------------------------------------
# Milestone 1: Models & Schemas
# ---------------------------------------------------------------------------

def test_claim_model_defaults_and_validation():
    claim = Claim(skill="  Python  ", resume_pointer="Experience, Line 5")
    assert claim.skill == "Python"
    assert claim.claim_id.startswith("cl_")
    assert claim.repo_hint is None

    # Empty skill should fail validation
    with pytest.raises(ValidationError):
        Claim(skill="", resume_pointer="p1")


def test_evidence_model_constraints():
    ev = Evidence(
        claim_id="cl_123",
        skill="FastAPI",
        file_path="main.py",
        file_exists=True,
        usage_depth=UsageDepth.SUBSTANTIAL,
        authorship_pct=0.85,
        authorship_signal=AuthorshipSignal.STRONG,
        commit_count=12,
        conflicts=[],
    )
    assert ev.evidence_id.startswith("ev_")
    assert ev.source_type == "github_code"
    assert ev.authorship_pct == 0.85

    # Out of bounds authorship_pct must fail validation
    with pytest.raises(ValidationError):
        Evidence(
            claim_id="cl_123",
            skill="FastAPI",
            file_exists=True,
            authorship_pct=1.5,
        )


def test_verification_result_serialization():
    meta = RepoMetadata(is_fork=True, fork_of="octocat/Spoon-Knife")
    ev = Evidence(
        claim_id="cl_1",
        skill="React",
        file_exists=True,
        usage_depth=UsageDepth.MODERATE,
    )
    res = VerificationResult(
        provenance=TrustCeiling.PLATFORM_VERIFIED,
        repo=meta,
        evidence=[ev],
    )
    data = res.model_dump()
    assert data["provenance"] == "Platform-Verified"
    assert data["repo"]["is_fork"] is True
    assert data["repo"]["fork_of"] == "octocat/Spoon-Knife"
    assert len(data["evidence"]) == 1

    # Roundtrip check
    restored = VerificationResult.model_validate(data)
    assert restored.provenance == TrustCeiling.PLATFORM_VERIFIED
    assert restored.repo.fork_of == "octocat/Spoon-Knife"


# ---------------------------------------------------------------------------
# Milestone 2: PDF Resume Text Extraction
# ---------------------------------------------------------------------------

import io
import tempfile
from pathlib import Path
import pymupdf
from backend.verification.resume_extractor import extract_resume_text


def _create_sample_pdf(pages_text: list[str]) -> bytes:
    """Helper to generate in-memory PDF bytes with PyMuPDF."""
    doc = pymupdf.open()
    for text in pages_text:
        page = doc.new_page()
        page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_extract_resume_text_from_bytes():
    pdf_bytes = _create_sample_pdf(["Alex Developer\nExperience: Python Backend\nSkills: FastAPI, PostgreSQL"])
    extracted = extract_resume_text(pdf_bytes)
    assert "Alex Developer" in extracted
    assert "Skills: FastAPI, PostgreSQL" in extracted


def test_extract_resume_text_multipage():
    pdf_bytes = _create_sample_pdf([
        "Page 1: Summary\nExperienced full-stack developer.",
        "Page 2: Projects\nBuilt distributed ledger with React and Python."
    ])
    with tempfile.TemporaryDirectory() as td:
        pdf_path = Path(td) / "resume.pdf"
        pdf_path.write_bytes(pdf_bytes)

        # Test file path input
        extracted = extract_resume_text(pdf_path)
        assert "Page 1: Summary" in extracted
        assert "Page 2: Projects" in extracted


def test_extract_resume_text_stream():
    pdf_bytes = _create_sample_pdf(["Stream test content"])
    bio = io.BytesIO(pdf_bytes)
    extracted = extract_resume_text(bio)
    assert "Stream test content" in extracted


def test_extract_resume_text_empty_doc_raises():
    # Empty PDF with a blank page (no text)
    doc = pymupdf.open()
    doc.new_page()
    empty_bytes = doc.tobytes()
    doc.close()

    with pytest.raises(ValueError, match="no extractable text"):
        extract_resume_text(empty_bytes)


def test_extract_resume_text_corrupt_bytes():
    with pytest.raises(ValueError):
        extract_resume_text(b"corrupt non-pdf raw bytes")


def test_extract_resume_text_missing_file():
    with tempfile.TemporaryDirectory() as td:
        missing_file = Path(td) / "does_not_exist.pdf"
        with pytest.raises(FileNotFoundError):
            extract_resume_text(missing_file)


# ---------------------------------------------------------------------------
# Milestone 3: GitHub Client & URL Parsing
# ---------------------------------------------------------------------------

import base64
from unittest.mock import MagicMock
from backend.verification.github_client import (
    parse_github_url,
    GitHubClient,
    RepoNotFoundError,
    RateLimitError,
)


def test_parse_github_url_valid():
    assert parse_github_url("https://github.com/torvalds/linux") == ("torvalds", "linux")
    assert parse_github_url("http://github.com/facebook/react.git") == ("facebook", "react")
    assert parse_github_url("github.com/psf/requests/") == ("psf", "requests")
    assert parse_github_url("git@github.com:openai/openai-python.git") == ("openai", "openai-python")


def test_parse_github_url_invalid():
    with pytest.raises(ValueError, match="empty"):
        parse_github_url("")

    with pytest.raises(ValueError, match="Invalid GitHub host"):
        parse_github_url("https://gitlab.com/user/project")

    with pytest.raises(ValueError, match="Expected owner and repository"):
        parse_github_url("https://github.com/lonely-owner")


def test_github_client_metadata_and_caching():
    mock_session = MagicMock()
    # Mock /repos/owner/repo
    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "fork": True,
        "parent": {"full_name": "facebook/react-tutorial"},
        "default_branch": "main",
        "size": 1540,
    }
    mock_session.get.return_value = mock_resp

    client = GitHubClient(token="mock_tok", session=mock_session)
    meta = client.get_repo_metadata("alice", "react-tutorial")

    assert meta.is_fork is True
    assert meta.fork_of == "facebook/react-tutorial"
    assert meta.default_branch == "main"
    assert meta.size_kb == 1540
    assert mock_session.get.call_count == 1

    # Second call should be served from in-memory cache
    meta_cached = client.get_repo_metadata("alice", "react-tutorial")
    assert meta_cached.is_fork is True
    assert mock_session.get.call_count == 1  # No additional network call!


def test_github_client_tree_and_file_content():
    mock_session = MagicMock()

    # 1. Mock tree response
    tree_resp = MagicMock()
    tree_resp.ok = True
    tree_resp.status_code = 200
    tree_resp.json.return_value = {
        "tree": [
            {"path": "package.json", "type": "blob", "size": 120},
            {"path": "src/App.tsx", "type": "blob", "size": 850},
        ]
    }

    # 2. Mock file content response (base64 encoded)
    file_resp = MagicMock()
    file_resp.ok = True
    file_resp.status_code = 200
    encoded = base64.b64encode(b'{"name": "demo", "dependencies": {"react": "^18.0"}}').decode("utf-8")
    file_resp.json.return_value = {"content": encoded, "encoding": "base64"}

    mock_session.get.side_effect = [tree_resp, file_resp]

    client = GitHubClient(token="mock_tok", session=mock_session)
    tree = client.get_repo_tree("alice", "demo", "main")
    assert len(tree) == 2
    assert tree[0]["path"] == "package.json"

    content = client.get_file_content("alice", "demo", "package.json")
    assert '"react": "^18.0"' in content


def test_github_client_error_handling():
    mock_session = MagicMock()

    # 404 response
    not_found_resp = MagicMock()
    not_found_resp.ok = False
    not_found_resp.status_code = 404
    mock_session.get.return_value = not_found_resp

    client = GitHubClient(token="mock_tok", session=mock_session)
    with pytest.raises(RepoNotFoundError):
        client.get_repo_metadata("alice", "non-existent")

    # 403 rate limit response
    rate_limit_resp = MagicMock()
    rate_limit_resp.ok = False
    rate_limit_resp.status_code = 403
    rate_limit_resp.headers = {"Content-Type": "application/json"}
    rate_limit_resp.json.return_value = {"message": "API rate limit exceeded"}
    mock_session.get.return_value = rate_limit_resp

    client2 = GitHubClient(token="mock_tok", session=mock_session)
    with pytest.raises(RateLimitError, match="rate limit"):
        client2.get_repo_metadata("alice", "demo")


# ---------------------------------------------------------------------------
# Milestone 4: Evidence Locator & Usage Depth Engine
# ---------------------------------------------------------------------------

import hashlib
from backend.verification.detector import (
    compute_content_sha256,
    classify_usage_depth,
    locate_evidence_for_claim,
)


def test_compute_content_sha256():
    content = "print('hello world')"
    expected = hashlib.sha256(content.encode("utf-8")).hexdigest()
    assert compute_content_sha256(content) == expected


def test_classify_usage_depth_levels():
    # 1. NONE
    depth, hits = classify_usage_depth("React", "main.py", "print('hello')")
    assert depth == UsageDepth.NONE
    assert hits == 0

    # 2. DETECTED via manifest
    depth, hits = classify_usage_depth(
        "React", "package.json", '{"dependencies": {"react": "^18.0"}}', is_manifest=True
    )
    assert depth == UsageDepth.DETECTED

    # 3. MODERATE
    code_mod = """
    import { useState, useEffect } from 'react';
    function Component() { return <div>React app</div>; }
    """
    depth, hits = classify_usage_depth("React", "src/Comp.tsx", code_mod)
    assert depth in (UsageDepth.MODERATE, UsageDepth.SUBSTANTIAL)

    # 4. SUBSTANTIAL
    code_sub = """
    import React, { useState, useEffect, useCallback, useMemo } from 'react';
    export class CustomReactProvider extends React.Component {
        render() {
            return <React.Fragment>{this.props.children}</React.Fragment>;
        }
    }
    """
    depth, hits = classify_usage_depth("React", "src/App.tsx", code_sub)
    assert depth == UsageDepth.SUBSTANTIAL
    assert hits >= 4


def test_locate_evidence_using_repo_hint():
    claim = Claim(skill="React", resume_pointer="line 1", repo_hint="src/App.tsx")
    file_tree = [
        {"path": "package.json", "type": "blob"},
        {"path": "src/App.tsx", "type": "blob"},
    ]
    files = {
        "src/App.tsx": "import React from 'react'; export default function App() { return <div>React</div>; }",
        "package.json": '{"dependencies": {"react": "^18.0.0"}}',
    }

    evidence = locate_evidence_for_claim(claim, file_tree, lambda p: files.get(p))
    assert evidence.file_exists is True
    assert evidence.file_path == "src/App.tsx"
    assert evidence.content_sha256 is not None
    assert evidence.usage_depth in (UsageDepth.MODERATE, UsageDepth.SUBSTANTIAL)


def test_locate_evidence_using_manifest_fallback():
    # No repo_hint provided, should discover React in package.json
    claim = Claim(skill="React", resume_pointer="line 10", repo_hint=None)
    file_tree = [
        {"path": "README.md", "type": "blob"},
        {"path": "package.json", "type": "blob"},
    ]
    files = {
        "README.md": "# Demo App",
        "package.json": '{"dependencies": {"react": "^18.2.0"}}',
    }

    evidence = locate_evidence_for_claim(claim, file_tree, lambda p: files.get(p))
    assert evidence.file_exists is True
    assert evidence.file_path == "package.json"
    assert evidence.usage_depth == UsageDepth.DETECTED


def test_locate_evidence_missing_claim():
    claim = Claim(skill="AWS", resume_pointer="line 20", repo_hint=None)
    file_tree = [
        {"path": "main.py", "type": "blob"},
    ]
    files = {
        "main.py": "def hello(): return 'world'",
    }

    evidence = locate_evidence_for_claim(claim, file_tree, lambda p: files.get(p))
    assert evidence.file_exists is False
    assert evidence.usage_depth == UsageDepth.NONE
    assert evidence.content_sha256 is None


# ---------------------------------------------------------------------------
# Milestone 5: Git Blame Authorship & Commit Velocity
# ---------------------------------------------------------------------------

from backend.verification.git_engine import (
    parse_git_blame_porcelain,
    compute_file_authorship,
    analyze_repo_commits,
)


SAMPLE_PORCELAIN_OUTPUT = """
a1b2c3d4 1 1 2
author Alice Smith
author-mail <alice@example.com>
author-time 1700000000
filename main.py
\tdef foo():
a1b2c3d4 2 2
author Alice Smith
author-mail <alice@example.com>
author-time 1700000000
filename main.py
\t    return 42
e5f6g7h8 3 3 1
author Bob Builder
author-mail <bob@example.com>
author-time 1700000100
filename main.py
\t# Comment added by Bob
"""


def test_parse_git_blame_porcelain_strong():
    # Alice has 2 out of 3 lines = 66.7% -> STRONG
    pct, signal, cand_lines, total_lines = parse_git_blame_porcelain(
        SAMPLE_PORCELAIN_OUTPUT, ["Alice Smith", "alice"]
    )
    assert cand_lines == 2
    assert total_lines == 3
    assert pct == 0.6667
    assert signal == AuthorshipSignal.STRONG


def test_parse_git_blame_porcelain_partial():
    # Bob has 1 out of 3 lines = 33.3% -> PARTIAL
    pct, signal, cand_lines, total_lines = parse_git_blame_porcelain(
        SAMPLE_PORCELAIN_OUTPUT, ["bob"]
    )
    assert cand_lines == 1
    assert total_lines == 3
    assert pct == 0.3333
    assert signal == AuthorshipSignal.PARTIAL


def test_parse_git_blame_porcelain_none():
    # Charlie has 0 lines -> NONE
    pct, signal, cand_lines, total_lines = parse_git_blame_porcelain(
        SAMPLE_PORCELAIN_OUTPUT, ["charlie"]
    )
    assert cand_lines == 0
    assert total_lines == 3
    assert pct == 0.0
    assert signal == AuthorshipSignal.NONE


is_git_checkout = (Path(__file__).resolve().parents[1] / ".git").exists()


@pytest.mark.skipif(not is_git_checkout, reason="Project is not a git checkout")
def test_compute_file_authorship_on_local_repo():
    # Real git blame on local workspace repo
    pct, signal = compute_file_authorship(
        repo_path=".",
        relative_file_path="backend/verification/models.py",
        candidate_identities=["Ameya Morgaonkar", "ameya"],
    )
    assert pct > 0.0
    assert signal in (AuthorshipSignal.STRONG, AuthorshipSignal.PARTIAL)

    # Missing file returns 0.0
    pct_missing, signal_missing = compute_file_authorship(
        repo_path=".",
        relative_file_path="non_existent_file.py",
        candidate_identities=["ameya"],
    )
    assert pct_missing == 0.0
    assert signal_missing == AuthorshipSignal.NONE


@pytest.mark.skipif(not is_git_checkout, reason="Project is not a git checkout")
def test_analyze_repo_commits_on_local_repo():
    res = analyze_repo_commits(
        repo_path=".",
        candidate_identities=["Ameya Morgaonkar", "ameya"],
    )
    assert res["total_commits"] > 0
    assert res["candidate_commits"] > 0
    assert len(res["commits"]) > 0


# ---------------------------------------------------------------------------
# Milestone 6: Conflict & Anti-Fraud Detection
# ---------------------------------------------------------------------------

from backend.verification.heuristics import (
    detect_conflicts_for_evidence,
    compute_provenance,
    is_tutorial_name,
)


def test_is_tutorial_name():
    assert is_tutorial_name("facebook/react-tutorial") is True
    assert is_tutorial_name("next-learn-starter") is True
    assert is_tutorial_name("my-custom-production-service") is False
    assert is_tutorial_name(None) is False


def test_detect_conflicts_forked_tutorial_zero_commits():
    meta = RepoMetadata(is_fork=True, fork_of="facebook/react-tutorial")
    ev = Evidence(
        claim_id="cl_1",
        skill="React",
        file_exists=True,
        authorship_pct=0.0,
        authorship_signal=AuthorshipSignal.NONE,
    )
    conflicts = detect_conflicts_for_evidence(meta, ev, candidate_commit_count=0, total_commits=15)
    assert len(conflicts) == 1
    assert "forked tutorial repo with no original commits" in conflicts[0]


def test_detect_conflicts_forked_with_trivial_commits():
    meta = RepoMetadata(is_fork=True, fork_of="facebook/react-tutorial")
    ev = Evidence(
        claim_id="cl_1",
        skill="React",
        file_exists=True,
        authorship_pct=0.04,  # Only 4%
        authorship_signal=AuthorshipSignal.NONE,
    )
    conflicts = detect_conflicts_for_evidence(meta, ev, candidate_commit_count=1, total_commits=10)
    assert len(conflicts) == 1
    assert "forked tutorial repo with no original commits" in conflicts[0]


def test_detect_conflicts_non_fork_repo():
    # Normal original repository with good authorship
    meta = RepoMetadata(is_fork=False, fork_of=None)
    ev = Evidence(
        claim_id="cl_1",
        skill="React",
        file_exists=True,
        authorship_pct=0.85,
        authorship_signal=AuthorshipSignal.STRONG,
    )
    conflicts = detect_conflicts_for_evidence(meta, ev, candidate_commit_count=12, total_commits=12)
    assert conflicts == []


def test_detect_conflicts_missing_file_never_contradicted():
    # Missing file alone is NEVER contradicted
    meta = RepoMetadata(is_fork=True, fork_of="facebook/react-tutorial")
    ev = Evidence(
        claim_id="cl_1",
        skill="AWS",
        file_exists=False,
    )
    conflicts = detect_conflicts_for_evidence(meta, ev, candidate_commit_count=0, total_commits=15)
    assert conflicts == []


def test_compute_provenance():
    meta = RepoMetadata(is_fork=False)
    ev_present = Evidence(claim_id="c1", skill="React", file_exists=True)
    ev_missing = Evidence(claim_id="c2", skill="AWS", file_exists=False)

    # 1. GitHub repo with existing evidence -> Platform-Verified
    prov = compute_provenance(meta, [ev_present, ev_missing], is_github_repo=True)
    assert prov == TrustCeiling.PLATFORM_VERIFIED

    # 2. Upload with existing evidence -> Candidate-Supplied
    prov_upload = compute_provenance(meta, [ev_present], is_github_repo=False)
    assert prov_upload == TrustCeiling.CANDIDATE_SUPPLIED

    # 3. Only missing files -> Unverified
    prov_empty = compute_provenance(meta, [ev_missing], is_github_repo=True)
    assert prov_empty == TrustCeiling.UNVERIFIED


# ---------------------------------------------------------------------------
# Milestone 7: Pipeline Assembly & Interoperability
# ---------------------------------------------------------------------------

from backend.verification.verifier import verify
from backend.verification.fixtures import FIXTURE_CLAIMS
from backend.intelligence.state_engine import assess_all


def test_verify_pipeline_strong_offline():
    res = verify(
        claims=FIXTURE_CLAIMS,
        github_url="https://github.com/alex/fullstack-demo",
        candidate_identity="alex",
        allow_network=False,
    )
    assert res.provenance == TrustCeiling.PLATFORM_VERIFIED
    assert len(res.evidence) == 3

    react_ev = next(e for e in res.evidence if e.skill == "React")
    assert react_ev.file_exists is True
    assert react_ev.file_path == "src/App.tsx"
    assert react_ev.usage_depth == UsageDepth.SUBSTANTIAL
    assert react_ev.authorship_signal == AuthorshipSignal.STRONG
    assert react_ev.conflicts == []

    aws_ev = next((e for e in res.evidence if e.skill == "AWS"), None)
    assert aws_ev is None  # Uncorroborated skill has no evidence

    # Feed into M4 assess_all pipeline
    assessments = assess_all(FIXTURE_CLAIMS, res)
    state_map = {a.name: a.claim_state.value for a in assessments}
    assert state_map["React"] == "Supported"  # One micro-quiz away from Verified!
    assert state_map["Python"] == "Supported"
    assert state_map["AWS"] == "Claimed"  # Missing evidence -> Claimed


def test_verify_pipeline_conflict_offline():
    res = verify(
        claims=FIXTURE_CLAIMS,
        github_url="https://github.com/alex/react-tutorial",
        candidate_identity="alex",
        allow_network=False,
    )
    assert res.repo.is_fork is True
    assert res.repo.fork_of == "facebook/react-tutorial"

    react_ev = next(e for e in res.evidence if e.skill == "React")
    assert len(react_ev.conflicts) == 1
    assert "forked tutorial repo" in react_ev.conflicts[0]

    # Feed into M4 assess_all pipeline -> Contradicted!
    assessments = assess_all(FIXTURE_CLAIMS, res)
    state_map = {a.name: a.claim_state.value for a in assessments}
    assert state_map["React"] == "Contradicted"


# ---------------------------------------------------------------------------
# Milestone 8: Hardening & Edge-Case Testing
# ---------------------------------------------------------------------------

def test_verify_edge_case_empty_claims():
    res = verify(
        claims=[],
        github_url="https://github.com/alex/demo",
        allow_network=False,
    )
    assert res.evidence == []
    assert res.provenance == TrustCeiling.UNVERIFIED


def test_verify_edge_case_invalid_url():
    res = verify(
        claims=FIXTURE_CLAIMS,
        github_url="not-a-valid-url-format",
        allow_network=True,
    )
    assert res.provenance == TrustCeiling.UNVERIFIED
    for ev in res.evidence:
        assert ev.file_exists is False


def test_verify_edge_case_private_or_404_repo():
    mock_client = MagicMock()
    mock_client.get_repo_metadata.side_effect = RepoNotFoundError("Private repo")

    res = verify(
        claims=FIXTURE_CLAIMS,
        github_url="https://github.com/private/repo",
        github_client=mock_client,
        allow_network=True,
    )
    assert res.provenance == TrustCeiling.UNVERIFIED
    for ev in res.evidence:
        assert ev.file_exists is False


def test_verify_edge_case_empty_tree():
    mock_client = MagicMock()
    mock_client.get_repo_metadata.return_value = RepoMetadata(is_fork=False)
    mock_client.get_repo_tree.return_value = []  # Empty repository!
    mock_client.get_commit_activity.return_value = {"commit_count": 0}

    res = verify(
        claims=FIXTURE_CLAIMS,
        github_url="https://github.com/alex/empty-repo",
        github_client=mock_client,
        allow_network=True,
    )
    assert res.provenance == TrustCeiling.UNVERIFIED
    for ev in res.evidence:
        assert ev.file_exists is False


