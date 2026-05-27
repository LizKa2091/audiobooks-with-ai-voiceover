import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import demo_user_uuid
from app.database import get_db
from app.models.book import Book
from app.models.job import PipelineStep, ProcessingJob
from app.schemas.job import JobStatusResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str, db: Session = Depends(get_db)) -> JobStatusResponse:
    job = db.get(ProcessingJob, uuid.UUID(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    book = db.get(Book, job.book_id)
    if not book or book.user_id != demo_user_uuid():
        raise HTTPException(status_code=404, detail="Задача не найдена")

    if book.status == "ready":
        step = PipelineStep.DONE.value
        percent = 100
    elif book.status == "failed":
        step = PipelineStep.FAILED.value
        percent = job.percent
    else:
        step = job.step
        percent = job.percent

    return JobStatusResponse(
        job_id=str(job.id),
        book_id=str(book.id),
        step=step,
        percent=percent,
        status=book.status,
        error=job.error or book.error_message,
    )
