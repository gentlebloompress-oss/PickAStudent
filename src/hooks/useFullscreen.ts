import { useCallback, useEffect, useState } from 'react';

export function useFullscreen() {
  const [isFs, setIsFs] = useState<boolean>(typeof document !== 'undefined' && !!document.fullscreenElement);

  useEffect(() => {
    function onChange() { setIsFs(!!document.fullscreenElement); }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { /* user gesture required, etc. */ }
  }, []);

  return { isFullscreen: isFs, toggle };
}
