import { useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import type { Quiz } from '@educatr/shared';
import { generateQuizFn } from '../server/functions.ts';

export function QuizPanel(props: {
  scope: { topicId?: string; groupId?: string };
  quizzes: Quiz[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (busy) return;
    setBusy(true);
    try {
      await generateQuizFn({ data: { ...props.scope, questionCount: 8 } });
      await router.invalidate();
    } catch (err) {
      alert(`Quiz generation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={styles.wrap}>
      <header style={styles.header}>
        <h3 style={{ margin: 0 }}>Quizzes</h3>
        <button type="button" onClick={generate} disabled={busy} style={styles.primary}>
          {busy ? 'Generating…' : 'Generate quiz'}
        </button>
      </header>
      {props.quizzes.length === 0 ? (
        <p style={styles.empty}>No quizzes yet.</p>
      ) : (
        <ul style={styles.list}>
          {props.quizzes.map((q) => (
            <li key={q.id} style={styles.item}>
              <Link to="/quizzes/$quizId" params={{ quizId: q.id }} style={styles.link}>
                {q.title}
              </Link>
              <span style={styles.meta}>
                {q.questions.length} Qs · {new Date(q.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { marginTop: '2rem' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  primary: {
    padding: '0.4rem 0.9rem',
    background: '#224',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  empty: { color: '#888', fontSize: '0.9rem' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #eee',
  },
  link: { color: '#114', textDecoration: 'none', fontWeight: 500 },
  meta: { color: '#888', fontSize: '0.85rem' },
};
