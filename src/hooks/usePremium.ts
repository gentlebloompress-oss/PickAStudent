import { useCallback, useEffect, useState } from 'react';
import {
  activateLicense,
  deactivateLicense,
  loadLicense,
  subscribeLicenseChanges,
  type ActivationResult,
  type StoredLicense,
} from '../lib/premium';

/**
 * Reactive license state. All instances of this hook stay in sync via the
 * subscribeLicenseChanges custom event (same tab) and the storage event
 * (cross-tab), so e.g. activating in Settings will instantly flip the
 * "Upgrade" CTA in the Class Manager.
 */
export function usePremium() {
  const [license, setLicense] = useState<StoredLicense | null>(loadLicense);

  useEffect(() => subscribeLicenseChanges(() => setLicense(loadLicense())), []);

  const activate = useCallback(
    async (key: string): Promise<ActivationResult> => {
      return activateLicense(key);
    },
    []
  );

  const deactivate = useCallback(async () => {
    if (!license) return { ok: true as const };
    return deactivateLicense(license);
  }, [license]);

  return {
    license,
    isPremium: !!license,
    activate,
    deactivate,
  };
}
