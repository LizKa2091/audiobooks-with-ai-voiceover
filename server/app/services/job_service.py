import uuid

from sqlalchemy.orm import Session

from app.models.book import Book, BookStatus
from app.models.job import STEP_PERCENT, PipelineStep, ProcessingJob


def update_job_step(db: Session, job_id: uuid.UUID, step: PipelineStep, error: str | None = None) -> None:
    job = db.get(ProcessingJob, job_id)
    if not job:
        return
    job.step = step.value
    job.percent = STEP_PERCENT.get(step.value, job.percent)
    if error:
        job.error = error
    db.commit()


def mark_book_failed(db: Session, book_id: uuid.UUID, message: str) -> None:
    book = db.get(Book, book_id)
    if book:
        book.status = BookStatus.FAILED.value
        book.error_message = message
    db.commit()


def mark_book_ready(db: Session, book: Book, reader_bundle: dict, audio_duration_sec: float) -> None:
    book.status = BookStatus.READY.value
    book.reader_bundle = reader_bundle
    book.audio_duration_sec = audio_duration_sec
    book.error_message = None
    db.commit()
