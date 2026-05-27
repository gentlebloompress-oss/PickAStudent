import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Two unobtrusive toasts:
 *  1) "Update ready" — fired by the service worker when a new version is waiting.
 *  2) "Add to home screen" — fired by Chrome/Edge's beforeinstallprompt, but
 *     suppressed until the user has visited at least twice.
 */
export function PWAToasts() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Re-check for updates every hour while the tab is open.
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000);
    },
  });

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    function onBefore(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      const visits = Number(localStorage.getItem('pas:visits') ?? '0');
      if (visits >= 2 && localStorage.getItem('pas:installDismissed') !== '1') {
        setShowInstall(true);
      }
    }
    window.addEventListener('beforeinstallprompt', onBefore);
    return () => window.removeEventListener('beforeinstallprompt', onBefore);
  }, []);

  // Bump the visit counter on first paint of each session.
  useEffect(() => {
    const v = Number(localStorage.getItem('pas:visits') ?? '0') + 1;
    localStorage.setItem('pas:visits', String(v));
  }, []);

  return (
    <>
      <AnimatePresence>
        {needRefresh && (
          <Toast key="refresh">
            <span>Update ready — refresh to apply.</span>
            <button onClick={() => updateServiceWorker(true)} className="btn-primary text-xs">Refresh</button>
            <button onClick={() => setNeedRefresh(false)} className="btn-ghost text-xs">Later</button>
          </Toast>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInstall && installEvent && (
          <Toast key="install">
            <span>Install PickAStudent for offline use?</span>
            <button
              onClick={async () => {
                await installEvent.prompt();
                setShowInstall(false);
              }}
              className="btn-primary text-xs"
            >Install</button>
            <button
              onClick={() => { localStorage.setItem('pas:installDismissed', '1'); setShowInstall(false); }}
              className="btn-ghost text-xs"
            >Not now</button>
          </Toast>
        )}
      </AnimatePresence>
    </>
  );
}

function Toast({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.22 }}
      className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40 card flex items-center gap-3 text-sm shadow-lg"
    >
      {children}
    </motion.div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
