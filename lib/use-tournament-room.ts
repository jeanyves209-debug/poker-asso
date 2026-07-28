import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { isRemoteSyncEnabled } from '@/lib/config';
import { subscribeToTournamentStream } from '@/lib/remote-stream';
import {
  loadTournament,
  pushTournamentToCloud,
  saveTournament,
  subscribeToTournament,
} from '@/lib/tournament-sync';
import { getComputedRemainingSeconds } from '@/lib/tournament-utils';
import { tournamentReducer } from '@/lib/tournament-utils';
import { Tournament, TournamentAction } from '@/types/tournament';

const POLL_DISPLAY_RUNNING_MS = 1000;
const POLL_DISPLAY_IDLE_MS = 2000;

function adjustRunningTimer(tournament: Tournament): Tournament {
  if (tournament.timerStatus !== 'running') {
    return tournament;
  }
  const remaining = getComputedRemainingSeconds(tournament);
  return {
    ...tournament,
    remainingSeconds: remaining,
    updatedAt: Date.now(),
    timerStatus: remaining > 0 ? 'running' : 'paused',
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

function shouldApplyRemoteState(current: Tournament | null, remote: Tournament): boolean {
  if (!current) {
    return true;
  }
  if (remote.updatedAt > current.updatedAt) {
    return true;
  }
  if (remote.updatedAt === current.updatedAt) {
    return (
      remote.timerStatus !== current.timerStatus ||
      remote.currentLevelIndex !== current.currentLevelIndex ||
      remote.remainingSeconds !== current.remainingSeconds ||
      remote.players.length !== current.players.length
    );
  }
  return false;
}

export function useTournamentRoom(roomCode: string, options?: { readOnly?: boolean }) {
  const readOnly = options?.readOnly ?? false;
  const [tournament, dispatch] = useReducer(roomReducer, null);
  const [isLoading, setIsLoading] = useState(true);
  const [cloudSynced, setCloudSynced] = useState<boolean | null>(null);
  const tournamentRef = useRef<Tournament | null>(null);
  const pushedOnMountRef = useRef(false);

  useEffect(() => {
    tournamentRef.current = tournament;
  }, [tournament]);

  const applyRemote = useCallback((remote: Tournament) => {
    const adjusted = adjustRunningTimer(remote);
    if (shouldApplyRemoteState(tournamentRef.current, adjusted)) {
      dispatch({ type: 'LOAD', tournament: adjusted });
    }
  }, []);

  const refresh = useCallback(async () => {
    const loaded = await loadTournament(roomCode.toUpperCase(), { quick: true });
    if (!loaded) {
      return null;
    }
    applyRemote(loaded);
    return loaded;
  }, [roomCode, applyRemote]);

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
    return subscribeToTournament(roomCode.toUpperCase(), applyRemote);
  }, [roomCode, applyRemote]);

  useEffect(() => {
    if (!isRemoteSyncEnabled()) {
      return;
    }
    return subscribeToTournamentStream(roomCode.toUpperCase(), applyRemote);
  }, [roomCode, applyRemote]);

  useEffect(() => {
    if (!isRemoteSyncEnabled()) {
      return;
    }

    const shouldPoll = readOnly || !tournament;
    if (!shouldPoll) {
      return;
    }

    const running = tournament?.timerStatus === 'running';
    const intervalMs = readOnly
      ? running
        ? POLL_DISPLAY_RUNNING_MS
        : POLL_DISPLAY_IDLE_MS
      : POLL_DISPLAY_IDLE_MS;

    const interval = setInterval(() => {
      void refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [readOnly, tournament, refresh]);

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
    void saveTournament(tournament, { immediate: true }).then(setCloudSynced);
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
      dispatch(action);
    },
    [readOnly]
  );

  return { tournament, dispatch: send, refresh, isLoading, cloudSynced, syncToCloud };
}
