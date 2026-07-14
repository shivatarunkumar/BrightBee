"""
SQLAlchemy ORM models — mirror the tables created by database/init.sql.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean, CheckConstraint, Date, DateTime, ForeignKey,
    Integer, Numeric, String, Text, ARRAY, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


def new_uuid() -> uuid.UUID:
    return uuid.uuid4()


# ---------------------------------------------------------------------------
# users
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    username: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    children: Mapped[list["ChildProfile"]] = relationship("ChildProfile", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# child_profiles
# ---------------------------------------------------------------------------
class ChildProfile(Base):
    __tablename__ = "child_profiles"
    __table_args__ = (
        CheckConstraint(
            "current_class IN ('Nursery','LKG','UKG','Class1','Class2','Class3','Class4','Class5')",
            name="ck_child_class",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    avatar: Mapped[str] = mapped_column(String(80), nullable=False, default="🐝")
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    current_class: Mapped[str] = mapped_column(String(20), nullable=False)
    pin_hash: Mapped[str | None] = mapped_column(Text)
    streak_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship("User", back_populates="children")
    subject_grades: Mapped[list["SubjectGrade"]] = relationship("SubjectGrade", back_populates="child", cascade="all, delete-orphan")
    tests: Mapped[list["Test"]] = relationship("Test", back_populates="child", cascade="all, delete-orphan")
    report_snapshots: Mapped[list["ReportSnapshot"]] = relationship("ReportSnapshot", back_populates="child", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# subject_grades
# ---------------------------------------------------------------------------
class SubjectGrade(Base):
    __tablename__ = "subject_grades"
    __table_args__ = (
        UniqueConstraint("child_id", "subject", name="uq_subject_grade"),
        CheckConstraint("current_level IN ('Easy','Medium','Hard')", name="ck_level"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE"), nullable=False)
    subject: Mapped[str] = mapped_column(String(50), nullable=False)
    current_level: Mapped[str] = mapped_column(String(10), nullable=False, default="Easy")
    tests_at_current_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_score_at_current_level: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    child: Mapped["ChildProfile"] = relationship("ChildProfile", back_populates="subject_grades")


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------
class Test(Base):
    __tablename__ = "tests"
    __table_args__ = (
        CheckConstraint("difficulty IN ('Easy','Medium','Hard')", name="ck_test_difficulty"),
        CheckConstraint("status IN ('in_progress','completed','abandoned')", name="ck_test_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE"), nullable=False)
    subject: Mapped[str] = mapped_column(String(50), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(10), nullable=False)
    question_types: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(15), nullable=False, default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    child: Mapped["ChildProfile"] = relationship("ChildProfile", back_populates="tests")
    questions: Mapped[list["TestQuestion"]] = relationship("TestQuestion", back_populates="test", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# test_questions
# ---------------------------------------------------------------------------
class TestQuestion(Base):
    __tablename__ = "test_questions"
    __table_args__ = (
        UniqueConstraint("test_id", "question_order", name="uq_question_order"),
        CheckConstraint("type IN ('mcq','fill_blank','match_following')", name="ck_question_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    test_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tests.id", ondelete="CASCADE"), nullable=False)
    question_order: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[dict | None] = mapped_column(JSONB)
    pairs: Mapped[dict | None] = mapped_column(JSONB)
    correct_answer: Mapped[str | None] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    child_answer: Mapped[dict | None] = mapped_column(JSONB)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    help_note: Mapped[str | None] = mapped_column(Text)
    time_taken_seconds: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    test: Mapped["Test"] = relationship("Test", back_populates="questions")


# ---------------------------------------------------------------------------
# report_snapshots
# ---------------------------------------------------------------------------
class ReportSnapshot(Base):
    __tablename__ = "report_snapshots"
    __table_args__ = (
        UniqueConstraint("child_id", "period_type", "period_start", name="uq_report"),
        CheckConstraint("period_type IN ('weekly','monthly')", name="ck_period_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    child_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("child_profiles.id", ondelete="CASCADE"), nullable=False)
    period_type: Mapped[str] = mapped_column(String(10), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    total_tests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    subjects_summary: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    grade_changes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    child: Mapped["ChildProfile"] = relationship("ChildProfile", back_populates="report_snapshots")


# ---------------------------------------------------------------------------
# refresh_tokens
# ---------------------------------------------------------------------------
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    user_agent: Mapped[str | None] = mapped_column(Text)
    ip_address: Mapped[str | None] = mapped_column(INET)

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")
