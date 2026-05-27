import { useFullscreen } from '../hooks/useFullscreen';

interface Props {
  onOpenSettings: () => void;
  onOpenManager: () => void;
}

export function Header({ onOpenSettings, onOpenManager }: Props) {
  const { isFullscreen, toggle } = useFullscreen();
  return (
    <header className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-sage-500 grid place-items-center text-white font-display font-bold shadow-sm">
          P
        </div>
        <div className="leading-tight">
          <div className="font-display text-lg font-bold">PickAStudent</div>
          <div className="text-[11px] opacity-60 -mt-0.5">A frictionless classroom name picker</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onOpenManager} className="btn-ghost text-sm">Classes</button>
        <button onClick={toggle} title="Fullscreen (F)" className="btn-ghost text-sm">
          {isFullscreen ? '⤺' : '⤢'}<span className="hidden sm:inline ml-1">Fullscreen</span>
        </button>
        <button onClick={onOpenSettings} title="Settings" className="btn-ghost text-sm">⚙︎<span className="hidden sm:inline ml-1">Settings</span></button>
      </div>
    </header>
  );
}
