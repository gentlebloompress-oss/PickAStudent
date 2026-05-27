import type { ClassState, Settings, Student, StudentId } from '../types';

/**
 * Picker engine — pure functions, no React, no DOM. Drives all four modes.
 *
 * Selection rules:
 *  - Excluded students are never picked.
 *  - "No-repeat" mode filters out students already picked in the current cycle;
 *    when the eligible pool empties, the cycle auto-resets.
 *  - "Fair mode" weights selection inversely to call count.
 *  - "Come back" queue gets first dibs once enough picks have elapsed.
 *
 * Extending to new modes (bingo, bracket, slot machine) — pick a winner from
 * `eligibleStudents()` and call `recordPick()` to update history. The UI layer
 * decides the animation; the engine just decides who.
 */

const COMEBACK_DELAY_PICKS = 2;

export function eligibleStudents(students: Student[], state: ClassState, noRepeat: boolean): Student[] {
  let pool = students.filter((s) => !s.excluded);
  if (noRepeat && state.cycleSeen.length > 0) {
    const seen = new Set(state.cycleSeen);
    const remaining = pool.filter((s) => !seen.has(s.id));
    // Auto-reset cycle when exhausted.
    if (remaining.length > 0) pool = remaining;
  }
  return pool;
}

function dueComeBack(state: ClassState): StudentId | null {
  const due = state.comeBackQueue.find((q) => state.pickIndex - q.pickIndex >= COMEBACK_DELAY_PICKS);
  return due ? due.studentId : null;
}

function weightedRandom(pool: Student[], weightFor: (s: Student) => number): Student {
  const weights = pool.map(weightFor);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pool[Math.floor(Math.random() * pool.length)];
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * Choose the next student. Returns null only if there are zero eligible students.
 * Honors fair mode, no-repeat, exclusions, and the come-back queue.
 */
export function pickNext(
  students: Student[],
  state: ClassState,
  settings: Pick<Settings, 'fairMode' | 'noRepeatMode'>
): Student | null {
  // Come-back queue takes priority once the delay has elapsed.
  const dueId = dueComeBack(state);
  if (dueId) {
    const found = students.find((s) => s.id === dueId && !s.excluded);
    if (found) return found;
  }

  const pool = eligibleStudents(students, state, settings.noRepeatMode);
  if (pool.length === 0) return null;

  // Don't immediately re-pick a student who's currently in the come-back queue
  // (unless that's the only option) — gives the room some breathing space.
  const queued = new Set(state.comeBackQueue.map((q) => q.studentId));
  const filtered = pool.filter((s) => !queued.has(s.id));
  const finalPool = filtered.length > 0 ? filtered : pool;

  if (settings.fairMode) {
    const counts = finalPool.map((s) => state.callCounts[s.id] ?? 0);
    const max = Math.max(...counts);
    return weightedRandom(finalPool, (s) => (max - (state.callCounts[s.id] ?? 0)) + 1);
  }

  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

/** Pick N distinct students for group picking. */
export function pickGroup(
  students: Student[],
  state: ClassState,
  settings: Pick<Settings, 'fairMode' | 'noRepeatMode'>,
  n: number
): Student[] {
  const picked: Student[] = [];
  // Build a working copy of the state so successive picks see the prior ones
  // as already-seen during this group draw (prevents duplicates within the group).
  let working: ClassState = { ...state, cycleSeen: [...state.cycleSeen] };
  for (let i = 0; i < n; i++) {
    const next = pickNext(students.filter((s) => !picked.find((p) => p.id === s.id)), working, settings);
    if (!next) break;
    picked.push(next);
    working = { ...working, cycleSeen: [...working.cycleSeen, next.id] };
  }
  return picked;
}

/** Update state after a pick, given the chosen outcome. */
export function recordPick(
  state: ClassState,
  studentIds: StudentId[],
  outcome: 'answered' | 'pass' | 'comeback'
): ClassState {
  const next: ClassState = {
    ...state,
    callCounts: { ...state.callCounts },
    cycleSeen: [...state.cycleSeen],
    comeBackQueue: state.comeBackQueue.filter((q) => !studentIds.includes(q.studentId)),
    pickIndex: state.pickIndex + 1,
    history: [{ studentIds, outcome, ts: Date.now() }, ...state.history].slice(0, 50),
    recentTeams: state.recentTeams,
  };

  if (outcome === 'pass') {
    // Pass does not increment call count; also doesn't consume the no-repeat slot.
    return next;
  }

  for (const id of studentIds) {
    next.callCounts[id] = (next.callCounts[id] ?? 0) + 1;
    if (!next.cycleSeen.includes(id)) next.cycleSeen.push(id);
  }

  if (outcome === 'comeback') {
    for (const id of studentIds) {
      next.comeBackQueue = [...next.comeBackQueue, { studentId: id, pickIndex: next.pickIndex }];
    }
  }

  return next;
}

/** Undo the most recent pick event. Best-effort: walks the history. */
export function undoLastPick(state: ClassState): ClassState {
  const [last, ...rest] = state.history;
  if (!last) return state;
  const next: ClassState = {
    ...state,
    callCounts: { ...state.callCounts },
    cycleSeen: state.cycleSeen.filter((id) => !last.studentIds.includes(id)),
    comeBackQueue: state.comeBackQueue.filter((q) => !last.studentIds.includes(q.studentId)),
    pickIndex: Math.max(0, state.pickIndex - 1),
    history: rest,
    recentTeams: state.recentTeams,
  };
  if (last.outcome !== 'pass') {
    for (const id of last.studentIds) {
      next.callCounts[id] = Math.max(0, (next.callCounts[id] ?? 0) - 1);
    }
  }
  return next;
}

export function resetCounts(state: ClassState): ClassState {
  return {
    callCounts: {},
    cycleSeen: [],
    comeBackQueue: [],
    pickIndex: 0,
    history: [],
    recentTeams: state.recentTeams,
  };
}

export function freshClassState(): ClassState {
  return {
    callCounts: {},
    cycleSeen: [],
    comeBackQueue: [],
    pickIndex: 0,
    history: [],
    recentTeams: [],
  };
}

export function summarizeCounts(students: Student[], state: ClassState) {
  const active = students.filter((s) => !s.excluded);
  if (active.length === 0) return { mostCalled: null, neverCalled: 0, max: 0 };
  let max = 0;
  let topId: StudentId | null = null;
  let neverCalled = 0;
  for (const s of active) {
    const c = state.callCounts[s.id] ?? 0;
    if (c > max) { max = c; topId = s.id; }
    if (c === 0) neverCalled++;
  }
  const mostCalled = topId ? active.find((s) => s.id === topId) ?? null : null;
  return { mostCalled, neverCalled, max };
}
