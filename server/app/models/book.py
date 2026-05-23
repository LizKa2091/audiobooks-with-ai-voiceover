import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BookStatus(str, enum.Enum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class Book(Base):
    __tablename__ = "books"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    author: Mapped[str] = mapped_column(String(256), default="Неизвестный автор")
    genre: Mapped[str] = mapped_column(String(128), default="Без жанра")
    status: Mapped[str] = mapped_column(String(32), default=BookStatus.PROCESSING.value, index=True)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    progress_sec: Mapped[float] = mapped_column(Float, default=0.0)
    audio_duration_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    pdf_s3_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    audio_s3_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    reader_bundle: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    processing_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
