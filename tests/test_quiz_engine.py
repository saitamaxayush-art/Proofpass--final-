import pytest
from backend.intelligence.quiz_engine import generate_micro_quiz, evaluate_answer
from backend.intelligence.models import Claim, Evidence, QuizAnswer, QuestionType, UsageDepth, AuthorshipSignal


def test_generate_fallback_produces_questions(claims, code_snippets, commit_messages):
    claim = claims[0]  # React
    evidence = [
        Evidence(
            evidence_id="e1", claim_id=claim.claim_id, skill="React",
            source_type="github_code", file_path="src/App.tsx", file_exists=True,
            usage_depth=UsageDepth.SUBSTANTIAL,
            authorship_pct=0.8, authorship_signal=AuthorshipSignal.STRONG,
        )
    ]
    qs = generate_micro_quiz(claim, evidence, code_snippets, commit_messages)
    assert len(qs) >= 1
    assert all(q.claim_id == claim.claim_id for q in qs)


def test_evaluate_fake_premise_pushback():
    from backend.intelligence.models import QuizQuestion
    q = QuizQuestion(
        question_id="q1", claim_id="c1", skill="React",
        question_type=QuestionType.FAKE_PREMISE,
        question_text="Why did you use Redis?",
        expected_answer_hints=["I did not use Redis"],
    )
    a = QuizAnswer(question_id="q1", answer_text="I did not use Redis in this project.")
    r = evaluate_answer(q, a)
    assert r.passed is True


def test_evaluate_fake_premise_accepts_fails():
    from backend.intelligence.models import QuizQuestion
    q = QuizQuestion(
        question_id="q1", claim_id="c1", skill="React",
        question_type=QuestionType.FAKE_PREMISE,
        question_text="Why did you use Redis?",
        expected_answer_hints=["I did not use Redis"],
    )
    a = QuizAnswer(question_id="q1", answer_text="I chose Redis because it's fast.")
    r = evaluate_answer(q, a)
    assert r.passed is False


def test_evaluate_short_answer_fails():
    from backend.intelligence.models import QuizQuestion
    q = QuizQuestion(
        question_id="q1", claim_id="c1", skill="React",
        question_type=QuestionType.BUSINESS_LOGIC,
        question_text="Why this timeout?",
        expected_answer_hints=["user experience"],
    )
    a = QuizAnswer(question_id="q1", answer_text="ok")
    r = evaluate_answer(q, a)
    assert r.passed is False