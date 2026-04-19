import { Link, Outlet, createFileRoute, useRouter } from '@tanstack/react-router';
import {
  listTopicsFn,
  listTopicGroupsFn,
  recomputeGroupsFn,
} from '../server/functions.ts';

export const Route = createFileRoute('/topics')({
  component: TopicsLayout,
  loader: async () => {
    const [topics, groups] = await Promise.all([listTopicsFn(), listTopicGroupsFn()]);
    return { topics, groups };
  },
});

function TopicsLayout() {
  const { topics, groups } = Route.useLoaderData();
  const router = useRouter();

  async function handleRegroup() {
    await recomputeGroupsFn();
    await router.invalidate();
  }

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <Link to="/" style={styles.brand}>
            educatr
          </Link>
          <Link to="/chats" style={styles.navLink}>
            chats
          </Link>
        </div>

        <div style={styles.sectionHeader}>
          <span>Groups</span>
          <button type="button" style={styles.smallButton} onClick={handleRegroup}>
            Recompute
          </button>
        </div>
        {groups.length === 0 ? (
          <p style={styles.empty}>No groups yet.</p>
        ) : (
          groups.map((g) => (
            <Link
              key={g.id}
              to="/topic-groups/$groupId"
              params={{ groupId: g.id }}
              style={styles.sidebarLink}
              activeProps={{ style: { ...styles.sidebarLink, ...styles.sidebarLinkActive } }}
            >
              {g.title}
            </Link>
          ))
        )}

        <div style={styles.sectionHeader}>Topics</div>
        {topics.length === 0 ? (
          <p style={styles.empty}>Chat to create Topics.</p>
        ) : (
          topics.map((t) => (
            <Link
              key={t.id}
              to="/topics/$topicId"
              params={{ topicId: t.id }}
              style={styles.sidebarLink}
              activeProps={{ style: { ...styles.sidebarLink, ...styles.sidebarLinkActive } }}
            >
              <span style={styles.topicTitle}>{t.title}</span>
              <span style={styles.topicMeta}>{new Date(t.updatedAt).toLocaleDateString()}</span>
            </Link>
          ))
        )}
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
    background: '#fafafa',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    overflow: 'auto',
    fontFamily: 'system-ui, sans-serif',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  brand: { fontWeight: 600, textDecoration: 'none', color: '#111' },
  navLink: { fontSize: '0.85rem', color: '#555', textDecoration: 'none' },
  sectionHeader: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#888',
    marginTop: '1rem',
    marginBottom: '0.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallButton: {
    padding: '0.15rem 0.4rem',
    border: '1px solid #ddd',
    borderRadius: 4,
    background: '#fff',
    cursor: 'pointer',
    fontSize: '0.7rem',
    textTransform: 'none',
    letterSpacing: 0,
  },
  sidebarLink: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.4rem 0.5rem',
    borderRadius: 6,
    textDecoration: 'none',
    color: '#333',
  },
  sidebarLinkActive: { background: '#eef', color: '#114' },
  topicTitle: { fontSize: '0.9rem', fontWeight: 500 },
  topicMeta: { fontSize: '0.7rem', color: '#888' },
  empty: { color: '#888', fontSize: '0.8rem' },
  main: { padding: '1.5rem 2rem', overflow: 'auto', fontFamily: 'system-ui, sans-serif' },
};
