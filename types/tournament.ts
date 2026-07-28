export type TimerStatus = 'running' | 'paused';

export type LevelKind = 'blinds' | 'break';

export type BlindLevel = {
  id: string;
  level: number;
  kind: LevelKind;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
};

export type EntrySettings = {
  buyInPrice: number;
  buyInChips: number;
  rebuysEnabled: boolean;
  rebuyPrice: number;
  rebuyChips: number;
  maxRebuysPerPlayer: number;
  addOnEnabled: boolean;
  addOnPrice: number;
  addOnChips: number;
};

export type Player = {
  id: string;
  name: string;
  isEliminated: boolean;
  rebuys: number;
  hasAddOn: boolean;
};

export type PayoutPlace = {
  place: number;
  percent: number;
};

export type TournamentSettings = {
  lateRegistrationUntilLevel: number;
  payouts: PayoutPlace[];
};

export type Tournament = {
  id: string;
  name: string;
  roomCode: string;
  entry: EntrySettings;
  settings: TournamentSettings;
  levels: BlindLevel[];
  players: Player[];
  currentLevelIndex: number;
  timerStatus: TimerStatus;
  remainingSeconds: number;
  updatedAt: number;
};

export type TournamentAction =
  | { type: 'LOAD'; tournament: Tournament }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_ENTRY'; entry: EntrySettings }
  | { type: 'SET_SETTINGS'; settings: TournamentSettings }
  | { type: 'SET_LEVELS'; levels: BlindLevel[] }
  | { type: 'ADD_LEVEL'; level: BlindLevel }
  | { type: 'UPDATE_LEVEL'; level: BlindLevel }
  | { type: 'REMOVE_LEVEL'; levelId: string }
  | { type: 'ADD_PLAYER'; player: Player }
  | { type: 'UPDATE_PLAYER'; player: Player }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'TOGGLE_ELIMINATED'; playerId: string }
  | { type: 'ADD_REBUY'; playerId: string }
  | { type: 'ADD_ADDON'; playerId: string }
  | { type: 'SET_LEVEL_INDEX'; index: number }
  | { type: 'NEXT_LEVEL' }
  | { type: 'PREVIOUS_LEVEL' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TICK' }
  | { type: 'ADJUST_TIME'; deltaSeconds: number }
  | { type: 'RESET_LEVEL_TIMER' };

export const DEFAULT_PAYOUTS: PayoutPlace[] = [
  { place: 1, percent: 50 },
  { place: 2, percent: 30 },
  { place: 3, percent: 20 },
];

export const DEFAULT_SETTINGS: TournamentSettings = {
  lateRegistrationUntilLevel: 4,
  payouts: DEFAULT_PAYOUTS,
};

export const DEFAULT_ENTRY: EntrySettings = {
  buyInPrice: 20,
  buyInChips: 10000,
  rebuysEnabled: true,
  rebuyPrice: 20,
  rebuyChips: 10000,
  maxRebuysPerPlayer: 1,
  addOnEnabled: true,
  addOnPrice: 10,
  addOnChips: 10000,
};
