import { Link, createFileRoute } from '@tanstack/react-router';

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
      <p style={{ marginTop: '2rem' }}>
        <Link
          to="/chats"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1rem',
            background: '#224',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Open chats →
        </Link>
      </p>
    </main>
  );
}
