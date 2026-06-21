import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { Klass, ClassState, Settings, Student } from '../../types';
import { play } from '../../lib/sounds';
import { burst } from '../../lib/confetti';
import { useKey } from '../../hooks/useKeyboard';

interface Props {
  klass: Klass;
  classState: ClassState;
  settings: Settings;
  onPicked: (studentIds: string[]) => void;
  onOutcome: (studentIds: string[], outcome: 'answered' | 'pass' | 'comeback') => void;
  /**
   * Toggle a student's globally-excluded flag. Called both when a card is
   * flipped (hide → reveal: student gets removed from rotation) and when a
   * card is unflipped (reveal → hide: student goes back into rotation).
   */
  onToggleExclude: (studentId: string) => void;
  /** Reverse a single student's recorded pick (used when a card is flipped back). */
  onUndoStudent: (studentId: string) => void;
  /** Bring all globally-excluded students back into the rotation. */
  onResetNames: () => void;
}

/**
 * Mystery Card mode — one card per student, each with a unique icon on its
 * back. Tapping a face-down card flips it (records the call AND removes the
 * student from the rotation). Tapping a face-up card flips it back face-down
 * AND puts the student back into the rotation.
 *
 * A card's flipped state is derived from student.excluded, so the deck stays
 * in sync if a student is removed via another mode or the heat map.
 *
 * Reset names (R or the button): un-excludes everyone AND reshuffles the deck.
 */

const ICON_DECK = [
  '🎈','🎁','🎨','🎭','🎪','🎯','🎲','🎮','🎤','🎧','🎺','🎻','🎸','🥁',
  '🚀','🛸','✈️','🚂','🚲','⚽','🏀','🏈','⚾','🎾','🏐','🏓','🏸','🥏',
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸',
  '🐵','🦄','🐧','🦉','🦅','🦋','🐢','🐳','🐬','🐙','🦑','🦞','🦀','🐠',
  '🌟','⭐','🔥','🌈','☀️','🌙','⚡','❄️','🌸','🌻','🌺','🍀','🌳','🌲',
  '🍎','🍌','🍓','🍇','🍉','🍕','🍔','🍩','🧁','🍪','🍫','🍰','🍿','🥨',
];

/** A deck entry holds only the assignment (studentId → icon + order). The
 *  visual state (flipped or not) is derived from klass.students at render time. */
