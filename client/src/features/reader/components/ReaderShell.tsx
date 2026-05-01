import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import '../reader.css'

type ReaderShellProps = {
  title: string
  backHref: string
  backLabel?: string
  children: ReactNode
  dock: ReactNode
}

export function ReaderShell({
  title,
  backHref,
  backLabel = '← Библиотека',
  children,
  dock,
}: ReaderShellProps) {
  return (
    <div className="reader">
      <header className="reader__header">
        <Link to={backHref} className="reader__back">
          {backLabel}
        </Link>
        <h1 className="reader__title">{title}</h1>
      </header>
      <div className="reader__body">{children}</div>
      <div className="reader__dock">{dock}</div>
    </div>
  )
}
