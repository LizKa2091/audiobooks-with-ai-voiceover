import logging
from io import BytesIO

from mutagen.mp3 import MP3

logger = logging.getLogger(__name__)


def mp3_duration_sec(audio_bytes: bytes) -> float:
    try:
        audio = MP3(BytesIO(audio_bytes))
        if audio.info and audio.info.length:
            return float(audio.info.length)
    except Exception:
        logger.debug("mutagen MP3 parse failed, trying pydub")

    try:
        from pydub import AudioSegment

        segment = AudioSegment.from_file(BytesIO(audio_bytes))
        return len(segment) / 1000.0
    except Exception as exc:
        raise RuntimeError("Не удалось определить длительность аудио") from exc
