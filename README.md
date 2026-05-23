# Аудиокниги с ИИ-озвучкой

Веб-платформа и (в перспективе) мобильное приложение, которые превращают **PDF-книги** в **аудиокниги** с **синхронизацией текста и звука**. Пользователь загружает PDF, система извлекает и очищает текст, синтезирует речь и отдаёт книгу в личную библиотеку. При прослушивании подсвечивается текущее слово; можно перейти к любому месту тапом по тексту или по шкале плеера.

Репозиторий — **монорепозиторий** для команды из трёх направлений: фронтенд, бэкенд, мобилка.

| Пакет | Статус | Описание |
|-------|--------|----------|
| [`client/`](client/) | MVP | React + Vite, веб-интерфейс |
| [`server/`](server/) | MVP | FastAPI, обработка PDF, TTS, API |
| [`mobile/`](mobile/) | Заготовка | Flutter (планируется) |

---

## Содержание

- [Возможности](#возможности)
- [Архитектура](#архитектура)
- [Структура репозитория](#структура-репозитория)
- [Технологии](#технологии)
- [Быстрый старт (Docker)](#быстрый-старт-docker)
- [Локальная разработка](#локальная-разработка)
- [Переменные окружения](#переменные-окружения)
- [API](#api)
- [Фронтенд и режим демо-данных](#фронтенд-и-режим-демо-данных)
- [Деплой](#деплой)
- [Git и ветки](#git-и-ветки)
- [Дополнительная документация](#дополнительная-документация)

---

## Возможности

### Реализовано в MVP

- **Загрузка PDF** — выбор файла, отображение шагов обработки (приём → OCR → структура → очистка → озвучка).
- **Библиотека** — список книг, прогресс прослушивания, сортировка (дата / название / жанр).
- **Читалка** — аудиоплеер, подсветка слова по таймкоду, перемотка по слову и по шкале.
- **Бэкенд** — асинхронный пайплайн (Celery), хранение в PostgreSQL и S3-совместимом хранилище, REST API в camelCase под фронт.
- **Офлайн-демо на фронте** — если API недоступен, показываются моковые данные и информационный баннер (без «красных» ошибок).

### Планируется (вне текущего MVP)

Аккаунты и синхронизация между устройствами, выбор голоса и эмоций, таймер сна, экспорт MP3, офлайн-режим, заметки и выделения, мобильное приложение (Flutter).

---

## Архитектура

```text
┌─────────────┐     HTTPS      ┌──────────────┐
│   client    │ ──────────────►│     api      │
│  (React)    │   /api/*       │  (FastAPI)   │
└─────────────┘                └──────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              ┌──────────┐      ┌──────────┐      ┌──────────┐
              │ Postgres │      │  Redis   │      │  MinIO   │
              │  (книги) │      │ (очередь)│      │ PDF/MP3  │
              └──────────┘      └────┬─────┘      └──────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │   worker     │
                              │   (Celery)   │
                              │ OCR · NLP ·  │
                              │     TTS      │
                              └──────────────┘
```

**Пайплайн обработки книги** (воркер):

```text
ingest → ocr → cleanup → structure → tts → bundle → ready
```

1. **ingest** — PDF во временное хранилище и в S3.  
2. **ocr** — извлечение текста (pypdf) или OCR сканов (Tesseract).  
3. **cleanup** — очистка артефактов.  
4. **structure** — разбиение на предложения и слова (spaCy).  
5. **tts** — синтез речи (Yandex SpeechKit или `mock` без ключей).  
6. **bundle** — сборка `ReaderBundle` (аудио URL + таймкоды слов).

---

## Структура репозитория

```text
audiobooks-with-ai-voiceover/
├── client/                 # Веб-клиент (React + TypeScript + Vite)
│   ├── src/
│   │   ├── api/            # Запросы к бэкенду + fallback на стабы
│   │   ├── pages/          # Главная, библиотека, загрузка, читалка
│   │   └── features/       # reader, upload
│   ├── Dockerfile          # Сборка + nginx
│   └── .env.example
├── server/                 # Бэкенд (FastAPI)
│   ├── app/
│   │   ├── api/            # REST-роуты
│   │   ├── models/         # SQLAlchemy
│   │   ├── schemas/        # Pydantic (camelCase для фронта)
│   │   ├── services/       # OCR, TTS, S3, NLP
│   │   └── tasks/          # Celery
│   ├── alembic/            # Миграции БД
│   ├── Dockerfile          # API
│   ├── Dockerfile.worker   # Celery worker
│   └── .env.example
├── mobile/                 # Заготовка под Flutter
├── docker-compose.yml      # Postgres, Redis, MinIO, api, worker, client
└── README.md               # Этот файл
```

---

## Технологии

| Слой | Стек |
|------|------|
| **Фронтенд** | React 19, TypeScript, Vite, React Router |
| **Бэкенд** | Python 3.12, FastAPI, SQLAlchemy, Alembic, Celery |
| **БД** | PostgreSQL 16 |
| **Очередь** | Redis 7 |
| **Файлы** | MinIO (S3 API) — PDF и MP3 |
| **OCR** | pypdf, Tesseract, pdf2image |
| **NLP** | spaCy (`ru_core_news_sm`) |
| **TTS** | Yandex SpeechKit (или `mock` для разработки) |
| **Инфра** | Docker Compose |

---

## Быстрый старт (Docker)

Нужны **Docker Engine** и **Docker Compose v2**. Одной командой поднимается инфраструктура, API, воркер и собранный веб-клиент.

```bash
# из корня репозитория
cp server/.env.example server/.env   # опционально: ключи Yandex TTS

docker compose up -d --build
```

| Сервис | URL | Учётные данные |
|--------|-----|----------------|
| **Веб-приложение** | http://localhost:5173 | — |
| **API (Swagger)** | http://localhost:8000/docs | — |
| **Health** | http://localhost:8000/health | — |
| **MinIO Console** | http://localhost:9001 | `minioadmin` / `minioadmin` |

Остановка:

```bash
docker compose down
```

Данные PostgreSQL и MinIO сохраняются в Docker volumes. Полная очистка: `docker compose down -v`.

По умолчанию в Compose задано **`TTS_PROVIDER=mock`** — озвучка без ключей Yandex Cloud. Для реального TTS укажите в `server/.env`:

```env
TTS_PROVIDER=yandex
YANDEX_API_KEY=...
YANDEX_FOLDER_ID=...
```

Просмотр логов:

```bash
docker compose logs -f api worker client
```

---

## Локальная разработка

Удобно, когда Docker Desktop недоступен или нужен hot-reload фронта.

### 1. Инфраструктура (Docker)

```bash
docker compose up -d postgres redis minio minio-init
```

### 2. Бэкенд

Подробности — в [`server/README.md`](server/README.md).

```bash
cd server
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
python -m spacy download ru_core_news_sm
cp .env.example .env

alembic upgrade head
```

**Терминал 1 — API:**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Терминал 2 — Celery worker:**

```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

На Windows для OCR могут понадобиться отдельно: [Tesseract](https://github.com/tesseract-ocr/tesseract), [Poppler](https://github.com/oschwartz10612/poppler-windows/releases), **ffmpeg** (для конвертации аудио в mock-режиме).

### 3. Фронтенд

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Откройте http://localhost:5173 (порт Vite по умолчанию).

Сборка и линт:

```bash
npm run build
npm run lint
```

---

## Переменные окружения

### Клиент (`client/.env`)

| Переменная | Описание |
|------------|----------|
| `VITE_API_BASE_URL` | URL бэкенда без завершающего `/`. Пустое значение в `.env.example` подставляет `http://localhost:8000`. В Docker-сборке клиента задаётся `http://localhost:8000`, чтобы браузер на хосте ходил на проброшенный порт API. |

### Сервер (`server/.env`)

Полный список — в [`server/.env.example`](server/.env.example). Основное:

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | PostgreSQL |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Redis |
| `S3_*` | MinIO / AWS S3 |
| `CORS_ORIGINS` | Origins фронта (через запятую) |
| `TTS_PROVIDER` | `yandex` или `mock` |
| `YANDEX_API_KEY`, `YANDEX_FOLDER_ID`, `YANDEX_VOICE` | Yandex SpeechKit |
| `DEMO_USER_ID` | UUID демо-пользователя (MVP без авторизации) |

В Docker Compose часть переменных переопределяется для сервисов `api` и `worker` (хосты `postgres`, `redis`, `minio` внутри сети Compose).

---

## API

Базовый префикс: **`/api`**. Схемы ответов — **camelCase** (совместимость с TypeScript-клиентом).

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/health` | Проверка живости API |
| `GET` | `/api/books` | Список книг |
| `POST` | `/api/books/upload` | Загрузка PDF → `202`, старт пайплайна |
| `GET` | `/api/books/{id}/status` | Статус обработки (шаг, процент) |
| `GET` | `/api/jobs/{id}` | Статус задачи Celery |
| `GET` | `/api/books/{id}/reader` | Контент читалки (`ReaderBundle`) или `202` / `404` |
| `PATCH` | `/api/books/{id}/progress` | Сохранение прогресса (`progressPercent` / `progressSec`) |

Интерактивная документация: **http://localhost:8000/docs**

---

## Фронтенд и режим демо-данных

Клиент при старте проверяет **`GET /health`**. Если API недоступен или запросы падают:

- данные берутся из **локальных стабов** (и `localStorage` для книг, загруженных в демо-режиме);
- показывается **жёлтый баннер**: сервер не запущен, используются демо-данные;
- **нет** навязчивых ошибок в интерфейсе.

Если API отвечает — баннер скрыт, используются реальные эндпоинты (`/api/books`, upload, reader).

Маршруты приложения:

| Путь | Страница |
|------|----------|
| `/` | Главная |
| `/library` | Библиотека |
| `/upload` | Загрузка PDF |
| `/reader/:bookId` | Читалка |

---

## Деплой

### Веб-клиент (Vercel и аналоги)

Деплоятся **только статика** из `client/`:

- **Root Directory:** `client`
- **Build:** `npm run build`
- **Output:** `dist`
- **Environment:** `VITE_API_BASE_URL=https://ваш-api.example.com`

Файл [`client/vercel.json`](client/vercel.json) настроен для SPA (React Router).

### Бэкенд

FastAPI + Celery + PostgreSQL + Redis + S3 **не рассчитаны на serverless-хостинг вроде Vercel**. Нужен отдельный хост:

- Railway, Render, Fly.io, VPS, Kubernetes и т.п.
- Отдельные процессы: **API**, **Celery worker**, managed **Postgres** / **Redis**, **S3** или MinIO.

В `CORS_ORIGINS` на сервере укажите URL фронта (например `https://your-app.vercel.app`).

### Docker на сервере

На VPS можно использовать тот же `docker compose up -d --build`, предварительно задав продакшен-переменные и домены (reverse proxy: nginx / Caddy с TLS).

---

## Git и ветки

| Ветка | Назначение |
|-------|------------|
| **`main`** | Релизы, готовый MVP. Прямые коммиты не делаем. |
| **`dev`** | Основная разработка. Сюда идут Merge Request'ы. |

Формат веток:

```text
feat/<направление>/<краткое-имя>
fix/<направление>/<краткое-имя>
```

Направления: `client`, `server`, `mobile`.

Примеры:

- `feat/client/reader-audio-sync`
- `feat/server/mvp-backend`
- `fix/client/api-mock-fallback`

Коммиты — осмысленные, на английском или русском по договорённости в команде; в MR — описание «зачем», не только «что».

---

## Дополнительная документация

- [server/README.md](server/README.md) — API, пайплайн, переменные бэкенда  
- [client/.env.example](client/.env.example) — настройка фронта  
- [server/.env.example](server/.env.example) — настройка бэкенда  

---

## Команда и контакты

Проект ведётся командой из трёх направлений: **фронтенд** (`client`), **бэкенд** (`server`), **мобилка** (`mobile`). Вопросы по своему слою — в соответствующих MR и чатах; общие решения по API и контрактам данных — согласовывать до merge в `dev`.

---

## Лицензия

Уточните лицензию репозитория при публикации (если файл `LICENSE` ещё не добавлен — добавьте по выбору команды).
