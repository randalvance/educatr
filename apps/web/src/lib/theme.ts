export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'educatr_theme';

/**
 * Inline script string injected into `<head>` so the user's chosen theme is
 * applied BEFORE first paint, avoiding a flash of wrong theme.
 *
 * Reads the preference from localStorage (falls back to no-attr, which lets
 * the CSS `prefers-color-scheme` media query take over).
 */
export const applyThemeScript = `
(function () {
  try {
    var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch (e) {}
})();
`.trim();

export function readTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function writeTheme(pref: ThemePreference): void {
  if (typeof window === 'undefined') return;
  const html = document.documentElement;
  try {
    if (pref === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY);
      html.removeAttribute('data-theme');
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
      html.setAttribute('data-theme', pref);
    }
  } catch {
    // ignore storage failures
  }
}
