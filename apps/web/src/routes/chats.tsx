import { Link, Outlet, createFileRoute, useRouter } from '@tanstack/react-router';
import { createChatFn, listChatsFn } from '../server/functions.ts';

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

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <Link to="/" style={styles.brand}>
            educatr
          </Link>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <Link to="/topics" style={{ fontSize: '0.85rem', color: '#555' }}>
              topics
            </Link>
            <button type="button" onClick={handleNewChat} style={styles.newButton}>
              + New
            </button>
          </div>
        </div>
        <nav style={styles.chatList}>
          {chats.length === 0 ? (
            <p style={styles.empty}>No chats yet.</p>
          ) : (
            chats.map((c) => (
              <Link
                key={c.id}
                to="/chats/$chatId"
                params={{ chatId: c.id }}
                style={styles.chatLink}
                activeProps={{ style: { ...styles.chatLink, ...styles.chatLinkActive } }}
              >
                <span style={styles.chatTitle}>{c.title ?? 'Untitled chat'}</span>
                <span style={styles.chatMeta}>
                  {new Date(c.updatedAt).toLocaleDateString()}
                </span>
              </Link>
            ))
          )}
        </nav>
      </aside>
      <section style={styles.main}>
        <Outlet />
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' },
  sidebar: {
    borderRight: '1px solid #eee',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    background: '#fafafa',
  },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontWeight: 600, textDecoration: 'none', color: '#111' },
  newButton: {
    padding: '0.3rem 0.6rem',
    border: '1px solid #ddd',
    borderRadius: 6,
    background: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  chatList: { display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'auto' },
  chatLink: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.5rem 0.6rem',
    borderRadius: 6,
    textDecoration: 'none',
    color: '#333',
  },
  chatLinkActive: { background: '#eef', color: '#114' },
  chatTitle: { fontSize: '0.9rem', fontWeight: 500 },
  chatMeta: { fontSize: '0.75rem', color: '#888' },
  empty: { color: '#888', fontSize: '0.85rem' },
  main: { padding: '1.5rem 2rem', overflow: 'auto' },
};
