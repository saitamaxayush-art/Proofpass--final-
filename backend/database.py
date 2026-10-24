"""
ProofPass M2: Database and Persistence Layer.
SQLite persistence using SQLAlchemy.
"""
from __future__ import annotations

import os
from datetime import datetime
from typing import Generator

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./proofpass.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class PassportRecord(Base):
    """
    SQLAlchemy model storing candidate passports, verification states, and integrity hashes.
    """
    __tablename__ = "passports"

    passport_id = Column(String(64), primary_key=True, index=True)
    target_role = Column(String(255), nullable=False)
    role_match_score = Column(Float, nullable=False, default=0.0)
    candidate_consent = Column(Boolean, nullable=False, default=True)
    status = Column(String(32), nullable=False, default="issued")
    sha256_hash = Column(String(64), nullable=False)
    payload_json = Column(Text, nullable=False)
    target_role_json = Column(Text, nullable=True)
    claims_json = Column(Text, nullable=False)
    verification_json = Column(Text, nullable=False)
    quiz_questions_json = Column(Text, nullable=False)
    quiz_history_json = Column(Text, nullable=False, default="{}")
    is_demo = Column(Boolean, nullable=False, default=False)
    github_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(target_engine=None) -> None:
    """Creates database tables if they do not exist."""
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)
    try:
        from sqlalchemy import text
        with eng.connect() as conn:
            conn.execute(text("ALTER TABLE passports ADD COLUMN github_id INTEGER"))
            conn.commit()
    except Exception:
        pass
