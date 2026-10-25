import sys
from pathlib import Path

# Put repo root on sys.path so `from backend...` works
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import pytest
from backend.intelligence.fixtures import (
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