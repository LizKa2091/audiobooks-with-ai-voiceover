import { Link, useParams } from 'react-router-dom'

export function ReaderPage() {
  const { bookId } = useParams()

  return (
    <div className="page">
      <h1>Прослушивание</h1>
      <p className="muted">Книга: {bookId ?? '—'}</p>
      <p>
        Плеер, подсветка слов и переход по тапу — в ветке{' '}
        <code>feat/client/reader-audio-sync</code>.
      </p>
      <Link to="/library" className="button">
        ← К библиотеке
      </Link>
    </div>
  )
}
