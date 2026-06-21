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
        <img
          src="/logo.png"
          alt="PickAStudent logo"
          width={36}
          height={36}
          className="w-9 h-9 rounded-xl shadow-sm"
        />
        <div className="leading-tight">
          <div className="font-display text-lg font-bold">PickAStudent</div>
          <div className="hidden sm:block text-[11px] opacity-60 -mt-0.5">A frictionless classroom name picker</div>
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
