import type { PersistedState } from '../types';

/**
 * Tiny localStorage wrapper. Wrapped so we can swap to IndexedDB later
 * without touching call sites — just keep the same get/set/remove signature.
 */

const KEY = 'pickastudent:v1';

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1) return parsed as PersistedState;
    return null;
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function saveState(state: PersistedState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to persist state', err);
    }
  }, 120);
}

export function clearAllState() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function exportJSON(state: Pick<PersistedState, 'classes' | 'classStates'>): string {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text: string): { classes: PersistedState['classes']; classStates?: PersistedState['classStates'] } | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.classes)) return parsed;
    return null;
  } catch {
    return null;
  }
}
