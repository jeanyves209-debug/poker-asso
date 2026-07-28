import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import {
  loadTournament,
  publishTournament,
  saveTournament,
  subscribeToTournament,
} from '@/lib/tournament-sync';
import { createTournament, tournamentReducer } from '@/lib/tournament-utils';
import { EntrySettings, BlindLevel, Tournament, TournamentAction } from '@/types/tournament';

type TournamentContextValue = {
  tournament: Tournament | null;
  dispatch: (action: TournamentAction) => void;
  createNewTournament: (
    name: string,
    entry?: EntrySettings,
    levels?: BlindLevel[]
  ) => Promise<Tournament>;
  loadRoom: (roomCode: string) => Promise<Tournament | null>;
};

const TournamentContext = createContext<TournamentContextValue | null>(null);

function rootReducer(
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

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournament, dispatch] = useReducer(rootReducer, null);
  const tournamentRef = useRef<Tournament | null>(null);

  useEffect(() => {
    tournamentRef.current = tournament;
  }, [tournament]);

  const persist = useCallback(async (next: Tournament) => {
    await saveTournament(next);
    publishTournament(next);
  }, []);

  const wrappedDispatch = useCallback(
    (action: TournamentAction) => {
      dispatch(action);
    },
    []
  );

  useEffect(() => {
    if (!tournament) {
      return;
    }
    void persist(tournament);
  }, [tournament, persist]);

  useEffect(() => {
    if (!tournament) {
      return;
    }

    return subscribeToTournament(tournament.roomCode, (remote) => {
      if (remote.updatedAt <= (tournamentRef.current?.updatedAt ?? 0)) {
        return;
      }
      dispatch({ type: 'LOAD', tournament: remote });
    });
  }, [tournament?.roomCode]);

  const createNewTournament = useCallback(
    async (name: string, entry?: EntrySettings, levels?: BlindLevel[]) => {
      const next = createTournament(name, entry, levels);
      dispatch({ type: 'LOAD', tournament: next });
      await persist(next);
      return next;
    },
    [persist]
  );

  const loadRoom = useCallback(async (roomCode: string) => {
    const loaded = await loadTournament(roomCode.toUpperCase());
    if (loaded) {
      dispatch({ type: 'LOAD', tournament: loaded });
      await saveTournament(loaded);
    }
    return loaded;
  }, []);

  const value = useMemo(
    () => ({
      tournament,
      dispatch: wrappedDispatch,
      createNewTournament,
      loadRoom,
    }),
    [tournament, wrappedDispatch, createNewTournament, loadRoom]
  );

  return (
    <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within TournamentProvider');
  }
  return context;
}
