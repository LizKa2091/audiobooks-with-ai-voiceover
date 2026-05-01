import { NavLink, Outlet } from 'react-router-dom'
import './AppLayout.css'

function navClass({ isActive }: { isActive: boolean }): string {
  return ['app-nav__link', isActive ? 'app-nav__link--active' : '']
    .filter(Boolean)
    .join(' ')
}

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="app-brand" end>
          AI Audiobooks
        </NavLink>
        <nav className="app-nav" aria-label="Основная навигация">
          <NavLink to="/library" className={navClass}>
            Библиотека
          </NavLink>
          <NavLink to="/upload" className={navClass}>
            Загрузка
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
