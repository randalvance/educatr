import { useState } from 'react';
import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import {
  deleteTopicFn,
  getTopicFn,
  listQuizzesFn,
  updateTopicFn,
} from '../server/functions.ts';
import { QuizPanel } from '../components/quiz-panel.tsx';

export const Route = createFileRoute('/topics/$topicId')({
  component: TopicDetail,
  loader: async ({ params }) => {
    const [detail, quizzes] = await Promise.all([
      getTopicFn({ data: { topicId: params.topicId } }),
      listQuizzesFn({ data: { topicId: params.topicId } }),
    ]);
    return { ...detail, quizzes };
  },
});

function TopicDetail() {
  const { topic, sources, quizzes } = Route.useLoaderData();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(topic.title);
  const [summary, setSummary] = useState(topic.summary);
  const [body, setBody] = useState(topic.bodyMarkdown);

  async function save() {
    await updateTopicFn({
      data: { id: topic.id, title, summary, bodyMarkdown: body },
    });
    setEditing(false);
    await router.invalidate();
  }

  async function remove() {
    if (!confirm(`Delete "${topic.title}"? This cannot be undone.`)) return;
    await deleteTopicFn({ data: { topicId: topic.id } });
    router.navigate({ to: '/topics' });
  }

  return (
    <article style={{ maxWidth: 780 }}>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input input--title"
          />
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            className="textarea"
            placeholder="A short summary — one or two sentences."
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={18}
            className="textarea"
            placeholder="The lesson itself. Markdown works here."
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={save} className="btn btn--primary">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn btn--secondary">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <header className="topic-header">
            <div>
              {topic.groupId && (
                <Link
                  to="/topic-groups/$groupId"
                  params={{ groupId: topic.groupId }}
                  className="chip"
                  style={{ marginBottom: '0.75rem' }}
                >
                  Part of a group
                </Link>
              )}
              <h1 className="topic-title">{topic.title}</h1>
              <p className="meta" style={{ marginTop: '0.5rem' }}>
                Updated {new Date(topic.updatedAt).toLocaleString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setEditing(true)} className="btn btn--secondary">
                Edit
              </button>
              <button type="button" onClick={remove} className="btn btn--danger">
                Delete
              </button>
            </div>
          </header>

          {topic.tags.length > 0 && (
            <div className="tag-list" style={{ marginTop: '1rem' }}>
              {topic.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}

          <p className="topic-summary">{topic.summary}</p>

          <pre className="topic-body">{topic.bodyMarkdown}</pre>

          <QuizPanel scope={{ topicId: topic.id }} quizzes={quizzes} />

          <h3 className="section-heading">Sources</h3>
          {sources.length === 0 ? (
            <p className="muted">No source messages yet.</p>
          ) : (
            <ul className="source-list">
              {sources.map((s) => (
                <li key={s.messageId} className="source-item">
                  <Link to="/chats/$chatId" params={{ chatId: s.chatId }} className="meta">
                    {new Date(s.createdAt).toLocaleString()}
                  </Link>
                  <p className="source-snippet">{s.content.slice(0, 200)}…</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}
