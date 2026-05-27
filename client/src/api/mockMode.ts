type Listener = () => void

let usingMockData = false
const listeners = new Set<Listener>()

export function isUsingMockData(): boolean {
  return usingMockData
}

export function enableMockDataMode(): void {
  if (usingMockData) return
  usingMockData = true
  listeners.forEach((fn) => fn())
}

export function subscribeMockDataMode(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
