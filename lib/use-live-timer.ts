import { useEffect, useState } from 'react';

import { getComputedRemainingSeconds } from '@/lib/tournament-utils';
import { Tournament } from '@/types/tournament';

export function useLiveRemainingSeconds(tournament: Tournament | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!tournament || tournament.timerStatus !== 'running') {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [tournament?.timerStatus, tournament?.updatedAt, tournament?.roomCode]);

  if (!tournament) {
    return 0;
  }
  return getComputedRemainingSeconds(tournament, now);
}
