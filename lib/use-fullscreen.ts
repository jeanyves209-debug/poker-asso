import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const supported = Platform.OS === 'web' && typeof document !== 'undefined';

  useEffect(() => {
    if (!supported) {
      return;
    }

    const onChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [supported]);

  const toggle = useCallback(async () => {
    if (!supported) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser may block without user gesture — ignore.
    }
  }, [supported]);

  return { isFullscreen, toggle, supported };
}
