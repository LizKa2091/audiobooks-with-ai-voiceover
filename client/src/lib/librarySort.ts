import type { BookSummary } from '@/types/book'

export type LibrarySortKey = 'date' | 'title' | 'genre'

export const LIBRARY_SORT_STORAGE_KEY = 'audiobooks-library-sort'

export function isLibrarySortKey(value: string): value is LibrarySortKey {
  return value === 'date' || value === 'title' || value === 'genre'
}

export function sortBooks(
  books: BookSummary[],
  key: LibrarySortKey,
): BookSummary[] {
  const copy = [...books]
  if (key === 'date') {
    copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return copy
  }
  if (key === 'title') {
    copy.sort((a, b) =>
      a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' }),
    )
    return copy
  }
  copy.sort((a, b) => {
    const byGenre = a.genre.localeCompare(b.genre, 'ru', {
      sensitivity: 'base',
    })
    if (byGenre !== 0) return byGenre
    return a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' })
  })
  return copy
}
