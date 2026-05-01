export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} Б`
  const units = ['КБ', 'МБ', 'ГБ']
  let n = bytes / 1024
  let u = 0
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024
    u += 1
  }
  return `${n < 10 && u > 0 ? n.toFixed(1) : Math.round(n)} ${units[u]}`
}
