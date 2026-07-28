import { BlindLevel, LevelKind } from '@/types/tournament';

function createLevel(
  level: number,
  smallBlind: number,
  bigBlind: number,
  ante = 0,
  durationMinutes = 20,
  kind: LevelKind = 'blinds'
): BlindLevel {
  return {
    id: `level-${level}`,
    level,
    kind,
    smallBlind,
    bigBlind,
    ante,
    durationMinutes,
  };
}

export function createBreakLevel(durationMinutes = 15): BlindLevel {
  return {
    id: `break-${Date.now()}`,
    level: 0,
    kind: 'break',
    smallBlind: 0,
    bigBlind: 0,
    ante: 0,
    durationMinutes,
  };
}

export const DEFAULT_LEVELS: BlindLevel[] = [
  createLevel(1, 25, 50),
  createLevel(2, 50, 100),
  createLevel(3, 75, 150),
  createLevel(4, 100, 200),
  createLevel(5, 150, 300),
  createLevel(6, 200, 400),
  createLevel(7, 300, 600),
  createLevel(8, 400, 800),
  createLevel(9, 500, 1000),
  createLevel(10, 600, 1200),
  createLevel(11, 800, 1600),
  createLevel(12, 1000, 2000),
];
