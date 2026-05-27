import type { Klass, ClassState } from '../types';

interface Props {
  klass: Klass;
  classState: ClassState;
  onUndo: () => void;
}

const ICONS = { answered: '✓', pass: '→', comeback: '↻' } as const;
const LABELS = { answered: 'Answered', pass: 'Pass', comeback: 'Come back' } as const;

export function RecentlyPicked({ klass, classState, onUndo }: Props) {
  const recent = classState.history.slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <aside className="card flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold opacity-70">Recently picked</h3>
        <button onClick={onUndo} className="text-xs opacity-60 hover:opacity-100 underline-offset-2 hover:underline">
          Undo last
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {recent.map((evt, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm">
            <span
              aria-label={LABELS[evt.outcome ?? 'answered']}
              className={
                evt.outcome === 'answered' ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-sage-500/20 text-sage-600 text-[11px]' :
                evt.outcome === 'pass'     ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/10 text-ink/60 text-[11px] dark:bg-white/10 dark:text-ink-dark/60' :
                                             'inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 text-[11px]'
              }
            >
              {ICONS[evt.outcome ?? 'answered']}
            </span>
            <span className="truncate">
              {evt.studentIds.map((id) => klass.students.find((s) => s.id === id)?.name ?? '?').join(', ')}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
