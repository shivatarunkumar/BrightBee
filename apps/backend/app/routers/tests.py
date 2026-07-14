"""
Test routes
  POST /api/v1/tests/generate          — generate a new test via LLM
  POST /api/v1/tests/{test_id}/submit  — submit answers, get results
  GET  /api/v1/tests/{test_id}/results — fetch results of a completed test
"""
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models import ChildProfile, Test, TestQuestion, User
from app.schemas.test import (
    AnswerInput,
    GenerateTestRequest,
    GenerateTestResponse,
    QuestionForClient,
    QuestionResult,
    SubmitTestRequest,
    SubmitTestResponse,
)
from app.services.llm import generate_help_note, generate_mcq_questions

router = APIRouter(prefix="/tests", tags=["tests"])


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


# ---------------------------------------------------------------------------
# Generate test
# ---------------------------------------------------------------------------
@router.post("/generate", response_model=GenerateTestResponse, status_code=status.HTTP_201_CREATED)
async def generate_test(
    body: GenerateTestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    child = await _get_child_for_user(body.child_id, current_user, db)

    try:
        mcq_list = generate_mcq_questions(
            subject=body.subject,
            current_class=child.current_class,
            difficulty=body.difficulty,
            count=body.question_count,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Question generation failed: {str(e)}",
        )

    test = Test(
        child_id=child.id,
        subject=body.subject,
        difficulty=body.difficulty,
        question_types=["mcq"],
        question_count=body.question_count,
        total_questions=len(mcq_list),
        status="in_progress",
    )
    db.add(test)
    await db.flush()

    db_questions = []
    for i, q in enumerate(mcq_list, start=1):
        tq = TestQuestion(
            test_id=test.id,
            question_order=i,
            type="mcq",
            question_text=q.question_text,
            options=q.options,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
        )
        db.add(tq)
        db_questions.append(tq)

    await db.commit()
    await db.refresh(test)
    for tq in db_questions:
        await db.refresh(tq)

    return GenerateTestResponse(
        test_id=str(test.id),
        subject=test.subject,
        difficulty=test.difficulty,
        question_count=test.question_count,
        questions=[
            QuestionForClient(
                id=str(tq.id),
                order=tq.question_order,
                type=tq.type,
                question_text=tq.question_text,
                options=tq.options,
                explanation=tq.explanation,
            )
            for tq in sorted(db_questions, key=lambda x: x.question_order)
        ],
    )


# ---------------------------------------------------------------------------
# Submit test
# ---------------------------------------------------------------------------
@router.post("/{test_id}/submit", response_model=SubmitTestResponse)
async def submit_test(
    test_id: str,
    body: SubmitTestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Test).where(Test.id == uuid.UUID(test_id)))
    test = result.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    await _get_child_for_user(str(test.child_id), current_user, db)

    if test.status != "in_progress":
        raise HTTPException(status_code=400, detail="Test already submitted")

    q_result = await db.execute(
        select(TestQuestion)
        .where(TestQuestion.test_id == test.id)
        .order_by(TestQuestion.question_order)
    )
    questions = q_result.scalars().all()

    answer_map: dict[str, AnswerInput] = {a.question_id: a for a in body.answers}

    score = 0
    results: list[QuestionResult] = []

    for tq in questions:
        ans = answer_map.get(str(tq.id))
        child_answer = ans.answer if ans else ""
        is_correct = child_answer == tq.correct_answer

        if is_correct:
            score += 1

        tq.child_answer = child_answer
        tq.is_correct = is_correct
        if ans and ans.time_taken_seconds is not None:
            tq.time_taken_seconds = ans.time_taken_seconds

        help_note: str | None = None
        if not is_correct and child_answer:
            try:
                child_res = await db.execute(select(ChildProfile).where(ChildProfile.id == test.child_id))
                child = child_res.scalar_one()
                help_note = generate_help_note(
                    subject=test.subject,
                    current_class=child.current_class,
                    question_text=tq.question_text,
                    correct_answer=tq.correct_answer,
                    child_answer=child_answer,
                )
                tq.help_note = help_note
            except Exception:
                pass

        results.append(QuestionResult(
            question_id=str(tq.id),
            order=tq.question_order,
            question_text=tq.question_text,
            options=tq.options,
            child_answer=child_answer,
            correct_answer=tq.correct_answer,
            is_correct=is_correct,
            explanation=tq.explanation,
            help_note=help_note,
        ))

    test.score = score
    test.status = "completed"
    test.completed_at = datetime.now(UTC)
    await db.commit()

    return SubmitTestResponse(
        test_id=test_id,
        score=score,
        total=len(questions),
        percentage=round(score / len(questions) * 100, 1) if questions else 0,
        results=sorted(results, key=lambda r: r.order),
    )


# ---------------------------------------------------------------------------
# Fetch results of a completed test
# ---------------------------------------------------------------------------
@router.get("/{test_id}/results", response_model=SubmitTestResponse)
async def get_test_results(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Test).where(Test.id == uuid.UUID(test_id)))
    test = result.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    await _get_child_for_user(str(test.child_id), current_user, db)

    if test.status != "completed":
        raise HTTPException(status_code=400, detail="Test not yet completed")

    q_result = await db.execute(
        select(TestQuestion)
        .where(TestQuestion.test_id == test.id)
        .order_by(TestQuestion.question_order)
    )
    questions = q_result.scalars().all()

    results = [
        QuestionResult(
            question_id=str(tq.id),
            order=tq.question_order,
            question_text=tq.question_text,
            options=tq.options or [],
            child_answer=tq.child_answer or "",
            correct_answer=tq.correct_answer or "",
            is_correct=tq.is_correct or False,
            explanation=tq.explanation,
            help_note=tq.help_note,
        )
        for tq in questions
    ]

    return SubmitTestResponse(
        test_id=test_id,
        score=test.score or 0,
        total=test.total_questions,
        percentage=round((test.score or 0) / test.total_questions * 100, 1) if test.total_questions else 0,
        results=results,
    )
