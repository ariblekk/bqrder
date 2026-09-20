import {
  ApiError,
  BASE,
  getBranchId,
  loadAuth,
  refreshToken,
} from "./client";

type Listener = (ev: unknown) => void;

// SSE client built on fetch so the Authorization header can be sent
// (EventSource cannot set headers). Reconnects with backoff and re-reads the
// token each attempt so an expired access token is refreshed.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Reads one SSE response, invoking onEvent per `data:` frame until it closes.
async function stream(path: string, signal: AbortSignal, onEvent: Listener) {
  const auth = loadAuth();
  const headers: Record<string, string> = {};
  if (auth) headers.Authorization = `Bearer ${auth.access_token}`;
  const res = await fetch(`${BASE}${path}`, { headers, signal });
  if (!res.ok || !res.body) throw new ApiError(res.status, "stream failed");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buf += dec.decode(value, { stream: true });
    let sep: number;
    while ((sep = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (line) {
        try {
          onEvent(JSON.parse(line.slice(6)));
        } catch {
          // ignore malformed frame
        }
      }
    }
  }
}

// One shared connection for the whole authenticated app: POS, Dashboard, etc.
// all subscribe to the same stream; the first subscriber opens it and the last
// unsubscribe closes it.
const listeners = new Set<Listener>();
let running = false;
let generation = 0;
let ctrl: AbortController | null = null;

function emit(ev: unknown) {
  listeners.forEach((l) => {
    try {
      l(ev);
    } catch {
      // a listener must not break the shared stream
    }
  });
}

async function runAuthed(gen: number) {
  let retryMs = 1000;
  while (running && gen === generation) {
    ctrl = new AbortController();
    try {
      const branch = getBranchId();
      const path = `/pos/events${branch ? `?branch_id=${branch}` : ""}`;
      await stream(path, ctrl.signal, emit);
      retryMs = 1000;
    } catch (e) {
      // Expired token: refresh so the next attempt succeeds instead of looping.
      if (e instanceof ApiError && e.status === 401) await refreshToken();
    }
    if (!running || gen !== generation) break;
    await sleep(retryMs);
    retryMs = Math.min(retryMs * 2, 15000);
    // force reload to catch any event missed while disconnected
    emit({ type: "reconnect" });
  }
}

export function subscribeOrderEvents(onEvent: Listener): () => void {
  listeners.add(onEvent);
  if (!running) {
    running = true;
    void runAuthed(++generation);
  }
  return () => {
    listeners.delete(onEvent);
    if (listeners.size === 0) {
      running = false;
      generation++;
      ctrl?.abort();
      ctrl = null;
    }
  };
}

// Public, per-order stream for the customer status page (no auth).
export function subscribePublicOrderEvents(
  orderNumber: string,
  onEvent: Listener,
): () => void {
  let alive = true;
  let ctrl: AbortController | null = null;
  const safe = (ev: unknown) => {
    try {
      onEvent(ev);
    } catch {
      // a listener must not break the stream
    }
  };
  const run = async () => {
    let retryMs = 1000;
    while (alive) {
      ctrl = new AbortController();
      try {
        await stream(
          `/public/orders/${encodeURIComponent(orderNumber)}/events`,
          ctrl.signal,
          safe,
        );
        retryMs = 1000;
      } catch (e) {
        // Unknown order: stop instead of retrying forever.
        if (e instanceof ApiError && e.status === 404) return;
        // connection dropped; retry below
      }
      if (!alive) break;
      await sleep(retryMs);
      retryMs = Math.min(retryMs * 2, 15000);
      safe({ type: "reconnect" });
    }
  };
  void run();
  return () => {
    alive = false;
    ctrl?.abort();
  };
}