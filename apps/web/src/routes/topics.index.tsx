import { Link, createFileRoute } from '@tanstack/react-router';
import { listTopicsFn } from '../server/functions.ts';

export const Route = createFileRoute('/topics/')({
  component: TopicsIndex,
  loader: () => listTopicsFn(),
});

function TopicsIndex() {
  const topics = Route.useLoaderData();
  const hasTopics = topics.length > 0;

  if (!hasTopics) {
    return (
      <div style={{ maxWidth: 640, margin: '10vh 0 0 0' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', letterSpacing: '-0.025em', lineHeight: 'var(--lh-tight)' }}>
          No Topics yet.
        </h1>
        <p
          className="prose-serif muted"
          style={{ marginTop: 'var(--space-4)', maxWidth: '52ch' }}
        >
          A Topic is a short, standalone lesson written from something you chatted
          about. Start a conversation — Topics will show up here on their own.
        </p>
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Link to="/chats" className="btn btn--primary btn--lg">
            Start a chat →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '10vh 0 0 0' }}>
      <h1 style={{ fontSize: 'var(--text-3xl)', letterSpacing: '-0.025em', lineHeight: 'var(--lh-tight)' }}>
        Your library.
      </h1>
      <p
        className="prose-serif muted"
        style={{ marginTop: 'var(--space-4)', maxWidth: '52ch' }}
      >
        Pick a Topic from the left to read it, make a quiz, or jump back to the
        chat it came from.
      </p>
    </div>
  );
}
