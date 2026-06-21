import { useEffect, useMemo, useRef, useState } from 'react';
import type { Klass, ClassState, Settings, Student } from '../../types';
import { eligibleStudents, pickNext } from '../../lib/pickerEngine';
import { play, playWheelSpin } from '../../lib/sounds';
import { burst } from '../../lib/confetti';
import { ResponseButtons } from '../ResponseButtons';
import { ResetNamesButton } from '../ResetNamesButton';
import { useKey } from '../../hooks/useKeyboard';

interface Props {
  klass: Klass;
  classState: ClassState;
  settings: Settings;
  onPicked: (studentIds: string[]) => void;
  onOutcome: (studentIds: string[], outcome: 'answered' | 'pass' | 'comeback') => void;
  onExclude: (studentId: string) => void;
  /** Bring all removed students back into the rotation. */
  onResetNames: () => void;
}

const PALETTE = ['#5fb1f7', '#7cc7a3', '#f0b73a', '#ef6f6c', '#9b6cf2', '#3acdef', '#f59e9b', '#a3d977'];

/**
 * Wheel of fortune. Each spin auto-records the landed student as a call.
 * "Spin again" advances; "Remove student" excludes the current winner.
 */
export function WheelMode({ klass, classState, settings, onPicked, onOutcome, onExclude, onResetNames }: Props) {
  // Wheel must visually contain anyone the engine could pick.
  const eligible = useMemo(() => {
    const base = eligibleStudents(klass.students, classState, settings.noRepeatMode);
    const haveIds = new Set(base.map((s) => s.id));
    const queued = klass.students.filter((s) =>
      !s.excluded &&
      !haveIds.has(s.id) &&
      classState.comeBackQueue.some((q) => q.studentId === s.id)
    );
    return [...base, ...queued];
  }, [klass.students, classState, settings.noRepeatMode]);

  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [picked, setPicked] = useState<Student | null>(null);
  const startTsRef = useRef(0);
  const startAngleRef = useRef(0);
  const targetAngleRef = useRef(0);
  const durationRef = useRef(4500);
  const targetStudentRef = useRef<Student | null>(null);
  const rafRef = useRef<number | null>(null);

  const sliceAngle = eligible.length > 0 ? 360 / eligible.length : 360;

  function spin() {
    if (eligible.length === 0 || spinning) return;
    const target = pickNext(klass.students, classState, settings);
    if (!target) return;
    const targetIdx = eligible.findIndex((s) => s.id === target.id);
    targetStudentRef.current = target;

    const speedMult = settings.animationSpeed === 'slow' ? 1.6 : settings.animationSpeed === 'fast' ? 0.55 : 1;
    durationRef.current = 4200 * speedMult;

    const sliceMid = targetIdx * sliceAngle + sliceAngle / 2;
    const desired = -sliceMid;
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const jitter = (Math.random() - 0.5) * (sliceAngle * 0.5);
    const finalAngle = (Math.floor(angle / 360) + extraSpins) * 360 + desired + jitter;

    startTsRef.current = performance.now();
    startAngleRef.current = angle;
    targetAngleRef.current = finalAngle;
    setSpinning(true);
    setPicked(null);
    // One continuous wheel sound spans the whole spin — no separate landing sound.
    playWheelSpin(durationRef.current, settings.soundEnabled);
    rafRef.current = requestAnimationFrame(tick);
  }

  function tick() {
    const elapsed = performance.now() - startTsRef.current;
    const t = Math.min(1, elapsed / durationRef.current);
    const eased = 1 - Math.pow(1 - t, 5);
    const a = startAngleRef.current + (targetAngleRef.current - startAngleRef.current) * eased;
    setAngle(a);
    if (t < 1) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
      setSpinning(false);
      const winner = targetStudentRef.current;
      if (winner) {
        setPicked(winner);
        onPicked([winner.id]);
        onOutcome([winner.id], 'answered'); // auto-record on spin completion
        // Landing flourish — the user's chosen settings.sound (ding/chime/etc).
        // The ratchet has already trailed off by this point, so the two
        // don't overlap audibly.
        play(settings.sound, settings.soundEnabled);
        if (settings.confetti) burst({ count: 110 });
      }
    }
  }

  function handleRemove() {
    if (!picked) return;
    onExclude(picked.id);
  }

  useKey([' ', 'space', 'enter'], (e) => { e.preventDefault(); if (!spinning) spin(); });
  useKey('x', () => picked && handleRemove(), { enabled: !!picked });

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const radius = 180;
  const cx = 200, cy = 200;
  const pickedExcluded = !!picked && (klass.students.find((s) => s.id === picked.id)?.excluded ?? false);
  const removedCount = klass.students.filter((s) => s.excluded).length;

  return (
    <div className="stage flex flex-col items-center justify-center gap-6 px-4 py-8 min-h-[420px]">
      <div className="relative" style={{ width: 400, maxWidth: '90vw' }}>
        <svg viewBox="0 0 400 400" style={{ transform: `rotate(${angle}deg)`, transformOrigin: '50% 50%' }} className="block w-full h-auto drop-shadow">
          {eligible.length === 0 ? (
            <circle cx={cx} cy={cy} r={radius} fill="rgba(0,0,0,0.05)" />
          ) : eligible.map((s, i) => {
            const a0 = (i * sliceAngle - 90) * Math.PI / 180;
            const a1 = ((i + 1) * sliceAngle - 90) * Math.PI / 180;
            const x0 = cx + radius * Math.cos(a0);
            const y0 = cy + radius * Math.sin(a0);
            const x1 = cx + radius * Math.cos(a1);
            const y1 = cy + radius * Math.sin(a1);
            const large = sliceAngle > 180 ? 1 : 0;
            const d = `M ${cx} ${cy} L ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z`;

            // Radial label: anchor near outer rim, text reads inward toward center.
            const sliceMidDeg = i * sliceAngle + sliceAngle / 2;
            const svgAngleRad = (sliceMidDeg - 90) * Math.PI / 180;
            const ax = cx + radius * 0.92 * Math.cos(svgAngleRad);
            const ay = cy + radius * 0.92 * Math.sin(svgAngleRad);
            const textRotate = sliceMidDeg - 90;
            const fontSize = Math.max(11, Math.min(16, sliceAngle * 0.85));
            return (
              <g key={s.id}>
                <path d={d} fill={PALETTE[i % PALETTE.length]} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
                <text
                  x={ax} y={ay}
                  fontSize={fontSize}
                  fontWeight={600}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="white"
                  transform={`rotate(${textRotate} ${ax} ${ay})`}
                  style={{ pointerEvents: 'none' }}
                >
                  {s.name.length > 18 ? s.name.slice(0, 17) + '…' : s.name}
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={26} fill="white" stroke="rgba(0,0,0,0.1)" />
        </svg>
        {/* Pointer */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-0 h-0"
          style={{ borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '22px solid #0f172a' }}
        />
      </div>

      {picked && (
        <div className="flex flex-col items-center gap-3">
          <div className="picked-name-text font-display font-bold" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            {picked.name}
          </div>
          {pickedExcluded && (
            <span className="text-xs uppercase tracking-[0.2em] text-rose-500/80">Removed</span>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={spin}
            disabled={spinning || eligible.length === 0}
            className="btn-primary h-12 px-7 text-base font-semibold"
          >
            {spinning ? 'Spinning…' : picked ? 'Spin again' : 'Spin the wheel'}
            {!spinning && <kbd className="kbd ml-1.5">Space</kbd>}
          </button>
          {picked && <ResponseButtons onRemove={handleRemove} disabled={pickedExcluded} />}
        </div>
        {removedCount > 0 && (
          <ResetNamesButton count={removedCount} onClick={onResetNames} />
        )}
      </div>
    </div>
  );
}
