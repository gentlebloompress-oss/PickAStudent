import type { TimerHandle } from '../hooks/useTimer';

interface Props {
  handle: TimerHandle;
  size?: number;
}

/**
 * SVG ring that drains as time runs out. Color smoothly transitions
 * green → amber → red — no harsh flashing.
 */
export function TimerRing({ handle, size = 120 }: Props) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - handle.progress);

  // HSL hue: 145 (green) → 38 (amber) → 0 (red), driven by progress.
  const hue = Math.round(handle.progress * 145);
  const color = `hsl(${hue}, 75%, 50%)`;

  const seconds = Math.ceil(handle.remaining / 1000);

  return (
    <div className="inline-flex flex-col items-center gap-1" aria-live="polite">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="currentColor" strokeOpacity={0.12}
          strokeWidth={stroke} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke 200ms linear, stroke-dashoffset 80ms linear' }}
        />
      </svg>
      <div className="text-2xl font-display font-bold tabular-nums" style={{ marginTop: -size / 2 - 14, color }}>
        {seconds}
      </div>
    </div>
  );
}
