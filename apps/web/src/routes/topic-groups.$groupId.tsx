import { Link, createFileRoute } from '@tanstack/react-router';
import { getTopicGroupFn, listQuizzesFn } from '../server/functions.ts';
import { QuizPanel } from '../components/quiz-panel.tsx';

export const Route = createFileRoute('/topic-groups/$groupId')({
  component: TopicGroupDetail,
  loader: async ({ params }) => {
    const [detail, quizzes] = await Promise.all([
      getTopicGroupFn({ data: { groupId: params.groupId } }),
      listQuizzesFn({ data: { groupId: params.groupId } }),
    ]);
    return { ...detail, quizzes };
  },
});

function TopicGroupDetail() {
  const { group, topics, quizzes } = Route.useLoaderData();

  return (
    <article
      style={{
        maxWidth: 760,
        fontFamily: 'system-ui, sans-serif',
        padding: '1.5rem 2rem',
      }}
    >
      <p style={{ fontSize: '0.85rem', color: '#888' }}>
        <Link to="/topics">← back to topics</Link>
      </p>
      <h1 style={{ marginTop: '0.5rem' }}>{group.title}</h1>
      <p style={{ color: '#555' }}>{group.summary}</p>

      <h3 style={{ marginTop: '2rem' }}>Topics in this group</h3>
      {topics.length === 0 ? (
        <p style={{ color: '#888' }}>No topics yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {topics.map((t) => (
            <li
              key={t.id}
              style={{ borderBottom: '1px solid #eee', padding: '0.75rem 0' }}
            >
              <Link
                to="/topics/$topicId"
                params={{ topicId: t.id }}
                style={{ color: '#114', fontWeight: 500, textDecoration: 'none' }}
              >
                {t.title}
              </Link>
              <p style={{ color: '#555', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                {t.summary}
              </p>
            </li>
          ))}
        </ul>
      )}

      <QuizPanel scope={{ groupId: group.id }} quizzes={quizzes} />

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          border: '1px dashed #ccc',
          borderRadius: 8,
        }}
      >
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          Flashcards and visual explainers for this group arrive in Phases 10–11.
        </p>
      </div>
    </article>
  );
}
