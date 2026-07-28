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

const REMOTE_POLL_MS = 4000;

function roomReducer(
  state: Tournament | null,
  action: TournamentAction
): Tournament | null {
  if (action.type === 'LOAD') {
    return action.tournament;
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

  useEffect(() => {
    tournamentRef.current = tournament;
  }, [tournament]);

  const refresh = useCallback(async () => {
    const loaded = await loadTournament(roomCode.toUpperCase(), { quick: true });
    if (!loaded) {
      return null;
    }
    if (!tournamentRef.current || loaded.updatedAt > tournamentRef.current.updatedAt) {
      dispatch({ type: 'LOAD', tournament: loaded });
    }
    return loaded;
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
      if (!tournamentRef.current || remote.updatedAt > tournamentRef.current.updatedAt) {
        dispatch({ type: 'LOAD', tournament: remote });
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
    const interval = setInterval(() => {
      void refresh();
    }, REMOTE_POLL_MS);
    return () => clearInterval(interval);
  }, [readOnly, tournament, refresh]);

  useEffect(() => {
    if (readOnly || !tournament || tournament.timerStatus !== 'running') {
      return;
    }

    const interval = setInterval(() => {
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
    void saveTournament(tournament).then(setCloudSynced);
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
