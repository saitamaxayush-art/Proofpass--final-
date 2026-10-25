"""
Micro-quiz generation and evaluation.
"""
from __future__ import annotations
import logging
from typing import List, Optional
from .models import Claim, Evidence, QuizQuestion, QuizAnswer, QuizResult, QuestionType

logger = logging.getLogger(__name__)
MAX_QUIZ_ATTEMPTS = 3

def generate_micro_quiz(claim: Claim, evidence: List[Evidence], code_snippets: Optional[dict] = None, commit_messages: Optional[List[str]] = None) -> List[QuizQuestion]:
    questions: List[QuizQuestion] = []
    # Fake premise trap
    questions.append(QuizQuestion(claim_id=claim.claim_id, skill=claim.skill, question_type=QuestionType.FAKE_PREMISE, question_text=f"In your {claim.skill} work, you mentioned using a caching layer with Redis. Can you explain why you chose Redis over Memcached?", expected_answer_hints=["I did not use Redis", "no Redis", "not applicable", "didn't use"]))
    # Git history
    if commit_messages:
        questions.append(QuizQuestion(claim_id=claim.claim_id, skill=claim.skill, question_type=QuestionType.GIT_HISTORY, question_text=f"One of your recent commits was: '{commit_messages[0][:80]}'. What problem were you solving?"))
    return questions[:3]

def evaluate_answer(question: QuizQuestion, answer: QuizAnswer, attempt_number: int = 1) -> QuizResult:
    if attempt_number >= MAX_QUIZ_ATTEMPTS:
        return QuizResult(question_id=question.question_id, passed=False, reasoning=f"Max attempts ({MAX_QUIZ_ATTEMPTS}) reached.")
    return _evaluate_fallback_rubric(question, answer)

def _evaluate_fallback_rubric(question: QuizQuestion, answer: QuizAnswer) -> QuizResult:
    text = answer.answer_text.lower()
    if question.question_type == QuestionType.FAKE_PREMISE:
        pushback = ["did not", "didn't", "don't use", "not applicable", "false", "never used", "no redis"]
        if any(kw in text for kw in pushback):
            return QuizResult(question_id=question.question_id, passed=True, reasoning="Correctly rejected false premise.")
        return QuizResult(question_id=question.question_id, passed=False, reasoning="Accepted false premise.")
    if question.expected_answer_hints:
        matched = sum(1 for h in question.expected_answer_hints if h.lower() in text)
        if matched >= 1:
            return QuizResult(question_id=question.question_id, passed=True, reasoning=f"Matched {matched} technical hint(s).")
    if len(answer.answer_text.strip()) > 40:
        return QuizResult(question_id=question.question_id, passed=True, reasoning="Substantive answer provided.")
    return QuizResult(question_id=question.question_id, passed=False, reasoning="Answer lacked specificity.")