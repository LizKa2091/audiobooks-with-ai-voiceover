import { stubDelay } from '@/api/stubDelay'
import { readStoredUserBooks } from '@/lib/localLibrary'
import type { BookSummary } from '@/types/book'

const MOCK_BOOKS: BookSummary[] = [
  {
    id: 'stub-1',
    title: 'Мастер и Маргарита',
    author: 'М. Булгаков',
    genre: 'Роман',
    progressPercent: 12,
    updatedAt: '2026-04-28T10:00:00.000Z',
  },
  {
    id: 'stub-2',
    title: 'Краткая история времени',
    author: 'Стивен Хокинг',
    genre: 'Нон-фикшн',
    progressPercent: 67,
    updatedAt: '2026-04-30T18:30:00.000Z',
  },
  {
    id: 'stub-3',
    title: 'Пикник на обочине',
    author: 'Стругацкие',
    genre: 'Фантастика',
    progressPercent: 0,
    updatedAt: '2026-03-15T09:00:00.000Z',
  },
  {
    id: 'stub-4',
    title: 'Собачье сердце',
    author: 'М. Булгаков',
    genre: 'Повесть',
    progressPercent: 100,
    updatedAt: '2026-01-20T22:00:00.000Z',
  },
  {
    id: 'stub-5',
    title: 'Алхимик',
    author: 'П. Коэльо',
    genre: 'Роман',
    progressPercent: 34,
    updatedAt: '2026-04-29T14:12:00.000Z',
  },
]

function mergeStubAndUserBooks(
  stubs: BookSummary[],
  user: BookSummary[],
): BookSummary[] {
  const byId = new Map<string, BookSummary>()
  for (const b of structuredClone(stubs)) byId.set(b.id, b)
  for (const b of user) byId.set(b.id, b)
  return [...byId.values()]
}

export async function fetchBooks(): Promise<BookSummary[]> {
  await stubDelay()
  return mergeStubAndUserBooks(MOCK_BOOKS, readStoredUserBooks())
}
