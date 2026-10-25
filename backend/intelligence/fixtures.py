"""
Mock data for standalone testing.
"""
from .models import (Claim, Evidence, VerificationResult, RepoMetadata, TrustCeiling, UsageDepth, AuthorshipSignal, TargetRole, RequiredSkill)

MOCK_CLAIMS = [
    Claim(claim_id="cl_001", skill="React", resume_pointer="Projects, line 4", repo_hint="src/App.tsx"),
    Claim(claim_id="cl_002", skill="Python", resume_pointer="Experience, line 2", repo_hint="main.py"),
    Claim(claim_id="cl_003", skill="AWS", resume_pointer="Skills, line 1", repo_hint=None),
]

MOCK_VERIFICATION_STRONG = VerificationResult(provenance=TrustCeiling.PLATFORM_VERIFIED, repo=RepoMetadata(is_fork=False, fork_of=None), evidence=[
    Evidence(evidence_id="ev_001", claim_id="cl_001", skill="React", source_type="github_code", file_path="src/App.tsx", file_exists=True, usage_depth=UsageDepth.SUBSTANTIAL, authorship_pct=0.85, authorship_signal=AuthorshipSignal.STRONG, commit_count=12),
    Evidence(evidence_id="ev_002", claim_id="cl_002", skill="Python", source_type="github_code", file_path="main.py", file_exists=True, usage_depth=UsageDepth.MODERATE, authorship_pct=0.40, authorship_signal=AuthorshipSignal.PARTIAL, commit_count=3),
])
MOCK_VERIFICATION_CONFLICT = VerificationResult(provenance=TrustCeiling.PLATFORM_VERIFIED, repo=RepoMetadata(is_fork=True, fork_of="facebook/react-tutorial"), evidence=[
    Evidence(evidence_id="ev_005", claim_id="cl_001", skill="React", source_type="github_code", file_path="src/App.tsx", file_exists=True, usage_depth=UsageDepth.SUBSTANTIAL, authorship_pct=0.05, authorship_signal=AuthorshipSignal.NONE, commit_count=1, conflicts=["forked tutorial repo"]),
])
MOCK_VERIFICATION_WEAK = VerificationResult(provenance=TrustCeiling.CANDIDATE_SUPPLIED, repo=RepoMetadata(is_fork=False, fork_of=None), evidence=[
    Evidence(evidence_id="ev_006", claim_id="cl_001", skill="React", source_type="zip_upload", file_path="App.tsx", file_exists=True, usage_depth=UsageDepth.DETECTED, authorship_pct=0.0, authorship_signal=AuthorshipSignal.NONE, commit_count=0),
])

MOCK_TARGET_ROLE = TargetRole(role_name="Full Stack Developer", required_skills=[
    RequiredSkill(skill="React", weight=0.3), RequiredSkill(skill="Python", weight=0.3),
    RequiredSkill(skill="PostgreSQL", weight=0.2), RequiredSkill(skill="AWS", weight=0.1), RequiredSkill(skill="Docker", weight=0.1),
])
MOCK_CODE_SNIPPETS = {"src/App.tsx": "import React from 'react'; function App() { return <div>Hello</div>; }"}
MOCK_COMMIT_MESSAGES = ["fix: handle null data", "feat: add root endpoint"]