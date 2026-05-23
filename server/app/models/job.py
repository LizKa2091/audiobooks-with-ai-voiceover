import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PipelineStep(str, enum.Enum):
    INGEST = "ingest"
    OCR = "ocr"
    STRUCTURE = "structure"
    CLEANUP = "cleanup"
    TTS = "tts"
    BUNDLE = "bundle"
    DONE = "done"
    FAILED = "failed"


STEP_PERCENT: dict[str, int] = {
    PipelineStep.INGEST.value: 10,
    PipelineStep.OCR.value: 30,
    PipelineStep.STRUCTURE.value: 45,
    PipelineStep.CLEANUP.value: 55,
    PipelineStep.TTS.value: 80,
    PipelineStep.BUNDLE.value: 95,
    PipelineStep.DONE.value: 100,
    PipelineStep.FAILED.value: 0,
}


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    step: Mapped[str] = mapped_column(String(32), default=PipelineStep.INGEST.value)
    percent: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
