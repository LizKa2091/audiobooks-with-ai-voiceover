/**
 * Модель для синхронизации текста и аудио.
 * Бэкенд позже может отдавать ту же форму или маппинг в неё.
 */

export type WordToken = {
  id: string
  sentenceId: string
  /** Текст слова без лишних пробелов */
  text: string
  startSec: number
  endSec: number
}

export type SentenceBlock = {
  id: string
  order: number
  words: WordToken[]
}

export type ReaderSyncDocument = {
  bookId: string
  language: string
  sentences: SentenceBlock[]
}

export type ReaderAudioSource = {
  /** Пока заглушка; позже подписанный URL или blob */
  url: string
  durationSec: number
}

export type ReaderBundle = {
  bookId: string
  title: string
  audio: ReaderAudioSource
  sync: ReaderSyncDocument
}
