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
    <article className="main main--narrow" style={{ maxWidth: 720 }}>
      <p className="meta" style={{ marginBottom: '0.5rem' }}>
        <Link to="/topics">← Topics</Link>
      </p>
      <span className="chip">Quiz</span>
      <h1 className="topic-title" style={{ marginTop: '0.75rem' }}>
        {quiz.title}
      </h1>
      {graded && (
        <div className="score-box">
          {graded.correct} / {graded.total} correct
        </div>
      )}

      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          marginTop: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {quiz.questions.map((q, i) => (
          <li key={i}>
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

      <div style={{ marginTop: '2rem' }}>
        {submitted ? (
          <button
            type="button"
            className="btn btn--secondary"
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
            className="btn btn--primary btn--lg"
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
  const cls = [
    'quiz-question',
    submitted
      ? resultCorrect
        ? 'quiz-question--correct'
        : 'quiz-question--incorrect'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      <p className="quiz-question__prompt">{q.prompt}</p>

      {q.type === 'multiple_choice' &&
        q.choices.map((choice, i) => (
          <label key={i} className="quiz-question__choice">
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
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {[true, false].map((v) => (
            <label key={String(v)} className="quiz-question__choice">
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
          className="input"
          placeholder="Type your answer"
        />
      )}

      {submitted && q.explanation && (
        <p className="quiz-question__explanation">{q.explanation}</p>
      )}
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
