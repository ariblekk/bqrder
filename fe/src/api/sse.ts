import { BASE, loadAuth } from './client'

// SSE client built on fetch so the Authorization header can be sent
// (EventSource cannot set headers). Auto-reconnects with backoff.
export function subscribeOrderEvents(onEvent: (ev: unknown) => void): () => void {
  const auth = loadAuth()
  if (!auth) return () => {}

  let alive = true
  let retryMs = 1000

  const run = async () => {
    while (alive) {
      try {
        const res = await fetch(`${BASE}/pos/events`, {
          headers: { Authorization: `Bearer ${auth.access_token}` },
        })
        if (!res.ok || !res.body) throw new Error('stream failed')
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        while (alive) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          let sep: number
          while ((sep = buf.indexOf('\n\n')) !== -1) {
            const chunk = buf.slice(0, sep)
            buf = buf.slice(sep + 2)
            const line = chunk.split('\n').find((l) => l.startsWith('data: '))
            if (line) {
              try {
                onEvent(JSON.parse(line.slice(6)))
              } catch {
                // ignore malformed frame
              }
            }
          }
        }
      } catch {
        // connection dropped; retry below
      }
      if (!alive) break
      await new Promise((r) => setTimeout(r, retryMs))
      retryMs = Math.min(retryMs * 2, 15000)
      // force reload to catch any event missed while disconnected
      onEvent({ type: 'reconnect' })
    }
  }
  run()
  return () => {
    alive = false
  }
}