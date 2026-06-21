/**
 * Lemon Squeezy paywall — config + license activation API + local persistence.
 *
 * The Lemon Squeezy license endpoints (`/v1/licenses/activate`, `/validate`,
 * `/deactivate`) are designed to be called directly from end-user clients —
 * they accept the license key itself as authentication, so a frontend-only
 * app can use them safely. No backend API key required.
 */

// ─── REPLACE THESE PLACEHOLDERS WHEN YOU LAUNCH ─────────────────────────────
//
// 1. Sign in at https://app.lemonsqueezy.com, switch to Test mode, create a
//    product with License Keys enabled (activation limit 5, no expiry).
// 2. On the product page, copy the Buy link → paste into `checkoutUrl` below.
// 3. Update `priceDisplay` if you change the price.
// 4. When ready to go Live: flip to Live mode in LS, copy the LIVE Buy link
//    over the test one.
//
// You can keep the placeholder URLs while you build / test the UX — the Buy
// button will open them; activation will fail (no real keys exist) but you
// can manually drop a fake licence into localStorage to test the unlocked
// paths. See `__pasUnlockForDev` at the bottom of this file.
// ────────────────────────────────────────────────────────────────────────────

export const LEMON_SQUEEZY_CONFIG = {
  /** From the Buy link on your Lemon Squeezy product page. */
  checkoutUrl: 'https://YOUR_STORE.lemonsqueezy.com/checkout/buy/YOUR_VARIANT_ID',

  /** Lemon Squeezy's license API base. Same for test and live mode. */
  apiBase: 'https://api.lemonsqueezy.com',

  /** Shown on the upgrade modal. */
  priceDisplay: '$4.99',
  productName: 'PickAStudent Premium',
};

/** Free users can have up to this many classes. */
export const FREE_CLASS_LIMIT = 3;

// ─── License persistence ────────────────────────────────────────────────────

const STORAGE_KEY = 'pickastudent:license';
const CHANGE_EVENT = 'pickastudent:license-changed';

export interface StoredLicense {
  key: string;
  instanceId: string;
  instanceName: string;
  activatedAt: number;
  activationLimit?: number;
  activationUsage?: number;
}

export function loadLicense(): StoredLicense | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredLicense) : null;
  } catch {
    return null;
  }
}

function saveLicense(license: StoredLicense) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(license));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch (err) {
    console.warn('Failed to save license', err);
  }
}

function clearLicense() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch { /* ignore */ }
}

/** Subscribe to license changes from anywhere (same tab via custom event,
 *  cross-tab via the storage event). */
export function subscribeLicenseChanges(handler: () => void): () => void {
  function storageHandler(e: StorageEvent) {
    if (e.key === STORAGE_KEY) handler();
  }
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

// ─── Activation / deactivation API ──────────────────────────────────────────

export type ActivationResult =
  | { ok: true; license: StoredLicense }
  | { ok: false; reason: 'limit-reached' | 'invalid-key' | 'network' | 'unknown'; message: string };

export async function activateLicense(rawKey: string, instanceName: string): Promise<ActivationResult> {
  const key = rawKey.trim();
  if (!key) return { ok: false, reason: 'invalid-key', message: 'License key is empty.' };

  try {
    const res = await fetch(`${LEMON_SQUEEZY_CONFIG.apiBase}/v1/licenses/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ license_key: key, instance_name: instanceName }),
    });
    const data = await res.json();

    if (data.activated && data.instance?.id) {
      const license: StoredLicense = {
        key,
        instanceId: String(data.instance.id),
        instanceName: data.instance.name ?? instanceName,
        activatedAt: Date.now(),
        activationLimit: data.license_key?.activation_limit,
        activationUsage: data.license_key?.activation_usage,
      };
      saveLicense(license);
      return { ok: true, license };
    }

    const errorMsg: string = data.error ?? 'Activation failed';
    const lower = errorMsg.toLowerCase();
    if (lower.includes('activation limit') || lower.includes('reached')) {
      return { ok: false, reason: 'limit-reached', message: errorMsg };
    }
    if (lower.includes('not found') || lower.includes('invalid') || lower.includes('not exist')) {
      return { ok: false, reason: 'invalid-key', message: errorMsg };
    }
    return { ok: false, reason: 'unknown', message: errorMsg };
  } catch {
    return {
      ok: false,
      reason: 'network',
      message: 'Could not reach the licensing server. Check your internet connection and try again.',
    };
  }
}

export async function deactivateLicense(license: StoredLicense): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${LEMON_SQUEEZY_CONFIG.apiBase}/v1/licenses/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ license_key: license.key, instance_id: license.instanceId }),
    });
    const data = await res.json();
    if (data.deactivated) {
      clearLicense();
      return { ok: true };
    }
    // Server didn't accept the deactivation — keep the local license intact.
    return { ok: false, message: data.error ?? 'Deactivation failed' };
  } catch {
    return { ok: false, message: 'Could not reach the licensing server.' };
  }
}

/** Suggest a friendly device label from the user agent. The user can override. */
export function suggestInstanceName(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let browser = 'Browser';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';

  let platform = 'Device';
  if (/iPhone/.test(ua)) platform = 'iPhone';
  else if (/iPad/.test(ua)) platform = 'iPad';
  else if (/Android/.test(ua)) platform = 'Android';
  else if (/Mac OS X/.test(ua)) platform = 'Mac';
  else if (/Windows/.test(ua)) platform = 'Windows';
  else if (/Linux/.test(ua)) platform = 'Linux';

  return `${platform} — ${browser}`;
}

export function maskKey(key: string): string {
  // Show only the last block for verification, mask the rest.
  // Lemon Squeezy keys are typically 5 groups separated by dashes.
  const parts = key.split('-');
  if (parts.length < 2) return key.replace(/.(?=.{4})/g, '•');
  return parts.map((p, i) => (i === parts.length - 1 ? p : '•'.repeat(p.length))).join('-');
}

// ─── Dev helper ─────────────────────────────────────────────────────────────
// In the browser console you can run:
//   __pasUnlockForDev()      -> grants premium locally (no real activation)
//   __pasLockForDev()        -> clears the local license
// Useful for testing the gated paths before a real Lemon Squeezy product exists.

if (typeof window !== 'undefined') {
  (window as unknown as { __pasUnlockForDev?: () => void }).__pasUnlockForDev = () => {
    saveLicense({
      key: 'DEV-DEV-DEV-DEV-DEV',
      instanceId: 'dev-instance',
      instanceName: 'Local dev override',
      activatedAt: Date.now(),
    });
    console.info('PickAStudent: premium unlocked locally (dev mode).');
  };
  (window as unknown as { __pasLockForDev?: () => void }).__pasLockForDev = () => {
    clearLicense();
    console.info('PickAStudent: premium cleared locally.');
  };
}
