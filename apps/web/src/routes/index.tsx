import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="landing">
      <h1 className="landing__title">Learn anything, on your own terms.</h1>
      <p className="landing__lede">
        Have a real conversation with a patient teacher. Every chat turns into a lesson
        you can revisit, quiz yourself on, or group with related ideas.
      </p>
      <div className="landing__cta">
        <Link to="/chats" className="btn btn--primary btn--lg">
          Start a chat →
        </Link>
        <Link to="/topics" className="btn btn--secondary btn--lg">
          Browse topics
        </Link>
      </div>
    </main>
  );
}
