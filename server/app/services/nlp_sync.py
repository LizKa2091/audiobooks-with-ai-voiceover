from uuid import UUID

from app.services.nlp_tokenizer import SentenceTokens


def build_sync_document(
    book_id: UUID,
    duration_sec: float,
    sentence_tokens: list[SentenceTokens],
    language: str = "ru",
) -> dict:
    """Строит ReaderSyncDocument с таймкодами по реальной длительности MP3."""
    if not sentence_tokens:
        sentence_tokens = [{"text": "Текст книги недоступен.", "words": ["Текст", "книги", "недоступен."]}]

    total_weight = sum(max(len(s["words"]), 1) for s in sentence_tokens)
    cursor = 0.0
    blocks: list[dict] = []

    for order, sentence in enumerate(sentence_tokens):
        sentence_id = f"s{order}"
        words_text = sentence["words"]
        sentence_weight = max(len(words_text), 1)
        sentence_duration = duration_sec * (sentence_weight / total_weight)
        sentence_start = cursor
        sentence_end = min(cursor + sentence_duration, duration_sec)

        word_tokens: list[dict] = []
        if words_text:
            char_weights = [max(len(w), 1) for w in words_text]
            w_total = sum(char_weights)
            w_cursor = sentence_start
            for i, (word, weight) in enumerate(zip(words_text, char_weights, strict=True)):
                w_dur = (sentence_end - sentence_start) * (weight / w_total)
                w_start = w_cursor
                w_end = sentence_end if i == len(words_text) - 1 else w_cursor + w_dur
                word_tokens.append(
                    {
                        "id": f"{sentence_id}-w{i}",
                        "sentenceId": sentence_id,
                        "text": word,
                        "startSec": round(w_start, 3),
                        "endSec": round(w_end, 3),
                    }
                )
                w_cursor = w_end

        blocks.append({"id": sentence_id, "order": order, "words": word_tokens})
        cursor = sentence_end

    return {
        "bookId": str(book_id),
        "language": language,
        "sentences": blocks,
    }
