import re

_MULTI_SPACE = re.compile(r"[ \t]+")
_MULTI_NEWLINE = re.compile(r"\n{3,}")
_HYPHEN_BREAK = re.compile(r"(\w)-\n(\w)")
_PAGE_NUM = re.compile(r"^\s*\d+\s*$", re.MULTILINE)


def clean_extracted_text(raw: str) -> str:
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    text = _HYPHEN_BREAK.sub(r"\1\2", text)
    text = _PAGE_NUM.sub("", text)
    text = _MULTI_NEWLINE.sub("\n\n", text)
    text = _MULTI_SPACE.sub(" ", text)
    return text.strip()


def split_sentences(text: str) -> list[str]:
    """Разбиение на предложения без тяжёлого NLP (достаточно для MVP)."""
    chunks = re.split(r"(?<=[.!?…])\s+", text)
    sentences = [c.strip() for c in chunks if c.strip()]
    if not sentences and text.strip():
        return [text.strip()]
    return sentences
