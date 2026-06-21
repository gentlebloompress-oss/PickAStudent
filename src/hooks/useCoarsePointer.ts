import { useEffect, useState } from 'react';

/**
 * True when the primary input is touch (phones, tablets) rather than a mouse —
 * a reliable proxy for "no physical keyboard." Used to hide keyboard-only
 * affordances (shortcut hints, the Shortcuts card) on classroom tablets.
 *
 * Reactive: re-evaluates if the user plugs in a mouse or the device emulation
 * changes.
 */
const QUERY = '(hover: none) and (pointer: coarse)';

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const handler = () => setCoarse(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return coarse;
}
