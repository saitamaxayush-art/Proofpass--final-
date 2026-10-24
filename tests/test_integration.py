"""
End-to-end integration test using fixtures.
"""
import os
os.environ["INTELLIGENCE_LLM_API_KEY"] = ""
os.environ["INTELLIGENCE_FALLBACK_TO_MOCK"] = "true"

from intelligence.state_engine import assess_all
from intelligence.quiz_engine import generate_micro_quiz, evaluate_answer
from intelligence.role_matcher import match_role, compute_gaps
from intelligence.passport_builder import build_passport
from intelligence.models import QuizAnswer
from intelligence.fixtures import (
    MOCK_CLAIMS, MOCK_VERIFICATION_STRONG, MOCK_TARGET_ROLE,
    MOCK_CODE_SNIPPETS, MOCK_COMMIT_MESSAGES,
)


def test_full_pipeline():
    # 1. Assess all claims
    assessments = assess_all(MOCK_CLAIMS, MOCK_VERIFICATION_STRONG)
    assert len(assessments) == len(MOCK_CLAIMS)

    # 2. Generate quiz for first claim (React)
    react_claim = MOCK_CLAIMS[0]
    react_evidence = [e for e in MOCK_VERIFICATION_STRONG.evidence if e.claim_id == react_claim.claim_id]
    questions = generate_micro_quiz(react_claim, react_evidence, MOCK_CODE_SNIPPETS, MOCK_COMMIT_MESSAGES)
    assert len(questions) >= 1

    # 3. Evaluate a fake-premise answer (pushback -> pass)
    fake_premise_q = next((q for q in questions if q.question_type.value == "fake_premise"), None)
    if fake_premise_q:
        ans = QuizAnswer(question_id=fake_premise_q.question_id, answer_text="I did not use that technology.")
        result = evaluate_answer(fake_premise_q, ans)
        assert result.passed is True

    # 4. Match role
    # UPDATED: Now unpacks 3 values (score, breakdown, bonus_skills)
    score, breakdown, bonus_skills = match_role(assessments, MOCK_TARGET_ROLE)
    assert 0.0 <= score <= 1.0

    # 5. Compute gaps
    gaps = compute_gaps(breakdown)
    assert len(gaps) >= 1  # AWS and Docker should be gaps

    # 6. Build passport
    passport = build_passport(
        claims=MOCK_CLAIMS,
        assessments=assessments,
        target_role=MOCK_TARGET_ROLE,
        quiz_questions=questions,
    )
    assert passport.target_role == MOCK_TARGET_ROLE.role_name
    assert len(passport.skills) == len(MOCK_CLAIMS)
    assert 0.0 <= passport.role_match_score <= 1.0
    assert passport.passport_id.startswith("pp_")