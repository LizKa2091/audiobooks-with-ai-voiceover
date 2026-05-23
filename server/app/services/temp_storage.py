import logging
import os
from pathlib import Path
from uuid import UUID

from app.config import get_settings

logger = logging.getLogger(__name__)


def save_temp_pdf(book_id: UUID, pdf_bytes: bytes) -> str:
    """Сохраняет PDF локально до асинхронной загрузки в S3."""
    settings = get_settings()
    dir_path = Path(settings.upload_temp_dir)
    dir_path.mkdir(parents=True, exist_ok=True)
    path = dir_path / f"{book_id}.pdf"
    path.write_bytes(pdf_bytes)
    return str(path)


def read_temp_pdf(path: str) -> bytes:
    return Path(path).read_bytes()


def delete_temp_pdf(path: str) -> None:
    try:
        os.remove(path)
    except OSError as exc:
        logger.warning("Could not delete temp PDF %s: %s", path, exc)
