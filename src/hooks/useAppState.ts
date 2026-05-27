import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ClassId, ClassState, Klass, PersistedState, PickerMode, Settings, Student, StudentId } from '../types';
import { freshClassState, recordPick, resetCounts, undoLastPick } from '../lib/pickerEngine';
import { rememberTeams } from '../lib/teamSplitter';
import { loadState, saveState } from '../lib/storage';
import { uid } from '../lib/ids';
import { makeSampleClass } from '../data/sampleClass';

const DEFAULT_SETTINGS: Settings = {
  fairMode: false,
  noRepeatMode: false,
  sound: 'ding',
  soundEnabled: true,
  animationSpeed: 'normal',
  theme: 'light',
  fontSize: 'large',
  groupSize: 1,
  confetti: true,
};

function initialState(): PersistedState {
  const persisted = loadState();
  if (persisted) return persisted;
  const sample = makeSampleClass();
  return {
    classes: [sample],
    classStates: { [sample.id]: freshClassState() },
    currentClassId: sample.id,
    mode: 'standard',
    settings: DEFAULT_SETTINGS,
    version: 1,
  };
}

type Action =
  | { type: 'set-mode'; mode: PickerMode }
  | { type: 'set-current'; classId: ClassId | null }
  | { type: 'add-class'; klass: Klass }
  | { type: 'rename-class'; classId: ClassId; name: string }
  | { type: 'delete-class'; classId: ClassId }
  | { type: 'add-students'; classId: ClassId; names: string[] }
  | { type: 'remove-student'; classId: ClassId; studentId: StudentId }
  | { type: 'rename-student'; classId: ClassId; studentId: StudentId; name: string }
  | { type: 'toggle-exclude'; classId: ClassId; studentId: StudentId }
  | { type: 'set-all-included'; classId: ClassId; included: boolean }
  | { type: 'record-pick'; classId: ClassId; studentIds: StudentId[]; outcome: 'answered' | 'pass' | 'comeback' }
  | { type: 'undo-pick'; classId: ClassId }
  | { type: 'reset-counts'; classId: ClassId }
  | { type: 'remember-teams'; classId: ClassId; teams: Student[][] }
  | { type: 'update-settings'; patch: Partial<Settings> }
  | { type: 'replace-state'; next: PersistedState };

