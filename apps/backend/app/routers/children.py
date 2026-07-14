"""
Child profile routes
  GET  /api/v1/children                       — list parent's children
  POST /api/v1/children                       — add a child profile
  GET  /api/v1/children/{child_id}/history    — completed test history
  GET  /api/v1/children/{child_id}/stats      — overall stats summary
"""
import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import ChildProfile, SubjectGrade, Test, User
from app.schemas.child import (
    ChildResponse,
    ChildStatsResponse,
    CreateChildRequest,
    SubjectStat,
    TestHistoryItem,
)

router = APIRouter(prefix="/children", tags=["children"])

VALID_CLASSES = {"Nursery", "LKG", "UKG", "Class1", "Class2", "Class3", "Class4", "Class5"}
DEFAULT_SUBJECTS = ["Math", "English", "Science", "EVS", "GK"]


async def _get_child_for_user(child_id: str, user: User, db: AsyncSession) -> ChildProfile:
    result = await db.execute(
        select(ChildProfile).where(
            ChildProfile.id == uuid.UUID(child_id),
            ChildProfile.user_id == user.id,
        )
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    return child


@router.get("", response_model=list[ChildResponse])
async def list_children(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChildProfile).where(ChildProfile.user_id == current_user.id)
    )
    children = result.scalars().all()
    return [
        ChildResponse(
            id=str(c.id),
            name=c.name,
            avatar=c.avatar,
            date_of_birth=c.date_of_birth,
            current_class=c.current_class,
            streak_count=c.streak_count,
        )
        for c in children
    ]


@router.post("", response_model=ChildResponse, status_code=status.HTTP_201_CREATED)
async def create_child(
    body: CreateChildRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.current_class not in VALID_CLASSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"current_class must be one of: {', '.join(sorted(VALID_CLASSES))}",
        )

    child = ChildProfile(
        user_id=current_user.id,
        name=body.name,
        avatar=body.avatar,
        date_of_birth=body.date_of_birth,
        current_class=body.current_class,
    )
    db.add(child)
    await db.flush()

    for subject in DEFAULT_SUBJECTS:
        db.add(SubjectGrade(child_id=child.id, subject=subject, current_level="Easy"))

    await db.commit()
    await db.refresh(child)

    return ChildResponse(
        id=str(child.id),
        name=child.name,
        avatar=child.avatar,
        date_of_birth=child.date_of_birth,
        current_class=child.current_class,
        streak_count=child.streak_count,
    )


@router.get("/{child_id}/history", response_model=list[TestHistoryItem])
async def get_child_history(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return completed tests for a child, newest first."""
    child = await _get_child_for_user(child_id, current_user, db)

    result = await db.execute(
        select(Test)
        .where(Test.child_id == child.id, Test.status == "completed")
        .order_by(Test.completed_at.desc())
    )
    tests = result.scalars().all()

    return [
        TestHistoryItem(
            test_id=str(t.id),
            subject=t.subject,
            difficulty=t.difficulty,
            score=t.score or 0,
            total=t.total_questions,
            percentage=round((t.score or 0) / t.total_questions * 100, 1) if t.total_questions else 0,
            completed_at=t.completed_at,
        )
        for t in tests
    ]


@router.get("/{child_id}/stats", response_model=ChildStatsResponse)
async def get_child_stats(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregate stats for a child."""
    child = await _get_child_for_user(child_id, current_user, db)

    result = await db.execute(
        select(Test)
        .where(Test.child_id == child.id, Test.status == "completed")
    )
    tests = result.scalars().all()

    if not tests:
        return ChildStatsResponse(
            total_tests=0,
            avg_percentage=0.0,
            best_subject=None,
            streak_count=child.streak_count,
            subject_stats=[],
        )

    # Aggregate per subject
    subject_data: dict[str, list[float]] = defaultdict(list)
    for t in tests:
        pct = round((t.score or 0) / t.total_questions * 100, 1) if t.total_questions else 0.0
        subject_data[t.subject].append(pct)

    subject_stats = [
        SubjectStat(
            subject=subj,
            tests=len(pcts),
            avg_percentage=round(sum(pcts) / len(pcts), 1),
            best_percentage=round(max(pcts), 1),
        )
        for subj, pcts in subject_data.items()
    ]
    subject_stats.sort(key=lambda s: s.avg_percentage, reverse=True)

    all_pcts = [s for pcts in subject_data.values() for s in pcts]
    avg_pct = round(sum(all_pcts) / len(all_pcts), 1)
    best_subject = subject_stats[0].subject if subject_stats else None

    return ChildStatsResponse(
        total_tests=len(tests),
        avg_percentage=avg_pct,
        best_subject=best_subject,
        streak_count=child.streak_count,
        subject_stats=subject_stats,
    )
