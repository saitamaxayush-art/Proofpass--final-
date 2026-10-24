import sys
from pathlib import Path

# Add backend/ to path so `from intelligence...` works
BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

import intelligence  # type: ignore
import intelligence.models  # type: ignore
sys.modules["Intelligence"] = intelligence
sys.modules["Intelligence.models"] = intelligence.models
sys.modules["backend.Intelligence"] = intelligence
sys.modules["backend.Intelligence.models"] = intelligence.models
sys.modules["backend.intelligence"] = intelligence
sys.modules["backend.intelligence.models"] = intelligence.models

import pytest
from intelligence.fixtures import (
    MOCK_CLAIMS, MOCK_VERIFICATION_STRONG, MOCK_VERIFICATION_CONFLICT,
    MOCK_VERIFICATION_WEAK, MOCK_TARGET_ROLE, MOCK_CODE_SNIPPETS, MOCK_COMMIT_MESSAGES,
)


@pytest.fixture
def claims():
    return MOCK_CLAIMS


@pytest.fixture
def verification_strong():
    return MOCK_VERIFICATION_STRONG


@pytest.fixture
def verification_conflict():
    return MOCK_VERIFICATION_CONFLICT


@pytest.fixture
def verification_weak():
    return MOCK_VERIFICATION_WEAK


@pytest.fixture
def target_role():
    return MOCK_TARGET_ROLE


@pytest.fixture
def code_snippets():
    return MOCK_CODE_SNIPPETS


@pytest.fixture
def commit_messages():
    return MOCK_COMMIT_MESSAGES