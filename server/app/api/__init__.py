from fastapi import APIRouter

from app.api import books, jobs

api_router = APIRouter(prefix="/api")
api_router.include_router(books.router)
api_router.include_router(jobs.router)
