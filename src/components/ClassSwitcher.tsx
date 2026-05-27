import type { Klass } from '../types';

interface Props {
  classes: Klass[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onManage: () => void;
}

export function ClassSwitcher({ classes, currentId, onSelect, onManage }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      {classes.map((c) => {
        const active = c.id === currentId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              active
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/25'
                : 'bg-white text-ink ring-1 ring-black/5 hover:bg-black/[0.03] dark:bg-white/[0.06] dark:text-ink-dark dark:ring-white/10'
            }`}
          >
            {c.name}
            <span className="opacity-70 ml-1.5 text-xs">{c.students.filter((s) => !s.excluded).length}</span>
          </button>
        );
      })}
      <button
        onClick={onManage}
        className="shrink-0 rounded-full px-3 py-1.5 text-sm bg-transparent ring-1 ring-black/10 hover:bg-black/[0.03] dark:ring-white/15 dark:hover:bg-white/10"
      >
        + Manage
      </button>
    </div>
  );
}
