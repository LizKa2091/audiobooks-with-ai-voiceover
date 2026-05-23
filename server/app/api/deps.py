import uuid

from app.config import get_settings


def demo_user_uuid() -> uuid.UUID:
    return uuid.UUID(get_settings().demo_user_id)
