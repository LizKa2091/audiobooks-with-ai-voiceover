import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBooks } from '@/api/stubs/books'
import type { BookSummary } from '@/types/book'

export function LibraryPage() {
  const [books, setBooks] = useState<BookSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="page">
      <h1>Библиотека</h1>
      <p className="muted">
        Список книг сейчас из <code>api/stubs/books</code>; позже заменится на{' '}
        <code>apiFetch</code>.
      </p>

      {error ? <p role="alert">{error}</p> : null}

      {books === null && !error ? <p>Загрузка…</p> : null}

      {books && books.length === 0 ? (
        <p>Книг пока нет. Добавьте PDF на странице «Загрузка».</p>
      ) : null}

      {books && books.length > 0 ? (
        <ul className="book-list">
          {books.map((book) => (
            <li key={book.id} className="book-card">
              <div className="book-card__meta">
                <h2 className="book-card__title">{book.title}</h2>
                <p className="book-card__author">{book.author}</p>
              </div>
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
              <Link to={`/reader/${book.id}`} className="button button--small">
                Слушать
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
