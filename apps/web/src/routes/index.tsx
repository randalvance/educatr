import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 640,
        margin: '4rem auto',
        padding: '0 1.5rem',
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ marginBottom: '0.5rem' }}>educatr</h1>
      <p style={{ color: '#555' }}>Learn anything. Explore topics with AI.</p>
      <p style={{ marginTop: '2rem', color: '#888', fontSize: '0.9rem' }}>
        Scaffold up. Chat, topics, quizzes, flashcards, and visual explainers coming next.
      </p>
    </main>
  );
}
