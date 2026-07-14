from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Generate
# ---------------------------------------------------------------------------
class GenerateTestRequest(BaseModel):
    child_id: str
    subject: str
    difficulty: str = Field(..., pattern="^(Easy|Medium|Hard)$")
    question_count: int = Field(..., ge=1, le=10)


class QuestionForClient(BaseModel):
    """Sent to the mobile app — correct_answer is intentionally excluded."""
    id: str
    order: int
    type: str
    question_text: str
    options: list[str]          # MCQ choices
    explanation: str            # shown after submit


class GenerateTestResponse(BaseModel):
    test_id: str
    subject: str
    difficulty: str
    question_count: int
    questions: list[QuestionForClient]


# ---------------------------------------------------------------------------
# Submit
# ---------------------------------------------------------------------------
class AnswerInput(BaseModel):
    question_id: str
    answer: str                 # the option text the child selected
    time_taken_seconds: Optional[int] = None


class SubmitTestRequest(BaseModel):
    answers: list[AnswerInput]


class QuestionResult(BaseModel):
    question_id: str
    order: int
    question_text: str
    options: list[str]
    child_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str
    help_note: Optional[str]    # only for wrong answers


class SubmitTestResponse(BaseModel):
    test_id: str
    score: int
    total: int
    percentage: float
    results: list[QuestionResult]
