/**
 * Gumroad paywall — config + license verification + local persistence.
 *
 * Gumroad's /v2/licenses/verify endpoint is designed for client-side use —
 * it accepts the license key itself as authentication, so no backend needed.
 */

export const GUMROAD_CONFIG = {
  checkoutUrl: 'https://bloompress8.gumroad.com/l/lpjvld?wanted=true',
  apiBase: 'https://api.gumroad.com',
  productPermalink: 'lpjvld',
  priceDisplay: '$4.99',
  productName: 'PickAStudent Premium',
};

/** Free users can have up to this many classes. */
export const FREE_CLASS_LIMIT = 3;

/** Free users can have up to this many students per class. */
export const FREE_STUDENT_LIMIT = 25;

// ─── License persistence ────────────────────────────────────────────────────

const STORAGE_KEY = 'pickastudent:license';
const CHANGE_EVENT = 'pickastudent:license-changed';

export interface StoredLicense {
  key: string;
  activatedAt: number;
  uses?: number;
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
  | { ok: false; reason: 'invalid-key' | 'network' | 'unknown'; message: string };

export async function activateLicense(rawKey: string): Promise<ActivationResult> {
  const key = rawKey.trim();
  if (!key) return { ok: false, reason: 'invalid-key', message: 'License key is empty.' };

  try {
    const body = new URLSearchParams({
      product_id: GUMROAD_CONFIG.productPermalink,
      license_key: key,
      increment_uses_count: 'true',
    });
    const res = await fetch(`${GUMROAD_CONFIG.apiBase}/v2/licenses/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = await res.json();

    if (data.success) {
      const license: StoredLicense = {
        key,
        activatedAt: Date.now(),
        uses: data.uses,
      };
      saveLicense(license);
      return { ok: true, license };
    }

    const errorMsg: string = data.message ?? 'Activation failed';
    const lower = errorMsg.toLowerCase();
    if (lower.includes('does not exist') || lower.includes('invalid') || lower.includes('not found')) {
      return { ok: false, reason: 'invalid-key', message: 'License key not found. Check the email from Gumroad and try again.' };
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

/** Deactivating on Gumroad just clears the local license — there's no server-side instance to remove. */
export async function deactivateLicense(_license: StoredLicense): Promise<{ ok: boolean; message?: string }> {
  clearLicense();
  return { ok: true };
}

export function maskKey(key: string): string {
  const parts = key.split('-');
  if (parts.length < 2) return key.replace(/.(?=.{4})/g, '•');
  return parts.map((p, i) => (i === parts.length - 1 ? p : '•'.repeat(p.length))).join('-');
}

// ─── Dev helpers ─────────────────────────────────────────────────────────────
// In the browser console you can run:
//   __pasUnlockForDev()   → grants premium locally (no real activation)
//   __pasLockForDev()     → clears the local license

if (typeof window !== 'undefined') {
  (window as unknown as { __pasUnlockForDev?: () => void }).__pasUnlockForDev = () => {
    saveLicense({ key: 'DEV-DEV-DEV-DEV-DEV', activatedAt: Date.now() });
    console.info('PickAStudent: premium unlocked locally (dev mode).');
  };
  (window as unknown as { __pasLockForDev?: () => void }).__pasLockForDev = () => {
    clearLicense();
    console.info('PickAStudent: premium cleared locally.');
  };
}
