import type { PickerMode } from '../types';

// Number keys 1–4 still switch modes (wired globally in App.tsx); the badges
// are just no longer shown on the tabs to keep them clean.
const TABS: { id: PickerMode; label: string; emoji: string }[] = [
  { id: 'standard', label: 'Standard', emoji: '✨' },
  { id: 'wheel', label: 'Wheel', emoji: '🎡' },
  { id: 'mystery', label: 'Mystery', emoji: '🃏' },
  { id: 'teams', label: 'Teams', emoji: '🧩' },
];

interface Props {
  mode: PickerMode;
  onChange: (m: PickerMode) => void;
}

export function ModeTabs({ mode, onChange }: Props) {
  return (
    <div role="tablist" className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] w-fit">
      {TABS.map((t) => {
        const active = t.id === mode;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
              active
                ? 'bg-white text-ink shadow-sm dark:bg-white/[0.12] dark:text-ink-dark'
                : 'text-ink/60 hover:text-ink dark:text-ink-dark/60 dark:hover:text-ink-dark'
            }`}
          >
            <span aria-hidden>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
