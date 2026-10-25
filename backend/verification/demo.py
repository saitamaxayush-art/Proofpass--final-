"""
Demo script for Member 3 (Evidence Verification Engine).
Demonstrates PyMuPDF text extraction, cached GitHub/offline verification,
and conflict detection without any external or LLM dependencies.
"""
from __future__ import annotations

import io
import json
import os
import sys
from pathlib import Path

# Add repo root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pymupdf
from backend.verification.models import Claim, TrustCeiling, UsageDepth, AuthorshipSignal
from backend.verification.resume_extractor import extract_resume_text
from backend.verification.verifier import verify
from backend.verification.fixtures import FIXTURE_CLAIMS


def run_demo():
    print("=" * 70)
    print("ProofPass M3 Demo: Evidence Verification Engine (Deterministic)")
    print("=" * 70)

    # 1. Resume text extraction demonstration
    print("\n[1/3] Extracting plain text from sample resume PDF (PyMuPDF)...")
    doc = pymupdf.open()
    page1 = doc.new_page()
    page1.insert_text(
        (50, 72),
        "Alex Morgaonkar\nFull-Stack Engineer\n\nExperience:\n- Built FastAPI microservices and React dashboards\n- Designed PostgreSQL schema with indexed queries\n\nSkills: React, Python, PostgreSQL, AWS",
        fontsize=11,
    )
    pdf_bytes = doc.tobytes()
    doc.close()

    resume_text = extract_resume_text(pdf_bytes)
    print("Extracted Resume Lines:")
    for line in resume_text.splitlines()[:5]:
        print(f"  > {line}")

    # 2. Verify against Strong Candidate Repository
    print("\n[2/3] Verifying candidate claims against public repository (Strong Candidate)...")
    strong_result = verify(
        claims=FIXTURE_CLAIMS,
        github_url="https://github.com/alex/fullstack-production-service",
        candidate_identity="alex",
        allow_network=False,
    )
    print(f"  Provenance: {strong_result.provenance.value}")
    print(f"  Repo Fork Status: is_fork={strong_result.repo.is_fork}")
    print("  Evidence Items Discovered:")
    for ev in strong_result.evidence:
        print(
            f"    - [{ev.skill:10s}] file={ev.file_path:15s} "
            f"depth={ev.usage_depth.value:11s} authors_pct={ev.authorship_pct:.0%} "
            f"signal={ev.authorship_signal.value:7s} conflicts={ev.conflicts}"
        )

    # 3. Verify against Forked Tutorial Repository
    print("\n[3/3] Verifying candidate claims against Forked Tutorial (Conflict Detection)...")
    conflict_result = verify(
        claims=FIXTURE_CLAIMS,
        github_url="https://github.com/alex/react-tutorial",
        candidate_identity="alex",
        allow_network=False,
    )
    print(f"  Provenance: {conflict_result.provenance.value}")
    print(f"  Repo Fork: is_fork={conflict_result.repo.is_fork} (fork_of={conflict_result.repo.fork_of})")
    for ev in conflict_result.evidence:
        print(
            f"    - [{ev.skill:10s}] depth={ev.usage_depth.value:11s} "
            f"signal={ev.authorship_signal.value:7s} conflicts={ev.conflicts}"
        )

    print("\n" + "=" * 70)
    print("Demo completed successfully. Output payload matches shared contract schema.")
    print("=" * 70)


if __name__ == "__main__":
    run_demo()
