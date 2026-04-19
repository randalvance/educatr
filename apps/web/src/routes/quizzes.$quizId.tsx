import { useMemo, useState } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import type { QuizQuestion } from '@educatr/shared';
import { getQuizFn } from '../server/functions.ts';

export const Route = createFileRoute('/quizzes/$quizId')({
  component: QuizPlay,
  loader: ({ params }) => getQuizFn({ data: { quizId: params.quizId } }),
});

type Answer = string | number | boolean | null;

function QuizPlay() {
  const quiz = Route.useLoaderData();
  const [answers, setAnswers] = useState<Answer[]>(() =>
    quiz.questions.map(() => null as Answer),
  );
  const [submitted, setSubmitted] = useState(false);

  const graded = useMemo(() => {
    if (!submitted) return null;
    return gradeOnClient(quiz.questions, answers);
  }, [submitted, quiz.questions, answers]);

  const allAnswered = answers.every((a) => a !== null && a !== '');

  return (
    <article style={styles.wrap}>
      <p style={styles.back}>
        <Link to="/topics">← back to topics</Link>
      </p>
      <h1 style={{ marginTop: '0.5rem' }}>{quiz.title}</h1>
      {graded && (
        <div style={styles.scoreBox}>
          Score: <b>{graded.correct}</b> / {graded.total}
        </div>
      )}

      <ol style={styles.list}>
        {quiz.questions.map((q, i) => (
          <li key={i} style={styles.item}>
            <QuestionRow
              q={q}
              answer={answers[i] ?? null}
              onChange={(a) => {
                setAnswers((prev) => {
                  const next = [...prev];
                  next[i] = a;
                  return next;
                });
              }}
              submitted={submitted}
              resultCorrect={graded?.results[i]?.correct}
            />
          </li>
        ))}
      </ol>

      <div style={{ marginTop: '1.5rem' }}>
        {submitted ? (
          <button
            type="button"
            style={styles.secondary}
            onClick={() => {
              setSubmitted(false);
              setAnswers(quiz.questions.map(() => null as Answer));
            }}
          >
            Retake
          </button>
        ) : (
          <button
            type="button"
            style={styles.primary}
            disabled={!allAnswered}
            onClick={() => setSubmitted(true)}
          >
            Submit
          </button>
        )}
      </div>
    </article>
  );
}

function QuestionRow(props: {
  q: QuizQuestion;
  answer: Answer;
  onChange: (a: Answer) => void;
  submitted: boolean;
  resultCorrect: boolean | undefined;
}) {
  const { q, answer, onChange, submitted, resultCorrect } = props;
  const bodyStyle: React.CSSProperties = {
    ...styles.questionBody,
    ...(submitted
      ? resultCorrect
        ? styles.correct
        : styles.incorrect
      : {}),
  };

  return (
    <div style={bodyStyle}>
      <p style={styles.prompt}>{q.prompt}</p>

      {q.type === 'multiple_choice' &&
        q.choices.map((choice, i) => (
          <label key={i} style={styles.choice}>
            <input
              type="radio"
              name={q.prompt}
              checked={answer === i}
              onChange={() => onChange(i)}
              disabled={submitted}
            />
            {choice}
          </label>
        ))}

      {q.type === 'true_false' && (
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[true, false].map((v) => (
            <label key={String(v)} style={styles.choice}>
              <input
                type="radio"
                name={q.prompt}
                checked={answer === v}
                onChange={() => onChange(v)}
                disabled={submitted}
              />
              {v ? 'True' : 'False'}
            </label>
          ))}
        </div>
      )}

      {q.type === 'short_answer' && (
        <input
          type="text"
          value={typeof answer === 'string' ? answer : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={submitted}
          style={styles.textInput}
          placeholder="Type your answer"
        />
      )}

      {submitted && q.explanation && <p style={styles.explanation}>{q.explanation}</p>}
    </div>
  );
}

function gradeOnClient(
  questions: QuizQuestion[],
  answers: Answer[],
): { correct: number; total: number; results: Array<{ correct: boolean }> } {
  const results = questions.map((q, i) => {
    const a = answers[i];
    switch (q.type) {
      case 'multiple_choice':
        return { correct: typeof a === 'number' && a === q.correctIndex };
      case 'true_false':
        return { correct: typeof a === 'boolean' && a === q.correctAnswer };
      case 'short_answer': {
        const n = typeof a === 'string' ? a.trim().toLowerCase() : '';
        return {
          correct: q.acceptedAnswers.some((acc) => acc.trim().toLowerCase() === n),
        };
      }
    }
  });
  return {
    correct: results.filter((r) => r.correct).length,
    total: questions.length,
    results,
  };
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 720, margin: '0 auto', fontFamily: 'system-ui, sans-serif', padding: '1.5rem 2rem' },
  back: { fontSize: '0.85rem', color: '#888' },
  scoreBox: {
    background: '#eef',
    padding: '0.75rem 1rem',
    borderRadius: 8,
    marginTop: '1rem',
    fontSize: '1rem',
  },
  list: { listStyle: 'none', padding: 0, marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  item: {},
  questionBody: {
    padding: '1rem',
    border: '1px solid #eee',
    borderRadius: 8,
    background: '#fff',
  },
  correct: { borderColor: '#7c7', background: '#f3fbf3' },
  incorrect: { borderColor: '#c77', background: '#fbf3f3' },
  prompt: { margin: 0, marginBottom: '0.5rem', fontWeight: 500 },
  choice: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' },
  textInput: {
    width: '100%',
    padding: '0.4rem 0.6rem',
    border: '1px solid #ccc',
    borderRadius: 6,
    fontFamily: 'inherit',
  },
  explanation: {
    marginTop: '0.5rem',
    color: '#555',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
  primary: {
    padding: '0.5rem 1rem',
    background: '#224',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  secondary: {
    padding: '0.5rem 1rem',
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
