import type { UploadPipelineResult } from '@/features/upload/pipeline'
import type { BookSummary } from '@/types/book'

export const USER_BOOKS_STORAGE_KEY = 'audiobooks-user-books-v1'

export const LIBRARY_CHANGED_EVENT = 'audiobooks-library-changed'

function isBookSummary(x: unknown): x is BookSummary {
  if (typeof x !== 'object' || x === null) return false
  const b = x as Record<string, unknown>
  return (
    typeof b.id === 'string' &&
    typeof b.title === 'string' &&
    typeof b.author === 'string' &&
    typeof b.genre === 'string' &&
    typeof b.progressPercent === 'number' &&
    typeof b.updatedAt === 'string'
  )
}

export function readStoredUserBooks(): BookSummary[] {
  try {
    const raw = localStorage.getItem(USER_BOOKS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isBookSummary)
  } catch {
    return []
  }
}

function persistUserBooks(books: BookSummary[]): void {
  localStorage.setItem(USER_BOOKS_STORAGE_KEY, JSON.stringify(books))
}

/** Добавляет книгу после успешной «обработки» загрузки (MVP, без бэкенда). */
export function appendUploadedBook(result: UploadPipelineResult): BookSummary {
  const now = new Date().toISOString()
  const book: BookSummary = {
    id: result.bookId,
    title: result.title,
    author: '—',
    genre: 'Загрузка',
    progressPercent: 0,
    updatedAt: now,
  }
  const existing = readStoredUserBooks().filter((b) => b.id !== book.id)
  persistUserBooks([book, ...existing])
  return book
}

export function notifyLibraryChanged(): void {
  window.dispatchEvent(new CustomEvent(LIBRARY_CHANGED_EVENT))
}
