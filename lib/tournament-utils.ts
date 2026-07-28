import { DEFAULT_LEVELS } from '@/lib/default-levels';
import { SavedTournamentSummary } from '@/types/saved-tournament';
import {
  DEFAULT_ENTRY,
  DEFAULT_PAYOUTS,
  DEFAULT_SETTINGS,
  BlindLevel,
  EntrySettings,
  PayoutPlace,
  Player,
  Tournament,
  TournamentAction,
  TournamentSettings,
} from '@/types/tournament';

export function getComputedRemainingSeconds(tournament: Tournament, now = Date.now()): number {
  if (tournament.timerStatus !== 'running') {
    return tournament.remainingSeconds;
  }
  const elapsed = Math.floor((now - tournament.updatedAt) / 1000);
  return Math.max(0, tournament.remainingSeconds - elapsed);
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

type LegacyTournament = Tournament & {
  buyIn?: number;
  startingStack?: number;
  settings?: Partial<TournamentSettings>;
};

export function normalizeSettings(raw?: Partial<TournamentSettings>): TournamentSettings {
  const payouts = (raw?.payouts ?? DEFAULT_PAYOUTS).map((payout) => ({
    place: payout.place,
    percent: payout.percent,
  }));

  return {
    lateRegistrationUntilLevel: raw?.lateRegistrationUntilLevel ?? DEFAULT_SETTINGS.lateRegistrationUntilLevel,
    payouts: payouts.length > 0 ? payouts : DEFAULT_PAYOUTS.map((payout) => ({ ...payout })),
  };
}

export function normalizeTournament(raw: LegacyTournament): Tournament {
  const entry: EntrySettings = raw.entry ?? {
    ...DEFAULT_ENTRY,
    buyInPrice: raw.buyIn ?? DEFAULT_ENTRY.buyInPrice,
    buyInChips: raw.startingStack ?? DEFAULT_ENTRY.buyInChips,
    rebuyPrice: raw.buyIn ?? DEFAULT_ENTRY.rebuyPrice,
    rebuyChips: raw.startingStack ?? DEFAULT_ENTRY.rebuyChips,
  };

  return {
    id: raw.id,
    name: raw.name,
    roomCode: raw.roomCode,
    entry,
    settings: normalizeSettings(raw.settings),
    levels: reindexBlindLevels(raw.levels.map((level) => normalizeLevel(level))),
    players: raw.players.map((player) => ({
      ...player,
      hasAddOn: player.hasAddOn ?? false,
    })),
    currentLevelIndex: raw.currentLevelIndex,
    timerStatus: raw.timerStatus,
    remainingSeconds: Number(raw.remainingSeconds) || 0,
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}

export function normalizeLevel(level: BlindLevel): BlindLevel {
  return {
    ...level,
    kind: level.kind ?? 'blinds',
  };
}

export function isBreakLevel(level: BlindLevel): boolean {
  return level.kind === 'break';
}

export function formatLevelDurationLabel(level: BlindLevel): string {
  const minutesLabel =
    level.durationMinutes === 1 ? '1 minute' : `${level.durationMinutes} minutes`;
  if (isBreakLevel(level)) {
    return `Pause de ${minutesLabel}`;
  }
  return `Niveau de ${minutesLabel}`;
}

export function reindexBlindLevels(levels: BlindLevel[]): BlindLevel[] {
  let blindNumber = 0;
  return levels.map((level) => {
    const normalized = normalizeLevel(level);
    if (isBreakLevel(normalized)) {
      return { ...normalized, level: 0 };
    }
    blindNumber += 1;
    return { ...normalized, level: blindNumber };
  });
}

export function getBlindLevelDisplayNumber(
  levels: BlindLevel[],
  index: number
): number | null {
  const current = levels[index];
  if (!current || isBreakLevel(current)) {
    return null;
  }
  return current.level;
}

export function getNextBlindLevel(
  levels: BlindLevel[],
  fromIndex: number
): BlindLevel | null {
  for (let i = fromIndex + 1; i < levels.length; i += 1) {
    const level = levels[i];
    if (level && !isBreakLevel(level)) {
      return level;
    }
  }
  return null;
}

export function getTournamentStatusLabel(tournament: Tournament): string {
  const current = tournament.levels[tournament.currentLevelIndex];
  if (!current) {
    return 'Tournoi';
  }
  if (isBreakLevel(current)) {
    return 'Pause';
  }
  return `Niveau ${current.level}`;
}

export function buildTournamentSummary(tournament: Tournament): SavedTournamentSummary {
  return {
    roomCode: tournament.roomCode,
    name: tournament.name,
    updatedAt: tournament.updatedAt,
    playerCount: tournament.players.length,
    statusLabel: getTournamentStatusLabel(tournament),
  };
}

export function formatLevelSummary(level: BlindLevel): string {
  if (isBreakLevel(level)) {
    return `Pause · ${level.durationMinutes} min`;
  }
  const summary = formatBlinds(level.smallBlind, level.bigBlind);
  const ante = level.ante > 0 ? ` · Ante ${formatChips(level.ante)}` : '';
  return `Niveau ${level.level} · ${summary}${ante} · ${level.durationMinutes} min`;
}

export function formatNextLevelPreview(level: BlindLevel): string {
  if (isBreakLevel(level)) {
    return `Pause · ${level.durationMinutes} min`;
  }
  const preview = formatBlinds(level.smallBlind, level.bigBlind);
  return `Niveau ${level.level} · ${preview} · ${level.durationMinutes} min`;
}

export function cloneDefaultLevels(): BlindLevel[] {
  return DEFAULT_LEVELS.map((level) => ({ ...level }));
}

export function createTournament(
  name: string,
  entry: EntrySettings = DEFAULT_ENTRY,
  levels: BlindLevel[] = cloneDefaultLevels()
): Tournament {
  const roomCode = generateRoomCode();
  const firstLevel = levels[0];

  return {
    id: roomCode,
    name,
    roomCode,
    entry: { ...entry },
    settings: {
      lateRegistrationUntilLevel: DEFAULT_SETTINGS.lateRegistrationUntilLevel,
      payouts: DEFAULT_PAYOUTS.map((payout) => ({ ...payout })),
    },
    levels: reindexBlindLevels(levels.map((level) => ({ ...level }))),
    players: [],
    currentLevelIndex: 0,
    timerStatus: 'paused',
    remainingSeconds: firstLevel.durationMinutes * 60,
    updatedAt: Date.now(),
  };
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatChips(value: number): string {
  return value.toLocaleString('fr-FR');
}

export function formatBlinds(smallBlind: number, bigBlind: number): string {
  return `${formatChips(smallBlind)} - ${formatChips(bigBlind)}`;
}

export function formatMoney(value: number): string {
  return `${value.toLocaleString('fr-FR')} €`;
}

export function getActivePlayers(tournament: Tournament) {
  return tournament.players.filter((player) => !player.isEliminated);
}

export function getBuyInCount(tournament: Tournament) {
  return tournament.players.length;
}

export function getRebuyCount(tournament: Tournament) {
  return tournament.players.reduce((total, player) => total + player.rebuys, 0);
}

export function getAddOnCount(tournament: Tournament) {
  return tournament.players.filter((player) => player.hasAddOn).length;
}

export function getTotalEntries(tournament: Tournament) {
  return getBuyInCount(tournament) + getRebuyCount(tournament) + getAddOnCount(tournament);
}

export function getPlayerChips(player: Player, tournament: Tournament) {
  const { entry } = tournament;
  return (
    entry.buyInChips +
    player.rebuys * entry.rebuyChips +
    (player.hasAddOn ? entry.addOnChips : 0)
  );
}

export function getTotalChips(tournament: Tournament) {
  return tournament.players.reduce(
    (total, player) => total + getPlayerChips(player, tournament),
    0
  );
}

export function getAverageStack(tournament: Tournament) {
  const activeCount = getActivePlayers(tournament).length;
  if (activeCount === 0) {
    return 0;
  }
  return Math.round(getTotalChips(tournament) / activeCount);
}

export function getMaxBlindLevel(levels: BlindLevel[]): number {
  return levels.reduce((max, level) => {
    if (isBreakLevel(level)) {
      return max;
    }
    return Math.max(max, level.level);
  }, 0);
}

export function getPreviousBlindLevelNumber(
  levels: BlindLevel[],
  index: number
): number | null {
  for (let i = index - 1; i >= 0; i -= 1) {
    const level = levels[i];
    if (level && !isBreakLevel(level)) {
      return level.level;
    }
  }
  return null;
}

export function isLateRegistrationOpen(tournament: Tournament): boolean {
  const untilLevel = tournament.settings.lateRegistrationUntilLevel;
  if (untilLevel <= 0) {
    return true;
  }

  const current = tournament.levels[tournament.currentLevelIndex];
  if (!current) {
    return false;
  }

  if (isBreakLevel(current)) {
    const previousBlind = getPreviousBlindLevelNumber(
      tournament.levels,
      tournament.currentLevelIndex
    );
    return previousBlind !== null && previousBlind < untilLevel;
  }

  return current.level <= untilLevel;
}

export function getLateRegistrationLabel(tournament: Tournament): string | null {
  const untilLevel = tournament.settings.lateRegistrationUntilLevel;
  if (untilLevel <= 0) {
    return null;
  }

  if (isLateRegistrationOpen(tournament)) {
    return `Entrées tardives jusqu’à la fin du niveau ${untilLevel}`;
  }

  return `Entrées tardives closes (fin du niveau ${untilLevel})`;
}

export function getPayoutBreakdown(tournament: Tournament) {
  const prizePool = getPrizePool(tournament);
  const payouts = [...tournament.settings.payouts].sort((a, b) => a.place - b.place);

  return payouts.map((payout) => ({
    ...payout,
    amount: Math.round((prizePool * payout.percent) / 100),
  }));
}

export function getPayoutPercentTotal(payouts: PayoutPlace[]): number {
  return payouts.reduce((total, payout) => total + payout.percent, 0);
}

export function formatPlaceLabel(place: number): string {
  if (place === 1) {
    return '1er';
  }
  if (place === 2) {
    return '2e';
  }
  if (place === 3) {
    return '3e';
  }
  return `${place}e`;
}

export function getPrizePool(tournament: Tournament) {
  const { entry } = tournament;
  return (
    getBuyInCount(tournament) * entry.buyInPrice +
    getRebuyCount(tournament) * entry.rebuyPrice +
    getAddOnCount(tournament) * entry.addOnPrice
  );
}

export function canAddRebuy(player: Player, tournament: Tournament) {
  if (!tournament.entry.rebuysEnabled) {
    return false;
  }
  if (tournament.entry.maxRebuysPerPlayer === 0) {
    return true;
  }
  return player.rebuys < tournament.entry.maxRebuysPerPlayer;
}

export function isEntryEditable(tournament: Tournament) {
  return tournament.players.length === 0;
}

export function canAddAddOn(player: Player, tournament: Tournament) {
  return tournament.entry.addOnEnabled && !player.hasAddOn;
}

export function tournamentReducer(
  state: Tournament,
  action: TournamentAction
): Tournament {
  const touch = (next: Tournament): Tournament => ({
    ...next,
    updatedAt: Date.now(),
  });

  switch (action.type) {
    case 'LOAD':
      return normalizeTournament(action.tournament);
    case 'SET_NAME':
      return touch({ ...state, name: action.name });
    case 'SET_ENTRY':
      if (!isEntryEditable(state)) {
        return state;
      }
      return touch({ ...state, entry: action.entry });
    case 'SET_SETTINGS':
      return touch({
        ...state,
        settings: normalizeSettings(action.settings),
      });
    case 'SET_LEVELS': {
      const levels = reindexBlindLevels(action.levels);
      const currentId = state.levels[state.currentLevelIndex]?.id;
      const newIndex = Math.max(
        0,
        Math.min(
          currentId ? levels.findIndex((level) => level.id === currentId) : 0,
          levels.length - 1
        )
      );
      const resolvedIndex = newIndex >= 0 ? newIndex : 0;
      const newCurrent = levels[resolvedIndex];
      const oldCurrent = state.levels[state.currentLevelIndex];
      let remainingSeconds = state.remainingSeconds;

      if (newCurrent && oldCurrent?.id === newCurrent.id) {
        if (newCurrent.durationMinutes !== oldCurrent.durationMinutes) {
          if (state.timerStatus === 'paused') {
            remainingSeconds = newCurrent.durationMinutes * 60;
          } else {
            remainingSeconds = Math.min(
              remainingSeconds,
              newCurrent.durationMinutes * 60
            );
          }
        }
      } else if (newCurrent) {
        remainingSeconds = newCurrent.durationMinutes * 60;
        return touch({
          ...state,
          levels,
          currentLevelIndex: resolvedIndex,
          remainingSeconds,
          timerStatus: 'paused',
        });
      }

      return touch({
        ...state,
        levels,
        currentLevelIndex: resolvedIndex,
        remainingSeconds,
      });
    }
    case 'ADD_LEVEL': {
      const levels = reindexBlindLevels([...state.levels, action.level]);
      return touch({ ...state, levels });
    }
    case 'UPDATE_LEVEL': {
      const currentLevel = state.levels[state.currentLevelIndex];
      const isCurrentLevel = currentLevel?.id === action.level.id;
      let remainingSeconds = state.remainingSeconds;

      if (
        isCurrentLevel &&
        action.level.durationMinutes !== currentLevel.durationMinutes
      ) {
        if (state.timerStatus === 'paused') {
          remainingSeconds = action.level.durationMinutes * 60;
        } else {
          remainingSeconds = Math.min(
            remainingSeconds,
            action.level.durationMinutes * 60
          );
        }
      }

      const levels = reindexBlindLevels(
        state.levels.map((level) => (level.id === action.level.id ? action.level : level))
      );

      return touch({
        ...state,
        levels,
        remainingSeconds,
      });
    }
    case 'REMOVE_LEVEL': {
      const levels = reindexBlindLevels(
        state.levels.filter((level) => level.id !== action.levelId)
      );
      return touch({
        ...state,
        levels,
        currentLevelIndex: Math.min(state.currentLevelIndex, Math.max(levels.length - 1, 0)),
      });
    }
    case 'ADD_PLAYER':
      return touch({ ...state, players: [...state.players, action.player] });
    case 'UPDATE_PLAYER':
      return touch({
        ...state,
        players: state.players.map((player) =>
          player.id === action.player.id ? action.player : player
        ),
      });
    case 'REMOVE_PLAYER':
      return touch({
        ...state,
        players: state.players.filter((player) => player.id !== action.playerId),
      });
    case 'TOGGLE_ELIMINATED':
      return touch({
        ...state,
        players: state.players.map((player) =>
          player.id === action.playerId
            ? { ...player, isEliminated: !player.isEliminated }
            : player
        ),
      });
    case 'ADD_REBUY': {
      const player = state.players.find((item) => item.id === action.playerId);
      if (!player || !canAddRebuy(player, state)) {
        return state;
      }
      return touch({
        ...state,
        players: state.players.map((item) =>
          item.id === action.playerId
            ? { ...item, rebuys: item.rebuys + 1, isEliminated: false }
            : item
        ),
      });
    }
    case 'ADD_ADDON': {
      const player = state.players.find((item) => item.id === action.playerId);
      if (!player || !canAddAddOn(player, state)) {
        return state;
      }
      return touch({
        ...state,
        players: state.players.map((item) =>
          item.id === action.playerId ? { ...item, hasAddOn: true } : item
        ),
      });
    }
    case 'SET_LEVEL_INDEX': {
      const level = state.levels[action.index];
      if (!level) {
        return state;
      }
      return touch({
        ...state,
        currentLevelIndex: action.index,
        remainingSeconds: level.durationMinutes * 60,
        timerStatus: 'paused',
      });
    }
    case 'NEXT_LEVEL': {
      const nextIndex = Math.min(state.currentLevelIndex + 1, state.levels.length - 1);
      const level = state.levels[nextIndex];
      if (!level) {
        return state;
      }
      return touch({
        ...state,
        currentLevelIndex: nextIndex,
        remainingSeconds: level.durationMinutes * 60,
        timerStatus: 'paused',
      });
    }
    case 'PREVIOUS_LEVEL': {
      const prevIndex = Math.max(state.currentLevelIndex - 1, 0);
      const level = state.levels[prevIndex];
      if (!level) {
        return state;
      }
      return touch({
        ...state,
        currentLevelIndex: prevIndex,
        remainingSeconds: level.durationMinutes * 60,
        timerStatus: 'paused',
      });
    }
    case 'PLAY':
      return touch({ ...state, timerStatus: 'running' });
    case 'PAUSE':
      return touch({
        ...state,
        timerStatus: 'paused',
        remainingSeconds: getComputedRemainingSeconds(state),
      });
    case 'TICK':
      if (state.timerStatus !== 'running' || state.remainingSeconds <= 0) {
        return state;
      }
      return touch({
        ...state,
        remainingSeconds: state.remainingSeconds - 1,
      });
    case 'ADJUST_TIME':
      return touch({
        ...state,
        remainingSeconds: Math.max(0, state.remainingSeconds + action.deltaSeconds),
      });
    case 'RESET_LEVEL_TIMER': {
      const level = state.levels[state.currentLevelIndex];
      if (!level) {
        return state;
      }
      return touch({
        ...state,
        remainingSeconds: level.durationMinutes * 60,
        timerStatus: 'paused',
      });
    }
    default:
      return state;
  }
}
