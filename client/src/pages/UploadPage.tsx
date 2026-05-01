export function UploadPage() {
  return (
    <div className="page">
      <h1>Загрузка PDF</h1>
      <p>
        Здесь будет выбор файла, очередь обработки (OCR, структура глав) и
        статусы. Пока бэкенда нет — только экран-заглушка.
      </p>
      <p className="muted">
        Следующий шаг: отдельная ветка <code>feat/client/book-upload-flow</code>
        .
      </p>
    </div>
  )
}
