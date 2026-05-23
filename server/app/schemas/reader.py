from app.schemas.base import CamelModel


class WordToken(CamelModel):
    id: str
    sentence_id: str
    text: str
    start_sec: float
    end_sec: float


class SentenceBlock(CamelModel):
    id: str
    order: int
    words: list[WordToken]


class ReaderSyncDocument(CamelModel):
    book_id: str
    language: str
    sentences: list[SentenceBlock]


class ReaderAudioSource(CamelModel):
    url: str
    duration_sec: float


class ReaderBundle(CamelModel):
    book_id: str
    title: str
    audio: ReaderAudioSource
    sync: ReaderSyncDocument
