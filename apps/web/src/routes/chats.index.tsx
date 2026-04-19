import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/chats/')({
  component: ChatsIndex,
});

function ChatsIndex() {
  return (
    <div style={{ color: '#666', fontFamily: 'system-ui, sans-serif', maxWidth: 560 }}>
      <h1 style={{ marginTop: 0 }}>Start exploring</h1>
      <p>
        Pick a chat from the sidebar, or hit <b>+ New</b> to begin. Topics, quizzes, and
        flashcards will grow as you chat.
      </p>
    </div>
  );
}
