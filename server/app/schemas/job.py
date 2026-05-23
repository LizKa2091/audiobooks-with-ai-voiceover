from app.schemas.base import CamelModel


class JobStatusResponse(CamelModel):
    job_id: str
    book_id: str
    step: str
    percent: int
    status: str
    error: str | None = None
