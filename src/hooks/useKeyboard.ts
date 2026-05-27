import { useEffect } from 'react';

type Handler = (e: KeyboardEvent) => void;

/**
 * Bind a keyboard shortcut. Skips when focus is in inputs/contenteditable
 * so typing in the class manager doesn't trigger Pick.
 */
export function useKey(key: string | string[], handler: Handler, opts: { enabled?: boolean } = {}) {
  const { enabled = true } = opts;
  useEffect(() => {
    if (!enabled) return;
    const keys = Array.isArray(key) ? key : [key];
    const norm = keys.map((k) => k.toLowerCase());
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      const k = e.key.toLowerCase();
      if (norm.includes(k) || norm.includes(e.code.toLowerCase())) handler(e);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, handler, enabled]);
}
