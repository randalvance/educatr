import { useEffect } from 'react';

/**
 * Bind a global hotkey. Ignored while the user is typing in an input, textarea,
 * or contenteditable element (unless `allowInInputs` is true).
 *
 * `keys` accepts any mix of: 'mod+enter', 'shift+/', '/', 'escape', 'n'.
 * 'mod' matches Cmd on macOS and Ctrl elsewhere.
 */
export interface HotkeyOptions {
  allowInInputs?: boolean;
  preventDefault?: boolean;
}

export function useHotkey(
  keys: string | string[],
  handler: (e: KeyboardEvent) => void,
  opts: HotkeyOptions = {},
) {
  useEffect(() => {
    const defs = (Array.isArray(keys) ? keys : [keys]).map(parseHotkey);

    function onKey(e: KeyboardEvent) {
      if (!opts.allowInInputs && isTypingTarget(e.target)) return;
      for (const def of defs) {
        if (matches(def, e)) {
          if (opts.preventDefault !== false) e.preventDefault();
          handler(e);
          return;
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys, handler, opts.allowInInputs, opts.preventDefault]);
}

interface ParsedHotkey {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

function parseHotkey(combo: string): ParsedHotkey {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1] ?? '';
  return {
    key,
    mod: parts.includes('mod') || parts.includes('cmd') || parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
  };
}

function matches(def: ParsedHotkey, e: KeyboardEvent): boolean {
  const isMac =
    typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);
  const modPressed = isMac ? e.metaKey : e.ctrlKey;
  if (def.mod !== modPressed) return false;
  if (def.shift !== e.shiftKey) return false;
  if (def.alt !== e.altKey) return false;
  const k = e.key.toLowerCase();
  return k === def.key || (def.key === 'escape' && k === 'esc');
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  );
}
