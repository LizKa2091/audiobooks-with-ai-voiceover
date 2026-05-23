import logging
from io import BytesIO

from pypdf import PdfReader

from app.config import get_settings

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Извлекает текст из PDF; при пустом слое — fallback на Tesseract OCR."""
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        parts: list[str] = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text.strip():
                parts.append(text)
        text = "\n".join(parts).strip()
        if text:
            return text
    except Exception as exc:
        logger.warning("pypdf extraction failed, trying OCR: %s", exc)

    return ocr_pdf_with_tesseract(pdf_bytes)


def ocr_pdf_with_tesseract(pdf_bytes: bytes) -> str:
    """OCR сканов через Tesseract (требует poppler + tesseract в системе)."""
    settings = get_settings()
    try:
        from pdf2image import convert_from_bytes
        import pytesseract
    except ImportError as exc:
        raise RuntimeError(
            "OCR недоступен: установите pytesseract, pdf2image и системные tesseract/poppler"
        ) from exc

    try:
        images = convert_from_bytes(
            pdf_bytes,
            first_page=1,
            last_page=settings.ocr_max_pages,
        )
        if not images:
            raise RuntimeError("PDF не содержит страниц для OCR")

        parts: list[str] = []
        for image in images:
            page_text = pytesseract.image_to_string(image, lang="rus+eng")
            if page_text.strip():
                parts.append(page_text.strip())
        text = "\n\n".join(parts).strip()
        if not text:
            raise RuntimeError("OCR не распознал текст на страницах PDF")
        return text
    except RuntimeError:
        raise
    except Exception as exc:
        logger.exception("Tesseract OCR failed")
        raise RuntimeError("Ошибка OCR (Tesseract)") from exc
