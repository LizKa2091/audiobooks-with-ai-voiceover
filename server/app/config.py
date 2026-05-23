from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    database_url: str = "postgresql+psycopg2://audiobooks:audiobooks@localhost:5432/audiobooks"

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "audiobooks"
    s3_region: str = "us-east-1"
    s3_public_base_url: str = "http://localhost:9000/audiobooks"
    s3_use_presigned: bool = False
    s3_presigned_expires_sec: int = 3600

    upload_temp_dir: str = "/tmp/audiobooks"

    demo_user_id: str = "00000000-0000-0000-0000-000000000001"

    ocr_max_pages: int = 50

    tts_provider: str = "yandex"
    tts_max_chars: int = 8000
    yandex_api_key: str = ""
    yandex_folder_id: str = ""
    yandex_voice: str = "filipp"

    spacy_model: str = "ru_core_news_sm"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
