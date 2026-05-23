# Backend MVP — Аудиокниги с ИИ-озвучкой

FastAPI + PostgreSQL + Celery/Redis + MinIO (S3) + Yandex SpeechKit + Tesseract OCR + spaCy.

## API (префикс `/api`)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/books` | Каталог книг демо-пользователя (`BookSummary`, camelCase) |
| POST | `/books/upload` | Загрузка PDF → `202`, асинхронный ingest в S3 + Celery chain |
| GET | `/books/{id}/status` | Поллинг обработки |
| GET | `/jobs/{id}` | Статус задачи Celery |
| GET | `/books/{id}/reader` | `ReaderBundle` или `202` / `404` |
| PATCH | `/books/{id}/progress` | `progressPercent` или `progressSec` |

## Пайплайн (Celery chain)

```text
ingest (S3 upload) → ocr (pypdf / Tesseract) → cleanup → structure (spaCy) → tts (Yandex) → bundle → ready
```

## Быстрый старт

```bash
# из корня репозитория
docker compose up -d

cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download ru_core_news_sm
cp .env.example .env
# Заполните YANDEX_API_KEY и YANDEX_FOLDER_ID (или TTS_PROVIDER=mock для локальных тестов)

alembic upgrade head

# терминал 1 — API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# терминал 2 — воркер (нужны tesseract + poppler на macOS: brew install tesseract tesseract-lang poppler)
celery -A app.tasks.celery_app worker --loglevel=info
```

Воркер в Docker (с Tesseract и spaCy):

```bash
docker compose up -d worker
```

Фронтенд: `VITE_API_BASE_URL=http://localhost:8000` в `client/.env`.

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `TTS_PROVIDER` | `yandex` (default) или `mock` |
| `YANDEX_API_KEY` | API-ключ Yandex Cloud |
| `YANDEX_FOLDER_ID` | ID каталога |
| `YANDEX_VOICE` | Голос, напр. `filipp` |
| `S3_USE_PRESIGNED` | `true` — presigned URL для аудио |
| `UPLOAD_TEMP_DIR` | Каталог временных PDF до ingest |
| `OCR_MAX_PAGES` | Лимит страниц для Tesseract (default 50) |

## Git

```bash
git checkout dev && git pull origin dev
git checkout -b feat/server/mvp-backend
git commit -m "feat(server): compliance with MVP rules — Yandex TTS, OCR, Celery chain, spaCy"
```

MR в `dev`, не в `main`.
