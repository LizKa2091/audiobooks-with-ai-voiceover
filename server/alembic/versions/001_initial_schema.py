"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-23

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "books",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("author", sa.String(256), nullable=False),
        sa.Column("genre", sa.String(128), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("progress_percent", sa.Integer(), nullable=False),
        sa.Column("progress_sec", sa.Float(), nullable=False),
        sa.Column("audio_duration_sec", sa.Float(), nullable=True),
        sa.Column("pdf_s3_key", sa.String(1024), nullable=True),
        sa.Column("audio_s3_key", sa.String(1024), nullable=True),
        sa.Column("reader_bundle", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_books_user_id", "books", ["user_id"])
    op.create_index("ix_books_status", "books", ["status"])

    op.create_table(
        "processing_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("book_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("books.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step", sa.String(32), nullable=False),
        sa.Column("percent", sa.Integer(), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_processing_jobs_book_id", "processing_jobs", ["book_id"])


def downgrade() -> None:
    op.drop_table("processing_jobs")
    op.drop_table("books")
