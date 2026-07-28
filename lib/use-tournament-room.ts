import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import {
  loadTournament,
  publishTournament,
  saveTournament,
  subscribeToTournament,
} from '@/lib/tournament-sync';
import { tournamentReducer } from '@/lib/tournament-utils';
import { Tournament, TournamentAction } from '@/types/tournament';

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
  const tournamentRef = useRef<Tournament | null>(null);

  useEffect(() => {
    tournamentRef.current = tournament;
  }, [tournament]);

  const refresh = useCallback(async () => {
    const loaded = await loadTournament(roomCode.toUpperCase());
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
      await refresh();
      if (active) {
        setIsLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    return subscribeToTournament(roomCode.toUpperCase(), (remote) => {
      if (!tournamentRef.current || remote.updatedAt > tournamentRef.current.updatedAt) {
        dispatch({ type: 'LOAD', tournament: remote });
      }
    });
  }, [roomCode]);

  useEffect(() => {
    if (!readOnly) {
      return;
    }
    const interval = setInterval(() => {
      void refresh();
    }, 2000);
    return () => clearInterval(interval);
  }, [readOnly, refresh]);

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
    if (readOnly || !tournament) {
      return;
    }
    void saveTournament(tournament);
    publishTournament(tournament);
  }, [readOnly, tournament]);

  const send = useCallback(
    (action: TournamentAction) => {
      if (readOnly) {
        return;
      }
      dispatch(action);
    },
    [readOnly]
  );

  return { tournament, dispatch: send, refresh, isLoading };
}
