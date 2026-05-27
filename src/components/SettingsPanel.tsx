import type { Settings } from '../types';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function SettingsPanel({ open, onClose, settings, onChange }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-4">
        <Section title="Picking">
          <Toggle label="Fair mode" hint="Picks under-called students more often" value={settings.fairMode} onChange={(v) => onChange({ fairMode: v })} />
          <Toggle label="No-repeat mode" hint="Each student picked once before any repeat" value={settings.noRepeatMode} onChange={(v) => onChange({ noRepeatMode: v })} />
          <NumberStepper label="Group size" hint="How many to pick at once" min={1} max={10} value={settings.groupSize} onChange={(v) => onChange({ groupSize: v })} />
        </Section>

        <Section title="Response timer">
          <Toggle label="Enable timer" hint="Counts down after a name is picked" value={settings.timerEnabled} onChange={(v) => onChange({ timerEnabled: v })} />
          <Choice
            label="Default duration"
            value={String(settings.timerSeconds)}
            options={[['10', '10s'], ['30', '30s'], ['60', '60s'], ['90', '90s']]}
            onChange={(v) => onChange({ timerSeconds: Number(v) })}
          />
        </Section>

        <Section title="Sound & motion">
          <Toggle label="Sound effects" value={settings.soundEnabled} onChange={(v) => onChange({ soundEnabled: v })} />
          <Choice
            label="Sound"
            value={settings.sound}
            options={[['ding', 'Ding'], ['chime', 'Chime'], ['drumroll', 'Drumroll'], ['silent', 'Silent']]}
            onChange={(v) => onChange({ sound: v as Settings['sound'] })}
          />
          <Toggle label="Confetti on reveal" value={settings.confetti} onChange={(v) => onChange({ confetti: v })} />
          <Choice
            label="Animation speed"
            value={settings.animationSpeed}
            options={[['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']]}
            onChange={(v) => onChange({ animationSpeed: v as Settings['animationSpeed'] })}
          />
        </Section>

        <Section title="Display">
          <Choice
            label="Theme"
            value={settings.theme}
            options={[['light', 'Light'], ['dark', 'Dark'], ['contrast', 'High contrast']]}
            onChange={(v) => onChange({ theme: v as Settings['theme'] })}
          />
          <Choice
            label="Picked-name size"
            value={settings.fontSize}
            options={[['normal', 'Normal'], ['large', 'Large'], ['huge', 'Huge']]}
            onChange={(v) => onChange({ fontSize: v as Settings['fontSize'] })}
          />
        </Section>

        <p className="text-xs opacity-60">
          All settings save to this browser only. No accounts, no servers — clear browser data and they reset.
        </p>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-xs opacity-60 mt-0.5">{hint}</div> : null}
      </div>
      <span
        onClick={() => onChange(!value)}
        className={`relative inline-flex w-10 h-6 rounded-full transition-colors ${value ? 'bg-brand-600' : 'bg-black/15 dark:bg-white/15'}`}
        role="switch" aria-checked={value}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
      </span>
    </label>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.05] dark:bg-white/[0.06]">
        {options.map(([v, l]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              value === v ? 'bg-white text-ink shadow-sm dark:bg-white/[0.14] dark:text-ink-dark' : 'opacity-60 hover:opacity-100'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberStepper({ label, hint, value, onChange, min, max }: { label: string; hint?: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-xs opacity-60 mt-0.5">{hint}</div> : null}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - 1))} className="btn-soft w-8 h-8 p-0">−</button>
        <span className="tabular-nums w-6 text-center font-semibold">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} className="btn-soft w-8 h-8 p-0">+</button>
      </div>
    </div>
  );
}
