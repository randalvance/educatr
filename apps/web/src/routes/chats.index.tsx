import { useState } from 'react';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { createChatFn } from '../server/functions.ts';

export const Route = createFileRoute('/chats/')({
  component: ChatsIndex,
});

const SUGGESTIONS = [
  {
    label: 'Kubernetes ingress',
    prompt:
      'Explain Kubernetes ingress to me like I already know basic networking but have never deployed to k8s.',
  },
  {
    label: 'The Lindy effect',
    prompt:
      'What is the Lindy effect? Give me the intuition, the math if any, and where people get it wrong.',
  },
  {
    label: 'How credit cards actually work',
    prompt: 'Walk me through what happens between tapping my card and the money moving, end to end.',
  },
];

function ChatsIndex() {
  const router = useRouter();
  // Which affordance is currently in flight — used to visually acknowledge
  // the click before the route transition completes. Disables the rest so the
  // user can't fire a second click while a chat is being created.
  const [pending, setPending] = useState<string | null>(null);

  async function startChat(key: string, prompt?: string) {
    if (pending) return;
    setPending(key);
    try {
      const chat = await createChatFn();
      await router.invalidate();
      router.navigate({
        to: '/chats/$chatId',
        params: { chatId: chat.id },
        ...(prompt ? { search: { q: prompt } } : {}),
      });
    } catch (err) {
      console.error('[educatr] create chat failed:', err);
      setPending(null);
    }
    // No finally — navigation unmounts the component; no need to clear state.
  }

  return (
    <div style={{ maxWidth: 680, margin: '10vh 0 0 0' }}>
      <h1
        style={{
          fontSize: 'var(--text-3xl)',
          letterSpacing: '-0.025em',
          lineHeight: 'var(--lh-tight)',
        }}
      >
        What do you want to learn?
      </h1>
      <p className="prose-serif muted" style={{ marginTop: 'var(--space-4)', maxWidth: '52ch' }}>
        Ask a question, follow the thread wherever your curiosity leads. Each chat becomes a
        Topic you can revisit.
      </p>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={() => void startChat('__primary')}
          disabled={pending !== null}
        >
          {pending === '__primary' ? (
            <>
              Starting<span className="spinner-inline" />
            </>
          ) : (
            'Start a new chat →'
          )}
        </button>
      </div>

      <div style={{ marginTop: 'var(--space-7)' }}>
        <p className="meta" style={{ marginBottom: 'var(--space-3)' }}>
          Or try one of these
        </p>
        <ul className="suggestion-list">
          {SUGGESTIONS.map((s) => {
            const isPending = pending === s.label;
            return (
              <li key={s.label}>
                <button
                  type="button"
                  className="suggestion"
                  data-pending={isPending ? 'true' : undefined}
                  onClick={() => void startChat(s.label, s.prompt)}
                  disabled={pending !== null}
                >
                  <span className="suggestion__label">
                    {s.label}
                    {isPending && <span className="spinner-inline" />}
                  </span>
                  <span className="suggestion__prompt">{s.prompt}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
