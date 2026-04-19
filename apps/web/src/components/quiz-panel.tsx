import { useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import type { Quiz } from '@educatr/shared';
import { generateQuizFn } from '../server/functions.ts';
import { useToast } from './toast.tsx';

export function QuizPanel(props: {
  scope: { topicId?: string; groupId?: string };
  quizzes: Quiz[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (busy) return;
    setBusy(true);
    try {
      await generateQuizFn({ data: { ...props.scope, questionCount: 8 } });
      await router.invalidate();
      toast.success('Quiz ready below.');
    } catch (err) {
      console.error('[educatr] quiz generation failed:', err);
      toast.error("Couldn't write the quiz this time. Give it another try.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: '3rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <h3 className="section-heading" style={{ marginTop: 0, marginBottom: 0 }}>
          Quizzes
        </h3>
        <button type="button" onClick={generate} disabled={busy} className="btn btn--primary btn--sm">
          {busy ? 'Generating…' : 'Generate quiz'}
        </button>
      </div>
      {props.quizzes.length === 0 ? (
        <p className="muted">No quizzes yet — make one to test what you've learned.</p>
      ) : (
        <ul className="source-list">
          {props.quizzes.map((q) => (
            <li key={q.id} className="source-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Link to="/quizzes/$quizId" params={{ quizId: q.id }} style={{ fontWeight: 500 }}>
                {q.title}
              </Link>
              <span className="meta">
                {q.questions.length} Qs · {new Date(q.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
