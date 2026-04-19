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
    <article style={{ maxWidth: 760 }}>
      {editing ? (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.titleInput}
          />
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            style={styles.textInput}
            placeholder="Summary"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={18}
            style={styles.textInput}
            placeholder="Body (markdown)"
          />
          <div style={styles.actions}>
            <button type="button" onClick={save} style={styles.primary}>
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} style={styles.secondary}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <header style={styles.header}>
            <div>
              <h1 style={{ margin: 0 }}>{topic.title}</h1>
              <p style={styles.meta}>
                Updated {new Date(topic.updatedAt).toLocaleString()}
                {topic.groupId ? (
                  <>
                    {' · '}
                    <Link to="/topic-groups/$groupId" params={{ groupId: topic.groupId }}>
                      in a group
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
            <div style={styles.actions}>
              <button type="button" onClick={() => setEditing(true)} style={styles.secondary}>
                Edit
              </button>
              <button type="button" onClick={remove} style={styles.danger}>
                Delete
              </button>
            </div>
          </header>

          {topic.tags.length > 0 && (
            <div style={styles.tags}>
              {topic.tags.map((t) => (
                <span key={t} style={styles.tag}>
                  {t}
                </span>
              ))}
            </div>
          )}

          <p style={styles.summary}>{topic.summary}</p>

          <pre style={styles.body}>{topic.bodyMarkdown}</pre>

          <QuizPanel scope={{ topicId: topic.id }} quizzes={quizzes} />

          <section style={{ marginTop: '2rem' }}>
            <h3>Sources</h3>
            {sources.length === 0 ? (
              <p style={{ color: '#888' }}>No source messages linked.</p>
            ) : (
              <ul style={styles.sourceList}>
                {sources.map((s) => (
                  <li key={s.messageId} style={styles.sourceItem}>
                    <Link
                      to="/chats/$chatId"
                      params={{ chatId: s.chatId }}
                      style={styles.sourceLink}
                    >
                      {new Date(s.createdAt).toLocaleString()}
                    </Link>
                    <p style={styles.sourceSnippet}>{s.content.slice(0, 200)}…</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  meta: { color: '#888', fontSize: '0.85rem', margin: '0.25rem 0 0' },
  tags: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' },
  tag: {
    background: '#eef',
    color: '#225',
    padding: '0.15rem 0.5rem',
    borderRadius: 12,
    fontSize: '0.75rem',
  },
  summary: { color: '#444', marginTop: '1rem', lineHeight: 1.5 },
  body: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    background: '#fafafa',
    padding: '1rem',
    borderRadius: 8,
    border: '1px solid #eee',
    lineHeight: 1.5,
    marginTop: '1rem',
  },
  actions: { display: 'flex', gap: '0.5rem' },
  primary: {
    padding: '0.4rem 0.9rem',
    background: '#224',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  secondary: {
    padding: '0.4rem 0.9rem',
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: 6,
    cursor: 'pointer',
  },
  danger: {
    padding: '0.4rem 0.9rem',
    background: '#fff',
    border: '1px solid #c00',
    color: '#c00',
    borderRadius: 6,
    cursor: 'pointer',
  },
  titleInput: {
    width: '100%',
    padding: '0.5rem',
    fontSize: '1.3rem',
    border: '1px solid #ccc',
    borderRadius: 6,
    marginBottom: '0.5rem',
  },
  textInput: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    marginBottom: '0.5rem',
  },
  sourceList: { listStyle: 'none', padding: 0, margin: 0 },
  sourceItem: { borderBottom: '1px solid #eee', padding: '0.5rem 0' },
  sourceLink: { color: '#225', fontSize: '0.85rem', textDecoration: 'none' },
  sourceSnippet: { color: '#555', fontSize: '0.85rem', margin: '0.25rem 0 0' },
};
