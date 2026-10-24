"""
Demo script: runs the full M4 pipeline with mock data and prints the passport.
"""
import json
import os
import sys
from pathlib import Path

# Ensure backend/ is on path
sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

try:
    import intelligence
except ModuleNotFoundError:
    import Intelligence
    sys.modules["intelligence"] = Intelligence

os.environ.setdefault("INTELLIGENCE_LLM_API_KEY", "")
os.environ.setdefault("INTELLIGENCE_FALLBACK_TO_MOCK", "true")

from intelligence.fixtures import (
    MOCK_CLAIMS, MOCK_VERIFICATION_STRONG, MOCK_TARGET_ROLE,
    MOCK_CODE_SNIPPETS, MOCK_COMMIT_MESSAGES,
)
from intelligence.state_engine import assess_all
from intelligence.quiz_engine import generate_micro_quiz
from intelligence.passport_builder import build_passport


def main():
    print("=" * 60)
    print("ProofPass M4 Demo: Full Pipeline with Mock Data")
    print("=" * 60)

    # 1. Assess claims
    print("\n[1/4] Assessing claims against evidence...")
    assessments = assess_all(MOCK_CLAIMS, MOCK_VERIFICATION_STRONG)
    for a in assessments:
        print(f"  - {a.name:15s} -> {a.claim_state.value:12s} (credibility={a.credibility:.2f})")

    # 2. Generate quiz for React
    print("\n[2/4] Generating micro-quiz for React...")
    react_claim = MOCK_CLAIMS[0]
    react_evidence = [e for e in MOCK_VERIFICATION_STRONG.evidence if e.claim_id == react_claim.claim_id]
    questions = generate_micro_quiz(
        react_claim, react_evidence, MOCK_CODE_SNIPPETS, MOCK_COMMIT_MESSAGES
    )
    for q in questions:
        print(f"  [{q.question_type.value}] {q.question_text[:80]}...")

    # 3. Build passport
    print("\n[3/4] Building passport...")
    passport = build_passport(
        claims=MOCK_CLAIMS,
        assessments=assessments,
        target_role=MOCK_TARGET_ROLE,
        quiz_questions=questions,
    )

    # 4. Print summary
    print("\n[4/4] Passport Summary:")
    print(f"  Passport ID:    {passport.passport_id}")
    print(f"  Target Role:    {passport.target_role}")
    print(f"  Match Score:    {passport.role_match_score:.1%}")
    print(f"  Skills:         {len(passport.skills)}")
    print(f"  Gaps:           {len(passport.skill_gaps)}")
    print(f"  Quiz Questions: {len(passport.quiz_questions)}")

    print("\n  Top Gaps:")
    for g in passport.skill_gaps[:3]:
        print(f"    - {g.skill}: {g.recommended_action[:60]}...")

    # 5. Dump full payload
    out_path = Path("passport_payload.json")
    out_path.write_text(passport.model_dump_json(indent=2))
    print(f"\n[OK] Full passport payload written to {out_path}")


if __name__ == "__main__":
    main()