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
    <article style={{ maxWidth: 780 }}>
      <p className="meta" style={{ marginBottom: 'var(--space-3)' }}>
        <Link to="/topics">← Topics</Link>
      </p>
      <span className="chip">Group · {topics.length} topics</span>
      <h1 className="topic-title" style={{ marginTop: 'var(--space-3)' }}>
        {group.title}
      </h1>
      <p className="topic-summary">{group.summary}</p>

      <h3 className="section-heading">Topics in this group</h3>
      {topics.length === 0 ? (
        <p className="muted">No Topics in this group yet.</p>
      ) : (
        <ul className="group-member-list">
          {topics.map((t) => (
            <li key={t.id}>
              <Link
                to="/topics/$topicId"
                params={{ topicId: t.id }}
                className="group-member"
              >
                <span className="group-member__title">{t.title}</span>
                <span className="group-member__summary">{t.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <QuizPanel scope={{ groupId: group.id }} quizzes={quizzes} />
    </article>
  );
}
