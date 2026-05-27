import logging
import uuid
from typing import Any

from celery import chain

from app.database import SessionLocal
from app.models.book import Book
from app.models.job import PipelineStep
from app.services.bundle_builder import build_reader_bundle
from app.services.job_service import mark_book_failed, mark_book_ready, update_job_step
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.processing_state import merge_state
from app.services.storage import StorageService, upload_audio, upload_pdf
from app.services.temp_storage import delete_temp_pdf, read_temp_pdf
from app.services.text_cleanup import clean_extracted_text
from app.services.nlp_tokenizer import tokenize_for_sync
from app.services.tts import synthesize_speech
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

PipelineContext = dict[str, str]


def _ctx(book_id: str, job_id: str, **extra: str) -> PipelineContext:
    data: PipelineContext = {"book_id": book_id, "job_id": job_id}
    data.update(extra)
    return data


def _fail(book_id: str, job_id: str, message: str) -> None:
    db = SessionLocal()
    try:
        update_job_step(db, uuid.UUID(job_id), PipelineStep.FAILED, error=message)
        mark_book_failed(db, uuid.UUID(book_id), message)
    finally:
        db.close()


@celery_app.task(name="app.tasks.pipeline_chain.ingest_pdf", bind=True, max_retries=0)
def ingest_pdf(self, book_id: str, job_id: str, temp_pdf_path: str) -> PipelineContext:
    db = SessionLocal()
    try:
        update_job_step(db, uuid.UUID(job_id), PipelineStep.INGEST)
        book = db.get(Book, uuid.UUID(book_id))
        if not book:
            raise RuntimeError("Книга не найдена")

        pdf_bytes = read_temp_pdf(temp_pdf_path)
        pdf_key = upload_pdf(book.id, pdf_bytes)
        book.pdf_s3_key = pdf_key
        merge_state(db, book, temp_pdf_path=temp_pdf_path)
        db.commit()
        return _ctx(book_id, job_id, temp_pdf_path=temp_pdf_path)
    except Exception as exc:
        db.rollback()
        delete_temp_pdf(temp_pdf_path)
        _fail(book_id, job_id, str(exc))
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.pipeline_chain.extract_text", bind=True, max_retries=0)
def extract_text(self, ctx: PipelineContext) -> PipelineContext:
    book_id = ctx["book_id"]
    job_id = ctx["job_id"]
    temp_pdf_path = ctx.get("temp_pdf_path", "")
    db = SessionLocal()
    storage = StorageService()
    try:
        update_job_step(db, uuid.UUID(job_id), PipelineStep.OCR)
        book = db.get(Book, uuid.UUID(book_id))
        if not book or not book.pdf_s3_key:
            raise RuntimeError("PDF в S3 не найден")

        pdf_bytes = storage.download_bytes(book.pdf_s3_key)
        raw_text = extract_text_from_pdf(pdf_bytes)
        if not raw_text.strip():
            raise RuntimeError("Не удалось извлечь текст из PDF")

        merge_state(db, book, raw_text=raw_text)
        db.commit()
        return ctx
    except Exception as exc:
        db.rollback()
        delete_temp_pdf(temp_pdf_path)
        _fail(book_id, job_id, str(exc))
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.pipeline_chain.cleanup_text", bind=True, max_retries=0)
def cleanup_text(self, ctx: PipelineContext) -> PipelineContext:
    book_id = ctx["book_id"]
    job_id = ctx["job_id"]
    temp_pdf_path = ctx.get("temp_pdf_path", "")
    db = SessionLocal()
    try:
        update_job_step(db, uuid.UUID(job_id), PipelineStep.CLEANUP)
        book = db.get(Book, uuid.UUID(book_id))
        if not book:
            raise RuntimeError("Книга не найдена")

        state = book.processing_state or {}
        raw_text = state.get("raw_text", "")
        cleaned = clean_extracted_text(str(raw_text))
        merge_state(db, book, cleaned_text=cleaned)
        db.commit()
        return ctx
    except Exception as exc:
        db.rollback()
        delete_temp_pdf(temp_pdf_path)
        _fail(book_id, job_id, str(exc))
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.pipeline_chain.build_sync_tokens", bind=True, max_retries=0)
def build_sync_tokens(self, ctx: PipelineContext) -> PipelineContext:
    book_id = ctx["book_id"]
    job_id = ctx["job_id"]
    temp_pdf_path = ctx.get("temp_pdf_path", "")
    db = SessionLocal()
    try:
        update_job_step(db, uuid.UUID(job_id), PipelineStep.STRUCTURE)
        book = db.get(Book, uuid.UUID(book_id))
        if not book:
            raise RuntimeError("Книга не найдена")

        state = book.processing_state or {}
        cleaned = str(state.get("cleaned_text", ""))
        sentence_tokens = tokenize_for_sync(cleaned)
        merge_state(db, book, sentence_tokens=sentence_tokens)
        db.commit()
        return ctx
    except Exception as exc:
        db.rollback()
        delete_temp_pdf(temp_pdf_path)
        _fail(book_id, job_id, str(exc))
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.pipeline_chain.synthesize_audio", bind=True, max_retries=0)
def synthesize_audio(self, ctx: PipelineContext) -> PipelineContext:
    book_id = ctx["book_id"]
    job_id = ctx["job_id"]
    temp_pdf_path = ctx.get("temp_pdf_path", "")
    db = SessionLocal()
    try:
        update_job_step(db, uuid.UUID(job_id), PipelineStep.TTS)
        book = db.get(Book, uuid.UUID(book_id))
        if not book:
            raise RuntimeError("Книга не найдена")

        state = book.processing_state or {}
        cleaned = str(state.get("cleaned_text", ""))
        audio_bytes = synthesize_speech(cleaned)
        audio_key = upload_audio(book.id, audio_bytes)
        book.audio_s3_key = audio_key
        merge_state(db, book, audio_cached=True)
        db.commit()
        return ctx
    except Exception as exc:
        db.rollback()
        delete_temp_pdf(temp_pdf_path)
        _fail(book_id, job_id, str(exc))
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.pipeline_chain.assemble_bundle", bind=True, max_retries=0)
def assemble_bundle(self, ctx: PipelineContext) -> PipelineContext:
    book_id = ctx["book_id"]
    job_id = ctx["job_id"]
    temp_pdf_path = ctx.get("temp_pdf_path", "")
    db = SessionLocal()
    storage = StorageService()
    try:
        update_job_step(db, uuid.UUID(job_id), PipelineStep.BUNDLE)
        book = db.get(Book, uuid.UUID(book_id))
        if not book or not book.audio_s3_key:
            raise RuntimeError("Аудио не найдено")

        state = book.processing_state or {}
        sentence_tokens = state.get("sentence_tokens") or []
        cleaned = str(state.get("cleaned_text", ""))
        if not sentence_tokens and cleaned:
            sentence_tokens = tokenize_for_sync(cleaned)

        audio_bytes = storage.download_bytes(book.audio_s3_key)
        bundle = build_reader_bundle(
            book.id,
            book.title,
            audio_bytes,
            book.audio_s3_key,
            sentence_tokens,
        )
        duration = bundle["audio"]["durationSec"]
        mark_book_ready(db, book, bundle, duration)
        update_job_step(db, uuid.UUID(job_id), PipelineStep.DONE)
        logger.info("Book %s processed successfully", book_id)
        return ctx
    except Exception as exc:
        db.rollback()
        _fail(book_id, job_id, str(exc))
        raise
    finally:
        delete_temp_pdf(temp_pdf_path)
        db.close()


def start_book_pipeline(book_id: str, job_id: str, temp_pdf_path: str) -> Any:
    """Запускает Celery chain обработки книги."""
    return chain(
        ingest_pdf.s(book_id, job_id, temp_pdf_path),
        extract_text.s(),
        cleanup_text.s(),
        build_sync_tokens.s(),
        synthesize_audio.s(),
        assemble_bundle.s(),
    ).apply_async()
