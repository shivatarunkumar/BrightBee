from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class CreateChildRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    avatar: str = Field(..., min_length=1, max_length=80)
    date_of_birth: Optional[date] = None
    current_class: str = Field(..., description="Nursery | LKG | UKG | Class1–Class5")

    model_config = {"json_schema_extra": {"example": {
        "name": "Aarav",
        "avatar": "🐻",
        "date_of_birth": "2019-04-10",
        "current_class": "Class1"
    }}}


class ChildResponse(BaseModel):
    id: str
    name: str
    avatar: str
    date_of_birth: Optional[date]
    current_class: str
    streak_count: int


# ---------------------------------------------------------------------------
# History & stats
# ---------------------------------------------------------------------------
class TestHistoryItem(BaseModel):
    test_id: str
    subject: str
    difficulty: str
    score: int
    total: int
    percentage: float
    completed_at: datetime


class SubjectStat(BaseModel):
    subject: str
    tests: int
    avg_percentage: float
    best_percentage: float


class ChildStatsResponse(BaseModel):
    total_tests: int
    avg_percentage: float
    best_subject: Optional[str]
    streak_count: int
    subject_stats: list[SubjectStat]
