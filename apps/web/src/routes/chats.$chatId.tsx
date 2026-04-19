import { useEffect, useRef, useState } from 'react';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { streamSse, type Message } from '@educatr/shared';
import { getChatFn } from '../server/functions.ts';

export const Route = createFileRoute('/chats/$chatId')({
  component: ChatThread,
  loader: ({ params }) => getChatFn({ data: { chatId: params.chatId } }),
});

function ChatThread() {
  const chat = Route.useLoaderData();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(chat.messages);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // When navigating between chats the loader data changes — resync local state.
  useEffect(() => {
    setMessages(chat.messages);
    setStreaming(null);
  }, [chat.id, chat.messages]);

  async function send() {
    const content = draft.trim();
    if (!content || streaming !== null) return;
    setDraft('');

    // Optimistically render the user message.
    const optimisticUser: Message = {
      id: crypto.randomUUID(),
      chatId: chat.id,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimisticUser]);
    setStreaming('');

    const abort = new AbortController();
    abortRef.current = abort;
    let assistantText = '';

    try {
      for await (const token of streamSse({
        url: '/api/chats/stream',
        method: 'POST',
        body: { chatId: chat.id, content },
        signal: abort.signal,
      })) {
        assistantText += token;
        setStreaming(assistantText);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        console.error(err);
      }
    } finally {
      abortRef.current = null;
      setStreaming(null);
      // Refresh loader to pull persisted messages (and any updated title).
      await router.invalidate();
    }
    // Persist local state for immediate render pre-invalidate.
    if (assistantText.length > 0) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          chatId: chat.id,
          role: 'assistant',
          content: assistantText,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>{chat.title ?? 'Untitled chat'}</h2>
      <div style={styles.thread}>
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {streaming !== null && (
          <MessageBubble
            message={{
              id: 'streaming',
              chatId: chat.id,
              role: 'assistant',
              content: streaming.length > 0 ? streaming : '…',
              createdAt: new Date().toISOString(),
            }}
          />
        )}
      </div>
      <form
        style={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything…"
          rows={2}
          style={styles.input}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        {streaming !== null ? (
          <button type="button" onClick={cancel} style={styles.cancel}>
            Stop
          </button>
        ) : (
          <button type="submit" disabled={draft.trim().length === 0} style={styles.send}>
            Send
          </button>
        )}
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div style={{ ...styles.bubble, ...(isUser ? styles.bubbleUser : styles.bubbleAssistant) }}>
      <div style={styles.bubbleRole}>{isUser ? 'You' : 'educatr'}</div>
      <div style={styles.bubbleBody}>{message.content}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: 760,
    margin: '0 auto',
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 3rem)',
  },
  title: { marginTop: 0, marginBottom: '1rem' },
  thread: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    paddingBottom: '1rem',
  },
  bubble: {
    padding: '0.75rem 1rem',
    borderRadius: 10,
    border: '1px solid #eee',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
  bubbleUser: { background: '#eef', alignSelf: 'flex-end', maxWidth: '80%' },
  bubbleAssistant: { background: '#fff', alignSelf: 'flex-start', maxWidth: '90%' },
  bubbleRole: { fontSize: '0.75rem', color: '#777', marginBottom: '0.25rem' },
  bubbleBody: {},
  form: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '0.5rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid #eee',
  },
  input: {
    padding: '0.5rem 0.75rem',
    border: '1px solid #ddd',
    borderRadius: 8,
    resize: 'vertical',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
  },
  send: {
    padding: '0.5rem 1rem',
    border: 'none',
    background: '#224',
    color: '#fff',
    borderRadius: 8,
    cursor: 'pointer',
  },
  cancel: {
    padding: '0.5rem 1rem',
    border: '1px solid #c00',
    background: '#fff',
    color: '#c00',
    borderRadius: 8,
    cursor: 'pointer',
  },
};
