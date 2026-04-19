import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/topics/')({
  component: TopicsIndex,
});

function TopicsIndex() {
  return (
    <div style={{ color: '#666', maxWidth: 560 }}>
      <h1 style={{ marginTop: 0 }}>Topics</h1>
      <p>
        Pick a topic from the sidebar to see its lesson, or click <b>Recompute</b> to cluster
        related topics into groups.
      </p>
    </div>
  );
}
