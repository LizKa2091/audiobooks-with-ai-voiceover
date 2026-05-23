import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import demo_user_uuid
from app.database import get_db
from app.models.book import Book, BookStatus
from app.models.job import PipelineStep, ProcessingJob, STEP_PERCENT
from app.schemas.book import BookSummary, BookUploadResponse, ProgressUpdate
from app.schemas.job import JobStatusResponse
from app.schemas.reader import ReaderBundle
from app.services.temp_storage import save_temp_pdf
from app.tasks.pipeline_chain import start_book_pipeline

router = APIRouter(prefix="/books", tags=["books"])

MAX_PDF_BYTES = 25 * 1024 * 1024


def _book_to_summary(book: Book) -> BookSummary:
    return BookSummary(
        id=str(book.id),
        title=book.title,
        author=book.author,
        genre=book.genre,
        progress_percent=book.progress_percent,
        updated_at=book.updated_at or datetime.now(timezone.utc),
    )


def _get_user_book(db: Session, book_id: uuid.UUID) -> Book:
    book = db.get(Book, book_id)
    if not book or book.user_id != demo_user_uuid():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Книга не найдена")
    return book


@router.get("", response_model=list[BookSummary])
def list_books(db: Session = Depends(get_db)) -> list[BookSummary]:
    stmt = (
        select(Book)
        .where(Book.user_id == demo_user_uuid())
        .order_by(Book.updated_at.desc())
    )
    books = db.scalars(stmt).all()
    return [_book_to_summary(b) for b in books]


@router.post("/upload", response_model=BookUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_book(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    author: str | None = Form(default=None),
    genre: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> BookUploadResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Ожидается PDF-файл")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Пустой файл")
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 25 МБ)")

    derived_title = (title or file.filename.replace(".pdf", "").replace(".PDF", "")).strip()
    if not derived_title:
        derived_title = "Новая книга"

    book = Book(
        user_id=demo_user_uuid(),
        title=derived_title[:512],
        author=(author or "Неизвестный автор")[:256],
        genre=(genre or "Загружено")[:128],
        status=BookStatus.PROCESSING.value,
    )
    db.add(book)
    db.flush()

    temp_pdf_path = save_temp_pdf(book.id, pdf_bytes)

    job = ProcessingJob(book_id=book.id, step=PipelineStep.INGEST.value, percent=STEP_PERCENT["ingest"])
    db.add(job)
    db.commit()
    db.refresh(book)
    db.refresh(job)

    start_book_pipeline(str(book.id), str(job.id), temp_pdf_path)

    return BookUploadResponse(
        book_id=str(book.id),
        job_id=str(job.id),
        title=book.title,
        status=book.status,
    )


@router.get("/{book_id}/status", response_model=JobStatusResponse)
def book_status(book_id: str, db: Session = Depends(get_db)) -> JobStatusResponse:
    book = _get_user_book(db, uuid.UUID(book_id))
    job = db.scalar(
        select(ProcessingJob)
        .where(ProcessingJob.book_id == book.id)
        .order_by(ProcessingJob.created_at.desc())
        .limit(1)
    )
    if not job:
        raise HTTPException(status_code=404, detail="Задача обработки не найдена")

    book_status_value = book.status
    if book.status == BookStatus.READY.value:
        job_step = PipelineStep.DONE.value
        job_percent = 100
    elif book.status == BookStatus.FAILED.value:
        job_step = PipelineStep.FAILED.value
        job_percent = job.percent
    else:
        job_step = job.step
        job_percent = job.percent

    return JobStatusResponse(
        job_id=str(job.id),
        book_id=str(book.id),
        step=job_step,
        percent=job_percent,
        status=book_status_value,
        error=job.error or book.error_message,
    )


@router.get("/{book_id}/reader")
def get_reader(book_id: str, db: Session = Depends(get_db)):
    book = _get_user_book(db, uuid.UUID(book_id))

    if book.status == BookStatus.PROCESSING.value:
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "status": "processing",
                "bookId": str(book.id),
                "message": "Книга ещё обрабатывается. Повторите запрос позже.",
            },
        )

    if book.status == BookStatus.FAILED.value:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "status": "failed",
                "bookId": str(book.id),
                "message": book.error_message or "Обработка завершилась с ошибкой",
            },
        )

    if not book.reader_bundle:
        raise HTTPException(status_code=404, detail="Контент читалки недоступен")

    return ReaderBundle.model_validate(book.reader_bundle)


@router.patch("/{book_id}/progress", response_model=BookSummary)
def update_progress(
    book_id: str,
    payload: ProgressUpdate,
    db: Session = Depends(get_db),
) -> BookSummary:
    book = _get_user_book(db, uuid.UUID(book_id))

    if payload.progress_percent is not None:
        book.progress_percent = max(0, min(100, payload.progress_percent))
    elif payload.progress_sec is not None and book.audio_duration_sec and book.audio_duration_sec > 0:
        pct = int((payload.progress_sec / book.audio_duration_sec) * 100)
        book.progress_percent = max(0, min(100, pct))
    else:
        raise HTTPException(
            status_code=400,
            detail="Укажите progressPercent или progressSec",
        )

    if payload.progress_sec is not None:
        book.progress_sec = max(0.0, payload.progress_sec)

    db.commit()
    db.refresh(book)
    return _book_to_summary(book)
