import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div className="page">
      <h1>Озвучка книг с синхронизацией текста</h1>
      <p>
        Загружайте PDF, получайте аудио и читайте с подсветкой слов. При
        недоступном API показываются демо-данные.
      </p>
      <div className="cta-row">
        <Link to="/library" className="button button--primary">
          Библиотека
        </Link>
        <Link to="/upload" className="button">
          Загрузить PDF
        </Link>
      </div>
    </div>
  )
}