function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case 'set-mode':
      return { ...state, mode: action.mode };
    case 'set-current':
      return { ...state, currentClassId: action.classId };
    case 'add-class': {
      return {
        ...state,
        classes: [...state.classes, action.klass],
        classStates: { ...state.classStates, [action.klass.id]: freshClassState() },
        currentClassId: action.klass.id,
      };
    }
    case 'rename-class':
      return { ...state, classes: state.classes.map((c) => c.id === action.classId ? { ...c, name: action.name } : c) };
    case 'delete-class': {
      const classes = state.classes.filter((c) => c.id !== action.classId);
      const { [action.classId]: _omit, ...rest } = state.classStates;
      void _omit;
      const currentClassId = state.currentClassId === action.classId
        ? (classes[0]?.id ?? null)
        : state.currentClassId;
      return { ...state, classes, classStates: rest, currentClassId };
    }
    case 'add-students': {
      return {
        ...state,
        classes: state.classes.map((c) => c.id === action.classId
          ? { ...c, students: [...c.students, ...action.names.map((n) => ({ id: uid('stu_'), name: n }))] }
          : c),
      };
    }
    case 'remove-student':
      return {
        ...state,
        classes: state.classes.map((c) => c.id === action.classId
          ? { ...c, students: c.students.filter((s) => s.id !== action.studentId) }
          : c),
      };
    case 'rename-student':
      return {
        ...state,
        classes: state.classes.map((c) => c.id === action.classId
          ? { ...c, students: c.students.map((s) => s.id === action.studentId ? { ...s, name: action.name } : s) }
          : c),
      };
    case 'toggle-exclude':
      return {
        ...state,
        classes: state.classes.map((c) => c.id === action.classId
          ? { ...c, students: c.students.map((s) => s.id === action.studentId ? { ...s, excluded: !s.excluded } : s) }
          : c),
      };
    case 'set-all-included':
      return {
        ...state,
        classes: state.classes.map((c) => c.id === action.classId
          ? { ...c, students: c.students.map((s) => ({ ...s, excluded: !action.included })) }
          : c),
      };
    case 'record-pick': {
      const cs = state.classStates[action.classId] ?? freshClassState();
      return {
        ...state,
        classStates: { ...state.classStates, [action.classId]: recordPick(cs, action.studentIds, action.outcome) },
      };
    }
    case 'undo-pick': {
      const cs = state.classStates[action.classId] ?? freshClassState();
      return { ...state, classStates: { ...state.classStates, [action.classId]: undoLastPick(cs) } };
    }
    case 'reset-counts': {
      const cs = state.classStates[action.classId] ?? freshClassState();
      return { ...state, classStates: { ...state.classStates, [action.classId]: resetCounts(cs) } };
    }
    case 'remember-teams': {
      const cs = state.classStates[action.classId] ?? freshClassState();
      return { ...state, classStates: { ...state.classStates, [action.classId]: rememberTeams(cs, action.teams) } };
    }
    case 'update-settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'replace-state':
      return action.next;
    default:
      return state;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  // Persist to localStorage on change (debounced inside saveState).
  const lastSaved = useRef<PersistedState | null>(null);
  useEffect(() => {
    if (lastSaved.current === state) return;
    saveState(state);
    lastSaved.current = state;
  }, [state]);

  const currentClass: Klass | null = useMemo(
    () => state.classes.find((c) => c.id === state.currentClassId) ?? null,
    [state.classes, state.currentClassId]
  );
  const currentClassState: ClassState = useMemo(
    () => (state.currentClassId && state.classStates[state.currentClassId]) || freshClassState(),
    [state.classStates, state.currentClassId]
  );

  const actions = useMemo(() => ({
    setMode: (mode: PickerMode) => dispatch({ type: 'set-mode', mode }),
    setCurrent: (classId: ClassId | null) => dispatch({ type: 'set-current', classId }),
    addClass: (name: string) => {
      const klass: Klass = { id: uid('cls_'), name, students: [], createdAt: Date.now() };
      dispatch({ type: 'add-class', klass });
    },
    renameClass: (classId: ClassId, name: string) => dispatch({ type: 'rename-class', classId, name }),
    deleteClass: (classId: ClassId) => dispatch({ type: 'delete-class', classId }),
    addStudents: (classId: ClassId, names: string[]) => dispatch({ type: 'add-students', classId, names }),
    removeStudent: (classId: ClassId, studentId: StudentId) => dispatch({ type: 'remove-student', classId, studentId }),
    renameStudent: (classId: ClassId, studentId: StudentId, name: string) => dispatch({ type: 'rename-student', classId, studentId, name }),
    toggleExclude: (classId: ClassId, studentId: StudentId) => dispatch({ type: 'toggle-exclude', classId, studentId }),
    setAllIncluded: (classId: ClassId, included: boolean) => dispatch({ type: 'set-all-included', classId, included }),
    recordPick: (classId: ClassId, studentIds: StudentId[], outcome: 'answered' | 'pass' | 'comeback') => dispatch({ type: 'record-pick', classId, studentIds, outcome }),
    undoPick: (classId: ClassId) => dispatch({ type: 'undo-pick', classId }),
    resetCounts: (classId: ClassId) => dispatch({ type: 'reset-counts', classId }),
    rememberTeams: (classId: ClassId, teams: Student[][]) => dispatch({ type: 'remember-teams', classId, teams }),
    updateSettings: (patch: Partial<Settings>) => dispatch({ type: 'update-settings', patch }),
    replaceState: (next: PersistedState) => dispatch({ type: 'replace-state', next }),
  }), []);

  // Apply theme class to documentElement so it scopes app-wide.
  // For contrast mode we ALSO add `dark` so every `dark:` Tailwind utility
  // (used liberally for visible borders/backgrounds in dark themes) fires.
  // The `.contrast` overrides in index.css then push specific elements to
  // pure black/white for maximum legibility.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'contrast');
    if (state.settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (state.settings.theme === 'contrast') {
      root.classList.add('dark');
      root.classList.add('contrast');
    }
  }, [state.settings.theme]);

  // Animation speed multiplier (CSS variable consumers can read it).
  useEffect(() => {
    const root = document.documentElement;
    const mult = state.settings.animationSpeed === 'slow' ? 1.6 : state.settings.animationSpeed === 'fast' ? 0.55 : 1;
    root.style.setProperty('--speed-multiplier', String(mult));
  }, [state.settings.animationSpeed]);

  // Font size class on body so .picked-name and friends scale.
  useEffect(() => {
    const body = document.body;
    body.classList.remove('font-size-normal', 'font-size-large', 'font-size-huge');
    body.classList.add(`font-size-${state.settings.fontSize}`);
  }, [state.settings.fontSize]);

  return { state, currentClass, currentClassState, actions };
}

export type AppActions = ReturnType<typeof useAppState>['actions'];

/**
 * Imperative hook for actions that need an "always-fresh" reference
 * (e.g., keyboard handlers in a long-lived effect).
 */
export function useFreshActionsRef(actions: AppActions) {
  const ref = useRef(actions);
  useEffect(() => { ref.current = actions; }, [actions]);
  return useCallback(<K extends keyof AppActions>(key: K) => ref.current[key], []);
}
