import { useEffect, useRef } from 'react';

import { playOneMinuteWarning, unlockTimerSound } from '@/lib/timer-sound';
import { Tournament } from '@/types/tournament';

/**
 * Plays a warning beep when the running timer crosses 60 seconds remaining.
 * Call unlockTimerSound() after a user gesture (e.g. fullscreen) so browsers allow audio.
 */
export function useOneMinuteWarning(tournament: Tournament | null): void {
  const warnedForLevelRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tournament || tournament.timerStatus !== 'running') {
      return;
    }

    const levelKey = `${tournament.roomCode}:${tournament.currentLevelIndex}`;
    if (tournament.remainingSeconds > 60) {
      if (warnedForLevelRef.current === levelKey) {
        warnedForLevelRef.current = null;
      }
      return;
    }

    if (tournament.remainingSeconds <= 0) {
      return;
    }

    if (warnedForLevelRef.current === levelKey) {
      return;
    }

    warnedForLevelRef.current = levelKey;
    void unlockTimerSound().then(() => playOneMinuteWarning());
  }, [
    tournament?.roomCode,
    tournament?.currentLevelIndex,
    tournament?.timerStatus,
    tournament?.remainingSeconds,
  ]);
}
