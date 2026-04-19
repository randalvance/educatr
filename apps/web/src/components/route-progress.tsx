import { useEffect, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';

/**
 * Thin top-of-page progress indicator. Visible while any route is transitioning
 * or loading — but only after a short debounce, so fast navigations don't
 * flicker a bar in and out.
 */
const SHOW_AFTER_MS = 120;
const HIDE_AFTER_MS = 120;

export function RouteProgress() {
  const pending = useRouterState({
    select: (s) => s.status === 'pending' || s.isLoading || s.isTransitioning,
  });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pending) {
      const t = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    return () => clearTimeout(t);
  }, [pending]);

  return (
    <div
      className="route-progress"
      data-active={visible ? 'true' : 'false'}
      aria-hidden="true"
    >
      <div className="route-progress__bar" />
    </div>
  );
}
