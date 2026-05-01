import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBooks } from '@/api/stubs/books'
import {
  isLibrarySortKey,
  LIBRARY_SORT_STORAGE_KEY,
  sortBooks,
  type LibrarySortKey,
} from '@/lib/librarySort'
import type { BookSummary } from '@/types/book'

const sortLabels: Record<LibrarySortKey, string> = {
  date: 'По дате обновления',
  title: 'По названию',
  genre: 'По жанру',
}

function readStoredSort(): LibrarySortKey {
  try {
    const raw = localStorage.getItem(LIBRARY_SORT_STORAGE_KEY)
    if (raw && isLibrarySortKey(raw)) return raw
  } catch {
    /* ignore */
  }
  return 'date'
}

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

export function LibraryPage() {
  const [books, setBooks] = useState<BookSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<LibrarySortKey>(() => readStoredSort())

  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_SORT_STORAGE_KEY, sortKey)
    } catch {
      /* ignore */
    }
  }, [sortKey])

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetchBooks()
      .then((data) => {
        if (!cancelled) setBooks(data)
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить список (заглушка).')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sortedBooks = useMemo(() => {
    if (!books) return null
    return sortBooks(books, sortKey)
  }, [books, sortKey])

  return (
    <div className="page page--wide">
      <h1>Библиотека</h1>
      <p className="muted">
        Плейлист загруженных книг. Данные — из <code>api/stubs/books</code>;
        сортировка сохраняется в этом браузере.
      </p>

      {error ? <p role="alert">{error}</p> : null}

      {books === null && !error ? <p>Загрузка…</p> : null}

      {books && books.length === 0 ? (
        <p>Книг пока нет. Добавьте PDF на странице «Загрузка».</p>
      ) : null}

      {sortedBooks && sortedBooks.length > 0 ? (
        <>
          <div className="library-toolbar">
            <label className="library-toolbar__label" htmlFor="library-sort">
              Сортировка
            </label>
            <select
              id="library-sort"
              className="library-toolbar__select"
              value={sortKey}
              onChange={(e) => {
                const v = e.target.value
                if (isLibrarySortKey(v)) setSortKey(v)
              }}
            >
              {(Object.keys(sortLabels) as LibrarySortKey[]).map((key) => (
                <option key={key} value={key}>
                  {sortLabels[key]}
                </option>
              ))}
            </select>
          </div>

          <ul className="book-list">
            {sortedBooks.map((book) => (
              <li key={book.id} className="book-card">
                <div className="book-card__top">
                  <div className="book-card__meta">
                    <h2 className="book-card__title">{book.title}</h2>
                    <p className="book-card__author">{book.author}</p>
                    <p className="book-card__updated muted">
                      Обновлено: {formatUpdatedAt(book.updatedAt)}
                    </p>
                  </div>
                  <span className="genre-chip">{book.genre}</span>
                </div>
                <div className="book-card__progress-row">
                  <span className="book-card__percent muted">
                    {book.progressPercent}%
                  </span>
                  <div
                    className="book-card__progress"
                    role="progressbar"
                    aria-valuenow={book.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Прослушано ${book.progressPercent}%`}
                  >
                    <div
                      className="book-card__progress-bar"
                      style={{ width: `${book.progressPercent}%` }}
                    />
                  </div>
                </div>
                <Link to={`/reader/${book.id}`} className="button button--small">
                  Слушать
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
