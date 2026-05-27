import type { PickerMode } from '../types';

const TABS: { id: PickerMode; label: string; emoji: string; key: string }[] = [
  { id: 'standard', label: 'Standard', emoji: '✨', key: '1' },
  { id: 'wheel', label: 'Wheel', emoji: '🎡', key: '2' },
  { id: 'mystery', label: 'Mystery', emoji: '🃏', key: '3' },
  { id: 'teams', label: 'Teams', emoji: '🧩', key: '4' },
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
            <kbd className="kbd ml-1">{t.key}</kbd>
          </button>
        );
      })}
    </div>
  );
}
