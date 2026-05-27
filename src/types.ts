export type StudentId = string;
export type ClassId = string;

export interface Student {
  id: StudentId;
  name: string;
  excluded?: boolean;
}

export interface Klass {
  id: ClassId;
  name: string;
  students: Student[];
  createdAt: number;
}

export type PickerMode = 'standard' | 'wheel' | 'mystery' | 'teams';

export type SoundChoice = 'silent' | 'ding' | 'chime' | 'drumroll';

export type Theme = 'light' | 'dark' | 'contrast';

export type FontSize = 'normal' | 'large' | 'huge';

export type AnimationSpeed = 'slow' | 'normal' | 'fast';

export interface Settings {
  fairMode: boolean;
  noRepeatMode: boolean;
  sound: SoundChoice;
  soundEnabled: boolean;
  animationSpeed: AnimationSpeed;
  theme: Theme;
  fontSize: FontSize;
  groupSize: number;
  confetti: boolean;
}

export type PickOutcome = 'answered' | 'pass' | 'comeback';

export interface PickEvent {
  studentIds: StudentId[];
  outcome?: PickOutcome;
  ts: number;
}

/**
 * Per-class running state. Persisted in localStorage so re-opening a class
 * resumes mid-session (call counts, no-repeat cycle, come-back queue).
 */
export interface ClassState {
  callCounts: Record<StudentId, number>;
  /** Students already picked in the current no-repeat cycle. Cleared when exhausted. */
  cycleSeen: StudentId[];
  /** Students re-queued via "Come back" — picked again after a delay. */
  comeBackQueue: { studentId: StudentId; pickIndex: number }[];
  pickIndex: number;
  history: PickEvent[];
  /** Recent team breakdowns for "avoid recent pairings" scoring. Newest first. */
  recentTeams: StudentId[][][];
}

export interface PersistedState {
  classes: Klass[];
  classStates: Record<ClassId, ClassState>;
  currentClassId: ClassId | null;
  mode: PickerMode;
  settings: Settings;
  /** Schema version for future migrations. */
  version: 1;
}
