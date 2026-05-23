import { useEffect, useState } from 'react'
import { isApiAvailable } from '@/api/availability'
import { isUsingMockData, subscribeMockDataMode } from '@/api/mockMode'
import './MockDataBanner.css'

export function MockDataBanner() {
  const [visible, setVisible] = useState(isUsingMockData())

  useEffect(() => {
    void isApiAvailable()
    return subscribeMockDataMode(() => setVisible(true))
  }, [])

  if (!visible) return null

  return (
    <div className="mock-banner" role="status">
      Сервер недоступен — показаны демо-данные. Запустите API (
      <code>uvicorn</code> на порту 8000) и обновите страницу.
    </div>
  )
}
