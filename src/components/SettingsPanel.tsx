import { useState } from 'react';
import type { Settings } from '../types';
import { Modal } from './Modal';
import { maskKey, type StoredLicense } from '../lib/premium';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  isPremium: boolean;
  license: StoredLicense | null;
  onUpgrade: () => void;
  onDeactivate: () => Promise<{ ok: boolean; message?: string }>;
}

export function SettingsPanel({ open, onClose, settings, onChange, isPremium, license, onUpgrade, onDeactivate }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-4">
        <PremiumSection isPremium={isPremium} license={license} onUpgrade={onUpgrade} onDeactivate={onDeactivate} />

        <Section title="Picking">
          <Toggle label="Fair mode" hint="Picks under-called students more often" value={settings.fairMode} onChange={(v) => onChange({ fairMode: v })} />
          <Toggle label="No-repeat mode" hint="Each student picked once before any repeat" value={settings.noRepeatMode} onChange={(v) => onChange({ noRepeatMode: v })} />
          <NumberStepper label="Group size" hint="How many to pick at once" min={1} max={10} value={settings.groupSize} onChange={(v) => onChange({ groupSize: v })} />
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

function PremiumSection({ isPremium, license, onUpgrade, onDeactivate }: {
  isPremium: boolean;
  license: StoredLicense | null;
  onUpgrade: () => void;
  onDeactivate: () => Promise<{ ok: boolean; message?: string }>;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeactivate() {
    if (!confirm('Deactivate premium on this device? This frees an activation slot. You can re-activate later with your key.')) return;
    setWorking(true);
    setError(null);
    const res = await onDeactivate();
    setWorking(false);
    if (!res.ok) setError(res.message ?? 'Could not deactivate. Try again.');
  }

  return (
    <div className="p-3 rounded-xl bg-gradient-to-br from-brand-500/[0.08] to-sage-500/[0.08] ring-1 ring-brand-500/20 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">Premium</h3>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
          isPremium
            ? 'bg-sage-500/20 text-sage-600 dark:text-sage-400'
            : 'bg-black/10 dark:bg-white/10 opacity-70'
        }`}>
          {isPremium ? 'Active' : 'Free'}
        </span>
      </div>

      {isPremium && license ? (
        <>
          <div className="text-xs opacity-70 flex flex-col gap-0.5">
            <div>Unlimited classes + backup &amp; sync unlocked.</div>
            <div>Device: <span className="font-medium">{license.instanceName}</span></div>
            <div>Key: <span className="font-mono">{maskKey(license.key)}</span></div>
          </div>
          {error && <div className="text-xs text-rose-600 dark:text-rose-300">{error}</div>}
          <button onClick={handleDeactivate} disabled={working} className="btn-soft text-xs self-start mt-1">
            {working ? 'Deactivating…' : 'Deactivate this device'}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs opacity-70 leading-snug">
            Unlock unlimited classes and the ability to save &amp; move your classes
            across devices. One-time payment, lifetime use.
          </p>
          <button onClick={onUpgrade} className="btn-primary text-sm self-start mt-1">
            Upgrade
          </button>
        </>
      )}
    </div>
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
