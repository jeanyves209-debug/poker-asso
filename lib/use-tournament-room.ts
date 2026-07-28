import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { isRemoteSyncEnabled } from '@/lib/config';
import {
  loadTournament,
  pushTournamentToCloud,
  saveTournament,
  subscribeToTournament,
} from '@/lib/tournament-sync';
import { tournamentReducer } from '@/lib/tournament-utils';
import { Tournament, TournamentAction } from '@/types/tournament';

const POLL_RUNNING_MS = 2000;
const POLL_IDLE_MS = 5000;

function adjustRunningTimer(tournament: Tournament): Tournament {
  if (tournament.timerStatus !== 'running' || tournament.remainingSeconds <= 0) {
    return tournament;
  }

  const elapsed = Math.floor((Date.now() - tournament.updatedAt) / 1000);
  if (elapsed <= 0) {
    return tournament;
  }

  return {
    ...tournament,
    remainingSeconds: Math.max(0, tournament.remainingSeconds - elapsed),
  };
}

function roomReducer(
  state: Tournament | null,
  action: TournamentAction
): Tournament | null {
  if (action.type === 'LOAD') {
    return adjustRunningTimer(action.tournament);
  }
  if (!state) {
    return state;
  }
  return tournamentReducer(state, action);
}

export function useTournamentRoom(roomCode: string, options?: { readOnly?: boolean }) {
  const readOnly = options?.readOnly ?? false;
  const [tournament, dispatch] = useReducer(roomReducer, null);
  const [isLoading, setIsLoading] = useState(true);
  const [cloudSynced, setCloudSynced] = useState<boolean | null>(null);
  const tournamentRef = useRef<Tournament | null>(null);
  const pushedOnMountRef = useRef(false);
  const lastActionRef = useRef<TournamentAction['type'] | null>(null);

  useEffect(() => {
    tournamentRef.current = tournament;
  }, [tournament]);

  const refresh = useCallback(async () => {
    const loaded = await loadTournament(roomCode.toUpperCase(), { quick: true });
    if (!loaded) {
      return null;
    }
    const adjusted = adjustRunningTimer(loaded);
    if (
      !tournamentRef.current ||
      adjusted.updatedAt > tournamentRef.current.updatedAt ||
      adjusted.remainingSeconds !== tournamentRef.current.remainingSeconds
    ) {
      dispatch({ type: 'LOAD', tournament: adjusted });
    }
    return adjusted;
  }, [roomCode]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      const loaded = await loadTournament(roomCode.toUpperCase(), { quick: false });
      if (loaded && active) {
        dispatch({ type: 'LOAD', tournament: loaded });
      }
      if (active) {
        setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [roomCode]);

  useEffect(() => {
    return subscribeToTournament(roomCode.toUpperCase(), (remote) => {
      const adjusted = adjustRunningTimer(remote);
      if (
        !tournamentRef.current ||
        adjusted.updatedAt > tournamentRef.current.updatedAt ||
        Math.abs(adjusted.remainingSeconds - tournamentRef.current.remainingSeconds) > 1
      ) {
        dispatch({ type: 'LOAD', tournament: adjusted });
      }
    });
  }, [roomCode]);

  useEffect(() => {
    if (!isRemoteSyncEnabled()) {
      return;
    }
    const shouldPoll = readOnly || !tournament;
    if (!shouldPoll) {
      return;
    }
    const intervalMs =
      readOnly && tournament?.timerStatus === 'running' ? POLL_RUNNING_MS : POLL_IDLE_MS;
    const interval = setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [readOnly, tournament, refresh]);

  useEffect(() => {
    if (!tournament || tournament.timerStatus !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      if (!readOnly) {
        lastActionRef.current = 'TICK';
      }
      dispatch({ type: 'TICK' });
    }, 1000);

    return () => clearInterval(interval);
  }, [readOnly, tournament?.timerStatus, tournament?.roomCode]);

  useEffect(() => {
    if (readOnly || !tournament || pushedOnMountRef.current) {
      return;
    }
    pushedOnMountRef.current = true;
    void pushTournamentToCloud(tournament).then(setCloudSynced);
  }, [readOnly, tournament?.roomCode]);

  useEffect(() => {
    if (readOnly || !tournament) {
      return;
    }

    const immediate = lastActionRef.current !== 'TICK';
    lastActionRef.current = null;
    void saveTournament(tournament, { immediate }).then(setCloudSynced);
  }, [readOnly, tournament]);

  const syncToCloud = useCallback(async () => {
    if (readOnly || !tournamentRef.current) {
      return false;
    }
    const ok = await pushTournamentToCloud(tournamentRef.current);
    setCloudSynced(ok);
    return ok;
  }, [readOnly]);

  const send = useCallback(
    (action: TournamentAction) => {
      if (readOnly) {
        return;
      }
      lastActionRef.current = action.type;
      dispatch(action);
    },
    [readOnly]
  );

  return { tournament, dispatch: send, refresh, isLoading, cloudSynced, syncToCloud };
}
