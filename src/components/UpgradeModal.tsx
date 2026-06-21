import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { FREE_STUDENT_LIMIT, LEMON_SQUEEZY_CONFIG, suggestInstanceName } from '../lib/premium';
import { usePremium } from '../hooks/usePremium';

/** Where the upgrade prompt was triggered from — drives the headline copy. */
export type UpgradeReason = 'classes' | 'students' | 'heatmap' | 'sync' | 'general';

interface Props {
  open: boolean;
  reason: UpgradeReason;
  onClose: () => void;
}

/**
 * Two-view modal: a pitch with "Buy" and "I have a key" actions, and an
 * activation form that hits Lemon Squeezy. On successful activation, the
 * usePremium hook updates everywhere via the license-changed event, so any
 * gate that triggered this modal automatically unlocks.
 */
export function UpgradeModal({ open, reason, onClose }: Props) {
  const { activate } = usePremium();
  const [view, setView] = useState<'pitch' | 'activate'>('pitch');
  const [key, setKey] = useState('');
  const [deviceName, setDeviceName] = useState(suggestInstanceName);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<{ message: string; reason: string } | null>(null);

  // Reset internal state when the modal closes so reopening it feels fresh.
  useEffect(() => {
    if (!open) {
      setView('pitch');
      setKey('');
      setError(null);
      setActivating(false);
    }
  }, [open]);

  async function handleActivate() {
    if (!key.trim() || activating) return;
    setActivating(true);
    setError(null);
    const result = await activate(key, deviceName);
    setActivating(false);
    if (result.ok) {
      onClose();
    } else {
      setError({ message: result.message, reason: result.reason });
    }
  }

  function openCheckout() {
    window.open(LEMON_SQUEEZY_CONFIG.checkoutUrl, '_blank', 'noopener,noreferrer');
  }

  const headline =
    reason === 'classes'
      ? "You've reached the free limit of 3 classes."
      : reason === 'students'
      ? `You've reached the free limit of ${FREE_STUDENT_LIMIT} students in a class.`
      : reason === 'heatmap'
      ? 'The fairness heat map is free for one class — unlock it for all of them.'
      : reason === 'sync'
      ? 'Move your classes between devices.'
      : 'Unlock the full PickAStudent.';

  return (
    <Modal open={open} onClose={onClose} title={LEMON_SQUEEZY_CONFIG.productName}>
      {view === 'pitch' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm opacity-80">{headline}</p>

          <ul className="text-sm flex flex-col gap-2 my-1">
            <Feature>Unlimited classes &amp; unlimited students per class</Feature>
            <Feature>Fairness heat map for every class, not just one</Feature>
            <Feature>Backup &amp; sync — save your classes to a file, load on any device</Feature>
            <Feature>One-time payment, lifetime use (no subscription)</Feature>
            <Feature>Activate on up to 3 devices, swap any time</Feature>
          </ul>

          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <button onClick={openCheckout} className="btn-primary flex-1">
              Buy for {LEMON_SQUEEZY_CONFIG.priceDisplay}
            </button>
            <button onClick={() => setView('activate')} className="btn-soft flex-1">
              I have a key
            </button>
          </div>

          <p className="text-[11px] opacity-50 text-center leading-snug">
            Payments processed by Lemon Squeezy. You'll receive a license key by email —
            paste it back here to activate.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            onClick={() => { setView('pitch'); setError(null); setKey(''); }}
            className="text-xs opacity-60 hover:opacity-100 underline-offset-2 hover:underline self-start"
          >
            ← Back
          </button>

          <div>
            <h3 className="font-semibold mb-1">Paste your license key</h3>
            <p className="text-xs opacity-70">
              It looks like <code className="text-[11px] opacity-90">XXXX-XXXX-XXXX-XXXX-XXXX</code>.
              Check the email from Lemon Squeezy.
            </p>
          </div>

          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleActivate(); }}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
            className="font-mono text-sm w-full px-3 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] outline-none"
            disabled={activating}
            autoFocus
            spellCheck={false}
          />

          <label className="flex flex-col gap-1">
            <span className="text-xs opacity-70">Device label (so you can recognise it later)</span>
            <input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="text-sm w-full px-3 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] outline-none"
              disabled={activating}
            />
          </label>

          {error && (
            <div className="text-sm bg-rose-500/10 ring-1 ring-rose-500/30 rounded-lg p-3 text-rose-700 dark:text-rose-200">
              <p className="font-semibold mb-1">Activation failed</p>
              <p className="text-xs opacity-90">{error.message}</p>
              {error.reason === 'limit-reached' && (
                <p className="text-xs mt-2 opacity-90 leading-snug">
                  Open PickAStudent on a device you no longer use and click
                  <strong> Settings → Premium → Deactivate this device </strong>
                  to free a slot, then try again here.
                </p>
              )}
            </div>
          )}

          <button onClick={handleActivate} disabled={!key.trim() || activating} className="btn-primary">
            {activating ? 'Activating…' : 'Activate'}
          </button>
        </div>
      )}
    </Modal>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="text-sage-600 dark:text-sage-400 font-bold">✓</span>
      <span>{children}</span>
    </li>
  );
}
