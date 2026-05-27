import logging
from typing import TypedDict

from app.config import get_settings
from app.services.text_cleanup import split_sentences

logger = logging.getLogger(__name__)

_nlp = None
_nlp_unavailable = False


class SentenceTokens(TypedDict):
    text: str
    words: list[str]


def _get_spacy_nlp():
    global _nlp, _nlp_unavailable
    if _nlp_unavailable:
        return None
    if _nlp is not None:
        return _nlp
    try:
        import spacy

        settings = get_settings()
        _nlp = spacy.load(settings.spacy_model)
        return _nlp
    except Exception as exc:
        logger.warning("spaCy model unavailable (%s), using regex fallback", exc)
        _nlp_unavailable = True
        return None


def tokenize_for_sync(text: str) -> list[SentenceTokens]:
    """
    Разбивает текст на предложения и слова (spaCy).
    При отсутствии модели — regex fallback.
    """
    nlp = _get_spacy_nlp()
    if nlp is None:
        return [
            {"text": sentence, "words": sentence.split()}
            for sentence in split_sentences(text)
            if sentence.strip()
        ]

    doc = nlp(text)
    sentences: list[SentenceTokens] = []
    for sent in doc.sents:
        words = [token.text for token in sent if not token.is_punct and not token.is_space]
        sentence_text = sent.text.strip()
        if words and sentence_text:
            sentences.append({"text": sentence_text, "words": words})

    if not sentences and text.strip():
        return [{"text": text.strip(), "words": text.split()}]
    return sentences
