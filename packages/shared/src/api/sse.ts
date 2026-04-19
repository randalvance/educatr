/**
 * Isomorphic SSE consumer built on `fetch`'s streaming body.
 *
 * Works in browsers (modern WHATWG fetch) and in React Native when a streaming-
 * capable fetch is installed (e.g. `expo/fetch` or a polyfilled RN fetch). We avoid
 * `EventSource` because React Native doesn't ship one natively.
 *
 * Assumes the server emits event-stream lines of the form `data: <text>\n\n`.
 * Yields the decoded `<text>` payload for each event in order.
 */
export interface StreamSseOptions {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export async function* streamSse(opts: StreamSseOptions): AsyncGenerator<string, void, void> {
  const { url, method = 'POST', headers, body, signal } = opts;

  const init: RequestInit = {
    method,
    headers: {
      Accept: 'text/event-stream',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  if (signal) init.signal = signal;

  const response = await fetch(url, init);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`SSE request failed ${response.status}: ${text}`);
  }
  if (!response.body) {
    throw new Error('SSE response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Events are delimited by a blank line.
      let sepIdx: number;
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);

        // Concatenate all `data:` lines in the event.
        const lines = rawEvent.split('\n');
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).replace(/^ /, ''));
          }
        }
        if (dataLines.length > 0) {
          yield dataLines.join('\n');
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