interface DeckEntry {
  studentId: string;
  icon: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MysteryCardMode({ klass, settings, onPicked, onOutcome, onToggleExclude, onUndoStudent, onResetNames }: Props) {
  const [deck, setDeck] = useState<DeckEntry[]>([]);
  const [lastFlippedId, setLastFlippedId] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  // (Re)build the deck on class swap or Reset names. Includes ALL students
  // (not just non-excluded ones) — globally-excluded students appear as
  // already-flipped cards, which is exactly what we want.
  useEffect(() => {
    const students = shuffle(klass.students);
    const icons = shuffle(ICON_DECK);
    setDeck(students.map((s, i) => ({
      studentId: s.id,
      icon: icons[i % icons.length],
    })));
    setLastFlippedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klass.id, resetSignal]);

  // Keep lastFlippedId in sync — clear it if that student has been un-excluded
  // (whether via clicking the card here, the heat map, or another mode).
  useEffect(() => {
    if (!lastFlippedId) return;
    const student = klass.students.find((s) => s.id === lastFlippedId);
    if (!student || !student.excluded) {
      setLastFlippedId(null);
    }
  }, [klass.students, lastFlippedId]);

  function resetNames() {
    onResetNames();                   // un-excludes everyone (cards visually flip back)
    setResetSignal((s) => s + 1);     // queues a deck reshuffle on the next render
  }

  // R puts everyone back AND reshuffles the deck. App.tsx's global R also
  // fires (calling setAllIncluded) — redundant but idempotent.
  useKey('r', resetNames);

  // Resolve each deck entry to its current student. Drop entries whose
  // students were deleted via the class manager.
  const deckEntries = useMemo(() => {
    return deck
      .map((d) => {
        const student = klass.students.find((s) => s.id === d.studentId);
        return student ? { ...d, student } : null;
      })
      .filter((d): d is DeckEntry & { student: Student } => d !== null);
  }, [deck, klass.students]);

  const flippedCount = deckEntries.filter((d) => d.student.excluded).length;
  const remaining = deckEntries.length - flippedCount;
  const allFlipped = deckEntries.length > 0 && remaining === 0;
  const lastStudent = lastFlippedId
    ? klass.students.find((s) => s.id === lastFlippedId) ?? null
    : null;

  function handleCardClick(entry: DeckEntry & { student: Student }) {
    const { studentId, student } = entry;
    if (!student.excluded) {
      // Hidden → revealed: record the call AND remove the student.
      onPicked([studentId]);
      onOutcome([studentId], 'answered');
      onToggleExclude(studentId);
      setLastFlippedId(studentId);
      play(settings.sound, settings.soundEnabled);
      if (settings.confetti) burst({ count: 70 });
    } else {
      // Revealed → hidden: put the student back into the rotation AND reverse
      // the call this flip recorded, so the count stays consistent.
      // The lastFlippedId sync effect above will clear it if needed.
      onToggleExclude(studentId);
      onUndoStudent(studentId);
    }
  }

  const cols = deckEntries.length <= 6  ? 'grid-cols-3'
            : deckEntries.length <= 12 ? 'grid-cols-3 sm:grid-cols-4'
            : deckEntries.length <= 20 ? 'grid-cols-4 sm:grid-cols-5'
            : deckEntries.length <= 30 ? 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6'
            : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8';

  return (
    <div className="stage flex flex-col gap-4 px-4 sm:px-6 py-6 min-h-[420px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm">
          {deckEntries.length === 0 ? (
            <span className="opacity-60">No students in this class yet.</span>
          ) : allFlipped ? (
            <span className="font-semibold">Whole class called! Reset names for another round.</span>
          ) : (
            <>
              <span className="opacity-80">Tap a card to reveal &amp; remove. Tap a revealed card to put them back.</span>
              <span className="opacity-50 ml-2 tabular-nums">{remaining} of {deckEntries.length} left</span>
            </>
          )}
        </div>
        <button onClick={resetNames} className="btn-soft text-xs">
          Reset names <kbd className="kbd ml-1.5">R</kbd>
        </button>
      </div>

      <div className={`grid gap-2 sm:gap-3 ${cols}`}>
        {deckEntries.map((entry) => (
          <MysteryCard
            key={entry.studentId}
            icon={entry.icon}
            student={entry.student}
            isLast={entry.studentId === lastFlippedId}
            onClick={() => handleCardClick(entry)}
          />
        ))}
      </div>

      <AnimatePresence>
        {lastStudent && (
          <motion.div
            key="reveal-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex flex-col items-center gap-3 mt-2"
          >
            <div className="text-xs uppercase tracking-[0.25em] opacity-50">It's…</div>
            <div className="font-display font-bold text-center leading-tight bg-gradient-to-br from-brand-600 to-sage-500 bg-clip-text text-transparent" style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)' }}>
              {lastStudent.name}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MysteryCard({ icon, student, isLast, onClick }: { icon: string; student: Student; isLast: boolean; onClick: () => void }) {
  const flipped = !!student.excluded;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={flipped ? `${student.name} — tap to put back` : 'Mystery card — tap to reveal'}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.96 }}
      className={[
        'flip-3d relative aspect-[3/4] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer',
        flipped && !isLast ? 'opacity-90' : '',
        isLast ? 'ring-2 ring-brand-500/40' : '',
      ].join(' ')}
    >
      <div className={`flip-inner relative w-full h-full rounded-2xl shadow-md ${flipped ? 'flip-flipped' : ''}`}>
        {/* Card back */}
        <div className="flip-face absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-600 to-sage-500 grid place-items-center text-white overflow-hidden">
          <div className="absolute inset-1.5 rounded-xl border-2 border-white/30" />
          <span className="relative z-10 text-3xl sm:text-4xl drop-shadow-sm">{icon}</span>
        </div>
        {/* Card front (revealed) */}
        <div className="flip-face flip-face-back absolute inset-0 rounded-2xl bg-white dark:bg-canvas-dark border border-black/10 dark:border-white/15 grid place-items-center px-2 py-3">
          <div className="text-center font-semibold leading-tight"
               style={{ fontSize: 'clamp(0.7rem, 1.3vw, 1rem)' }}>
            {student.name}
          </div>
        </div>
      </div>
      {flipped && (
        <span className="absolute top-1.5 right-1.5 z-10 inline-flex items-center justify-center w-5 h-5 rounded-full bg-sage-500 text-white text-[11px] shadow">
          ✓
        </span>
      )}
    </motion.button>
  );
}
