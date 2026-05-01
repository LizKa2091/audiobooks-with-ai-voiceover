import { stubDelay } from '@/api/stubDelay'
import type { BookSummary } from '@/types/book'

const MOCK_BOOKS: BookSummary[] = [
  {
    id: 'demo-1',
    title: 'Пример книги (заглушка)',
    author: 'Демо',
    progressPercent: 12,
    updatedAt: new Date().toISOString(),
  },
]

export async function fetchBooks(): Promise<BookSummary[]> {
  await stubDelay()
  return structuredClone(MOCK_BOOKS)
}
