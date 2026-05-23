"""Обратная совместимость: делегирует в pipeline_chain."""

from app.tasks.pipeline_chain import start_book_pipeline

__all__ = ["start_book_pipeline"]
