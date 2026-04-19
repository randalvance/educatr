import { useEffect, useState } from 'react';
import { readTheme, writeTheme, type ThemePreference } from '../lib/theme.ts';

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];
const LABEL: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

export function ThemeToggle() {
  // Starts as 'system' on SSR; hydrates to the real value after mount to avoid
  // a server/client mismatch on the button label.
  const [pref, setPref] = useState<ThemePreference>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPref(readTheme());
    setMounted(true);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length]!;
    setPref(next);
    writeTheme(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="theme-toggle"
      title="Change theme"
      aria-label={`Theme: ${LABEL[pref]}. Click to cycle.`}
    >
      <span className="theme-toggle__label">Theme</span>
      <span className="theme-toggle__value">
        {mounted ? LABEL[pref] : LABEL.system}
      </span>
    </button>
  );
}
