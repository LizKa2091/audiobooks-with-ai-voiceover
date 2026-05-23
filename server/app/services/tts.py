import logging
import struct
import wave
from io import BytesIO

import requests

from app.config import get_settings

logger = logging.getLogger(__name__)

YANDEX_TTS_URL = "https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize"
YANDEX_CHUNK_SIZE = 4500


def _mock_mp3_bytes(duration_sec: float = 3.0) -> bytes:
    sample_rate = 22050
    n_frames = int(sample_rate * duration_sec)
    buf = BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(struct.pack("<h", 0) * n_frames)
    try:
        from pydub import AudioSegment

        buf.seek(0)
        segment = AudioSegment.from_wav(buf)
        out = BytesIO()
        segment.export(out, format="mp3")
        return out.getvalue()
    except Exception:
        logger.warning("ffmpeg unavailable, returning wav bytes as fallback")
        buf.seek(0)
        return buf.getvalue()


def _split_for_tts(text: str, max_len: int) -> list[str]:
    if len(text) <= max_len:
        return [text]
    chunks: list[str] = []
    rest = text
    while rest:
        if len(rest) <= max_len:
            chunks.append(rest)
            break
        cut = rest[:max_len].rsplit(" ", 1)[0]
        if not cut:
            cut = rest[:max_len]
        chunks.append(cut)
        rest = rest[len(cut) :].lstrip()
    return chunks


def _synthesize_yandex(text: str) -> bytes:
    settings = get_settings()
    if not settings.yandex_api_key or not settings.yandex_folder_id:
        raise RuntimeError("Задайте YANDEX_API_KEY и YANDEX_FOLDER_ID")

    headers = {"Authorization": f"Api-Key {settings.yandex_api_key}"}
    parts: list[bytes] = []

    for chunk in _split_for_tts(text, YANDEX_CHUNK_SIZE):
        try:
            response = requests.post(
                YANDEX_TTS_URL,
                headers=headers,
                data={
                    "text": chunk,
                    "lang": "ru-RU",
                    "voice": settings.yandex_voice,
                    "format": "mp3",
                    "folderId": settings.yandex_folder_id,
                },
                timeout=120,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.exception("Yandex SpeechKit request failed")
            raise RuntimeError("Ошибка синтеза речи (Yandex SpeechKit)") from exc
        if not response.content:
            raise RuntimeError("Yandex SpeechKit вернул пустой аудиопоток")
        parts.append(response.content)

    return b"".join(parts)


def synthesize_speech(text: str) -> bytes:
    settings = get_settings()
    trimmed = text.strip()
    if not trimmed:
        raise RuntimeError("Пустой текст для озвучки")
    if len(trimmed) > settings.tts_max_chars:
        trimmed = trimmed[: settings.tts_max_chars].rsplit(" ", 1)[0] + "…"

    provider = settings.tts_provider.lower()
    if provider == "mock":
        est_duration = max(3.0, len(trimmed) / 14.0)
        return _mock_mp3_bytes(est_duration)

    if provider == "yandex":
        return _synthesize_yandex(trimmed)

    raise RuntimeError(f"Неизвестный TTS_PROVIDER: {provider}")
