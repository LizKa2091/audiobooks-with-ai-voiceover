import uuid

from sqlalchemy.orm import Session

from app.models.book import Book


def get_state(book: Book) -> dict:
    return dict(book.processing_state or {})


def merge_state(db: Session, book: Book, **fields: object) -> dict:
    state = get_state(book)
    state.update(fields)
    book.processing_state = state
    db.flush()
    return state


def merge_state_by_id(db: Session, book_id: uuid.UUID, **fields: object) -> dict:
    book = db.get(Book, book_id)
    if not book:
        raise RuntimeError("Книга не найдена")
    return merge_state(db, book, **fields)
