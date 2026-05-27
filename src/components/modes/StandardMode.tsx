import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Klass, ClassState, Settings, Student } from '../../types';
import { pickGroup, pickNext } from '../../lib/pickerEngine';
import { play } from '../../lib/sounds';
import { burst } from '../../lib/confetti';
import { ResponseButtons } from '../ResponseButtons';
import { TimerRing } from '../TimerRing';
import { useTimer } from '../../hooks/useTimer';
import { useKey } from '../../hooks/useKeyboard';

interface Props {
  klass: Klass;
  classState: ClassState;
  settings: Settings;
  onPicked: (studentIds: string[]) => void;
  onOutcome: (studentIds: string[], outcome: 'answered' | 'pass' | 'comeback') => void;
  onExclude: (studentId: string) => void;
}

/**
 * Standard mode — name appears center stage. Each pick auto-counts as a call,
 * so to advance the teacher just hits "Pick another" (or Space). The only
 * explicit action is "Remove student", which excludes the current student
 * from future picks for the rest of the session.
 */
export function StandardMode({ klass, classState, settings, onPicked, onOutcome, onExclude }: Props) {
  const [picked, setPicked] = useState<Student[] | null>(null);
  const [revealKey, setRevealKey] = useState(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const timerSeconds = klass.defaultTimerSeconds ?? settings.timerSeconds;
  const timer = useTimer();

  function pick() {
    const group = settings.groupSize > 1
      ? pickGroup(klass.students, classState, settings, settings.groupSize)
      : (() => { const s = pickNext(klass.students, classState, settings); return s ? [s] : []; })();
    if (group.length === 0) return;
    const ids = group.map((s) => s.id);
    setPicked(group);
    setRevealKey((k) => k + 1);
    onPicked(ids);
    onOutcome(ids, 'answered'); // auto-record — picking IS the call
    play(settings.sound, settings.soundEnabled);
    if (settings.confetti) {
      const rect = stageRef.current?.getBoundingClientRect();
      burst({ origin: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.4 } : undefined });
    }
    if (settings.timerEnabled) timer.start(timerSeconds * 1000);
  }

  function handleRemove() {
    if (!picked) return;
    for (const s of picked) onExclude(s.id);
  }

  useKey([' ', 'space', 'enter'], (e) => { e.preventDefault(); pick(); });
  useKey('x', () => picked && handleRemove(), { enabled: !!picked });

  // Stop timer when class/mode unmounts.
  useEffect(() => () => timer.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const eligibleCount = klass.students.filter((s) => !s.excluded).length;
  // Are any of the currently-picked students excluded? (Used to disable Remove
  // when the user has already removed the active group.)
  const allPickedExcluded = !!picked && picked.every((p) => klass.students.find((s) => s.id === p.id)?.excluded);

  return (
    <div ref={stageRef} className="stage flex flex-col items-center justify-center text-center gap-7 px-6 py-10 min-h-[420px]">
      <AnimatePresence mode="wait">
        {!picked ? (
          <motion.div
            key="prepick"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-center gap-3"
          >
            <span className="text-sm uppercase tracking-[0.2em] opacity-50">Press space</span>
            <span className="font-display text-3xl sm:text-5xl font-bold opacity-50">Pick a student</span>
            <span className="text-sm opacity-50">{eligibleCount} eligible</span>
          </motion.div>
        ) : (
          <motion.div
            key={`pick-${revealKey}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <div className="picked-name font-display font-bold leading-tight bg-gradient-to-br from-brand-600 to-sage-500 bg-clip-text text-transparent">
              {picked.map((s) => s.name).join(' · ')}
            </div>
            {allPickedExcluded && (
              <span className="text-xs uppercase tracking-[0.2em] text-rose-500/80">Removed</span>
            )}
            {settings.timerEnabled && timer.duration > 0 && (
              <div className="flex items-center gap-3">
                <TimerRing handle={timer} size={84} />
                <div className="flex flex-col gap-1">
                  <button onClick={timer.running ? timer.pause : timer.resume} className="btn-soft text-xs">{timer.running ? 'Pause' : 'Resume'}</button>
                  <button onClick={() => timer.add(15000)} className="btn-soft text-xs">+15s</button>
                  <button onClick={() => timer.start(timerSeconds * 1000)} className="btn-soft text-xs">Reset</button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={pick}
          disabled={eligibleCount === 0}
          className="btn-primary h-12 px-7 text-base font-semibold"
        >
          {picked ? 'Pick another' : 'Pick a student'}
          <kbd className="kbd ml-1.5">Space</kbd>
        </button>
        {picked && <ResponseButtons onRemove={handleRemove} disabled={allPickedExcluded} />}
      </div>
    </div>
  );
}
