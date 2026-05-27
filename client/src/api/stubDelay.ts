export function stubDelay(ms = 400): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
