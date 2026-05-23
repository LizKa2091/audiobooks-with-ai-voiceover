# Аудиокниги с ИИ-озвучкой

Монорепозиторий: веб-клиент (`client/`), MVP-бэкенд (`server/`), мобилка (`mobile/`).

## Запуск для разработки

```bash
# Инфраструктура: PostgreSQL, Redis, MinIO
docker compose up -d

# Бэкенд — см. server/README.md
cd server && cp .env.example .env && pip install -r requirements.txt

# Фронтенд
cd client && npm install && npm run dev
```

## Документация API

После старта бэкенда: [http://localhost:8000/docs](http://localhost:8000/docs)
