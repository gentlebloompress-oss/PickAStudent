import { useMemo } from 'react';
import type { Klass, ClassState, Settings } from '../types';
import { summarizeCounts } from '../lib/pickerEngine';

interface Props {
  klass: Klass;
  classState: ClassState;
  settings: Settings;
  onResetCounts: () => void;
  onToggleExclude: (studentId: string) => void;
  /** Bring all "Don't pick again" students back into the rotation. */
  onIncludeAll: () => void;
}

export function HeatMap({ klass, classState, settings, onResetCounts, onToggleExclude, onIncludeAll }: Props) {
  const summary = useMemo(() => summarizeCounts(klass.students, classState), [klass.students, classState]);
  const max = Math.max(1, summary.max);
  const excludedCount = klass.students.filter((s) => s.excluded).length;
  const isContrast = settings.theme === 'contrast';

  if (klass.students.length === 0) return null;

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold opacity-70">Fairness heat map</h3>
          <p className="text-xs opacity-60 mt-0.5">
            {summary.mostCalled
              ? <>Most called: <strong>{summary.mostCalled.name}</strong> ({summary.max}×)</>
              : <>No picks yet this session.</>
            }
            {summary.neverCalled > 0 ? <> · {summary.neverCalled} never called</> : null}
            {excludedCount > 0 ? <> · {excludedCount} removed</> : null}
          </p>
        </div>
        <div className="flex items-center gap-3 whitespace-nowrap">
          {excludedCount > 0 && (
            <button
              onClick={onIncludeAll}
              title={`Bring back ${excludedCount} removed student${excludedCount === 1 ? '' : 's'}`}
              className="text-xs text-brand-700 dark:text-brand-300 hover:opacity-80 underline-offset-2 hover:underline"
            >
              Reset names ({excludedCount})
            </button>
          )}
          <button
            onClick={() => {
              if (confirm('Reset call counts for this class? Your students stay; their call history clears.')) onResetCounts();
            }}
            className="text-xs opacity-60 hover:opacity-100 underline-offset-2 hover:underline"
          >
            Reset counts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {klass.students.map((s) => {
          const c = classState.callCounts[s.id] ?? 0;
          const intensity = c / max; // 0..1

          // Compute bg + fg so text stays readable across all three themes.
          let bg: string;
          let fg: string;
          if (isContrast) {
            // Same cool-blue → warm-orange hue gradient as the other themes
            // for visual continuity, but at full saturation and held at
            // lightness 25% so white text passes WCAG AA across the whole
            // gradient (including the perceptually-bright yellow/green
            // middle, which is where naïve high-saturation maps fail).
            if (c === 0) {
              bg = '#1a1a1a';
              fg = '#ffffff';
            } else {
              const hue = 210 - intensity * 190;
              bg = `hsl(${hue}, 100%, 25%)`;
              fg = '#ffffff';
            }
          } else {
            const hue = 210 - intensity * 190; // cool blue → warm orange
            const sat = 30 + intensity * 50;
            const light = 92 - intensity * 32; // 92% → 60%
            if (c === 0) {
              bg = 'rgba(0,0,0,0.04)';
              fg = 'inherit';
            } else {
              bg = `hsl(${hue}, ${sat}%, ${light}%)`;
              // Pick fg by bg lightness so low-count pastel tiles are also
              // readable in dark mode (where inherited text would be white).
              fg = light < 55 ? '#ffffff' : '#0f172a';
            }
          }

          return (
            <button
              key={s.id}
              onClick={() => onToggleExclude(s.id)}
              title={s.excluded ? 'Excluded — click to include' : 'Click to exclude'}
              className={`text-left rounded-lg px-3 py-2 text-sm transition ${
                s.excluded ? 'opacity-40 line-through' : ''
              } ring-1 ring-black/5 dark:ring-white/10 hover:ring-brand-500/40`}
              style={{ backgroundColor: bg, color: fg }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{s.name}</span>
                <span className="tabular-nums opacity-80 text-xs">{c}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
