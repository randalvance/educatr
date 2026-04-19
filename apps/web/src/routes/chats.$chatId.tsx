import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { streamSse, type Message } from '@educatr/shared';
import { getChatFn } from '../server/functions.ts';
import { useHotkey } from '../lib/hotkeys.ts';
import { useToast } from '../components/toast.tsx';

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute('/chats/$chatId')({
  component: ChatThread,
  validateSearch: searchSchema,
  loader: ({ params }) => getChatFn({ data: { chatId: params.chatId } }),
});

function ChatThread() {
  const chat = Route.useLoaderData();
  const search = Route.useSearch();
  const router = useRouter();
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>(chat.messages);
  const [draft, setDraft] = useState(search.q ?? '');
  const [streaming, setStreaming] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useHotkey('/', () => composerRef.current?.focus());
  useHotkey('escape', () => abortRef.current?.abort(), { allowInInputs: true });

  // When a pre-filled draft arrives via ?q=, focus the composer and drop the
  // URL param so reload doesn't re-prime it. Runs once per mount by design.
  const primed = useRef(false);
  useEffect(() => {
    if (primed.current) return;
    primed.current = true;
    if (search.q) {
      composerRef.current?.focus();
      router.navigate({
        to: '/chats/$chatId',
        params: { chatId: chat.id },
        search: {},
        replace: true,
      });
    }
  }, [chat.id, router, search.q]);

  useEffect(() => {
    setMessages(chat.messages);
    setStreaming(null);
  }, [chat.id, chat.messages]);

  async function send() {
    const content = draft.trim();
    if (!content || streaming !== null) return;
    setDraft('');

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
        console.error('[educatr] chat stream failed:', err);
        toast.error("Something interrupted the response. Try again in a moment.");
      }
    } finally {
      abortRef.current = null;
      setStreaming(null);
      await router.invalidate();
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 3rem)' }}>
      <h1 className="chat-title">{chat.title ?? 'Untitled chat'}</h1>

      <div className="thread" style={{ flex: 1 }}>
        {messages.length === 0 && streaming === null && (
          <div className="thread-empty">
            Ask anything to begin — your first question sets the direction.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {streaming !== null && (
          <MessageBubble
            streaming
            message={{
              id: 'streaming',
              chatId: chat.id,
              role: 'assistant',
              content: streaming.length > 0 ? streaming : '',
              createdAt: new Date().toISOString(),
            }}
          />
        )}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          ref={composerRef}
          className="textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything…"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        {streaming !== null ? (
          <button type="button" onClick={cancel} className="btn btn--danger">
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={draft.trim().length === 0}
            className="btn btn--primary"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}

function MessageBubble({ message, streaming }: { message: Message; streaming?: boolean }) {
  const isUser = message.role === 'user';
  const cls = [
    'bubble',
    isUser ? 'bubble--user' : 'bubble--assistant',
    streaming ? 'bubble--streaming' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      <span className="bubble__role">{isUser ? 'You' : 'educatr'}</span>
      <div className="bubble__body">{message.content}</div>
    </div>
  );
}
