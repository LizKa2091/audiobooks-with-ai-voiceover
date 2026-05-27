from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.base import CamelModel


class BookSummary(CamelModel):
    id: str
    title: str
    author: str
    genre: str
    progress_percent: int
    updated_at: datetime


class BookUploadResponse(CamelModel):
    book_id: str
    job_id: str
    title: str
    status: str


class ProgressUpdate(CamelModel):
    progress_percent: int | None = Field(default=None, alias="progressPercent")
    progress_sec: float | None = Field(default=None, alias="progressSec")
    book_id: str | None = Field(default=None, alias="bookId")
