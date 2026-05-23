from uuid import UUID

from app.services.audio_meta import mp3_duration_sec
from app.services.nlp_sync import build_sync_document
from app.services.nlp_tokenizer import SentenceTokens
from app.services.storage import StorageService


def build_reader_bundle(
    book_id: UUID,
    title: str,
    audio_bytes: bytes,
    audio_s3_key: str,
    sentence_tokens: list[SentenceTokens],
) -> dict:
    duration = mp3_duration_sec(audio_bytes)
    storage = StorageService()
    sync = build_sync_document(book_id, duration, sentence_tokens)
    return {
        "bookId": str(book_id),
        "title": title,
        "audio": {
            "url": storage.object_url(audio_s3_key),
            "durationSec": round(duration, 3),
        },
        "sync": sync,
    }
