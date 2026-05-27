import logging
from uuid import UUID

import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self) -> None:
        settings = get_settings()
        self._bucket = settings.s3_bucket
        self._public_base = settings.s3_public_base_url.rstrip("/")
        self._use_presigned = settings.s3_use_presigned
        self._presigned_expires = settings.s3_presigned_expires_sec
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=Config(signature_version="s3v4"),
        )
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError:
            try:
                self._client.create_bucket(Bucket=self._bucket)
            except (ClientError, BotoCoreError) as exc:
                logger.warning("Could not create bucket %s: %s", self._bucket, exc)

    def upload_bytes(self, key: str, data: bytes, content_type: str) -> str:
        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        except (ClientError, BotoCoreError) as exc:
            raise RuntimeError(f"S3 upload failed for {key}") from exc
        return key

    def download_bytes(self, key: str) -> bytes:
        try:
            response = self._client.get_object(Bucket=self._bucket, Key=key)
            return response["Body"].read()
        except (ClientError, BotoCoreError) as exc:
            raise RuntimeError(f"S3 download failed for {key}") from exc

    def public_url(self, key: str) -> str:
        return f"{self._public_base}/{key}"

    def object_url(self, key: str) -> str:
        if self._use_presigned:
            try:
                return self._client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self._bucket, "Key": key},
                    ExpiresIn=self._presigned_expires,
                )
            except (ClientError, BotoCoreError) as exc:
                logger.warning("Presigned URL failed, falling back to public: %s", exc)
        return self.public_url(key)

    def pdf_key(self, book_id: UUID) -> str:
        return f"books/{book_id}/source.pdf"

    def audio_key(self, book_id: UUID) -> str:
        return f"books/{book_id}/narration.mp3"


def upload_pdf(book_id: UUID, pdf_bytes: bytes) -> str:
    storage = StorageService()
    key = storage.pdf_key(book_id)
    storage.upload_bytes(key, pdf_bytes, "application/pdf")
    return key


def upload_audio(book_id: UUID, audio_bytes: bytes) -> str:
    storage = StorageService()
    key = storage.audio_key(book_id)
    storage.upload_bytes(key, audio_bytes, "audio/mpeg")
    return key
