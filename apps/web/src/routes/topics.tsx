import { useState } from 'react';
import { Link, Outlet, createFileRoute, useRouter } from '@tanstack/react-router';
import {
  listTopicsFn,
  listTopicGroupsFn,
  recomputeGroupsFn,
} from '../server/functions.ts';
import { ThemeToggle } from '../components/theme-toggle.tsx';
import { useToast } from '../components/toast.tsx';

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
  const toast = useToast();
  const [finding, setFinding] = useState(false);

  async function handleRegroup() {
    if (finding) return;
    setFinding(true);
    try {
      const { groupsCreated } = await recomputeGroupsFn();
      await router.invalidate();
      toast.success(
        groupsCreated === 0
          ? 'No new groups found yet — add a few more Topics and try again.'
          : `Made ${groupsCreated} group${groupsCreated === 1 ? '' : 's'}.`,
      );
    } catch (err) {
      console.error('[educatr] find groups failed:', err);
      toast.error("Couldn't find groups right now. Give it a moment and try again.");
    } finally {
      setFinding(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__header">
          <Link to="/" className="sidebar__brand">
            educatr
          </Link>
          <nav className="sidebar__nav-links">
            <Link to="/chats">Chats</Link>
          </nav>
        </div>

        <div className="sidebar__section">
          <span>Groups</span>
          {topics.length >= 2 && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleRegroup}
              disabled={finding}
              title="Find related Topics and group them together. Run again after you've added new material."
            >
              {finding ? 'Finding…' : 'Find groups'}
            </button>
          )}
        </div>
        {groups.length === 0 ? (
          <p className="sidebar__empty">
            {topics.length < 2
              ? 'Groups appear once you have a few Topics.'
              : 'No groups yet — use Find groups to collect related Topics.'}
          </p>
        ) : (
          groups.map((g) => (
            <Link
              key={g.id}
              to="/topic-groups/$groupId"
              params={{ groupId: g.id }}
              className="sidebar__link"
              activeProps={{ className: 'sidebar__link sidebar__link--active' }}
            >
              <span className="sidebar__link-title">{g.title}</span>
            </Link>
          ))
        )}

        <div className="sidebar__section">Topics</div>
        {topics.length === 0 ? (
          <p className="sidebar__empty">
            Start a chat — Topics show up here on their own.
          </p>
        ) : (
          topics.map((t) => (
            <Link
              key={t.id}
              to="/topics/$topicId"
              params={{ topicId: t.id }}
              className="sidebar__link"
              activeProps={{ className: 'sidebar__link sidebar__link--active' }}
            >
              <span className="sidebar__link-title">{t.title}</span>
              <span className="sidebar__link-meta">
                {new Date(t.updatedAt).toLocaleDateString()}
              </span>
            </Link>
          ))
        )}

        <div className="sidebar__footer">
          <ThemeToggle />
        </div>
      </aside>
      <section className="main">
        <Outlet />
      </section>
    </div>
  );
}
