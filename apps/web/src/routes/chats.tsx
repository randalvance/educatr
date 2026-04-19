import { Link, Outlet, createFileRoute, useRouter } from '@tanstack/react-router';
import { createChatFn, listChatsFn } from '../server/functions.ts';
import { ThemeToggle } from '../components/theme-toggle.tsx';
import { useHotkey } from '../lib/hotkeys.ts';

export const Route = createFileRoute('/chats')({
  component: ChatsLayout,
  loader: () => listChatsFn(),
});

function ChatsLayout() {
  const chats = Route.useLoaderData();
  const router = useRouter();

  async function handleNewChat() {
    const chat = await createChatFn();
    await router.invalidate();
    router.navigate({ to: '/chats/$chatId', params: { chatId: chat.id } });
  }

  // ⌘N / Ctrl+N creates a new chat from anywhere in /chats.
  useHotkey('mod+k', () => void handleNewChat());

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__header">
          <Link to="/" className="sidebar__brand">
            educatr
          </Link>
          <nav className="sidebar__nav-links">
            <Link to="/topics">Topics</Link>
          </nav>
        </div>

        <button type="button" onClick={handleNewChat} className="new-chat-button">
          <span>+ New chat</span>
          <span className="new-chat-button__kbd">⌘K</span>
        </button>

        <div className="sidebar__section">Chats</div>
        {chats.length === 0 ? (
          <p className="sidebar__empty">No chats yet.</p>
        ) : (
          chats.map((c) => (
            <Link
              key={c.id}
              to="/chats/$chatId"
              params={{ chatId: c.id }}
              className="sidebar__link"
              activeProps={{ className: 'sidebar__link sidebar__link--active' }}
            >
              <span className="sidebar__link-title">{c.title ?? 'Untitled chat'}</span>
              <span className="sidebar__link-meta">
                {new Date(c.updatedAt).toLocaleDateString()}
              </span>
            </Link>
          ))
        )}

        <div className="sidebar__footer">
          <ThemeToggle />
        </div>
      </aside>
      <section className="main main--narrow">
        <Outlet />
      </section>
    </div>
  );
}
