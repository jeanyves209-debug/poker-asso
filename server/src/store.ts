import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type StoredTournament = {
  updatedAt: number;
  roomCode: string;
  [key: string]: unknown;
};

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(moduleDir, '..', 'data');
const dataFile = process.env.DATA_FILE || path.join(dataDir, 'tournaments.json');

const memory = new Map<string, StoredTournament>();
let persistQueue: Promise<void> = Promise.resolve();

async function loadFromDisk(): Promise<void> {
  try {
    const raw = await fs.readFile(dataFile, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, StoredTournament>;
    Object.entries(parsed).forEach(([roomCode, tournament]) => {
      memory.set(roomCode.toUpperCase(), tournament);
    });
  } catch {
    // First run or missing file.
  }
}

function schedulePersist(): void {
  persistQueue = persistQueue.then(async () => {
    await fs.mkdir(dataDir, { recursive: true });
    const payload = Object.fromEntries(memory.entries());
    await fs.writeFile(dataFile, JSON.stringify(payload, null, 2), 'utf-8');
  });
}

export async function initStore(): Promise<void> {
  await loadFromDisk();
}

export function getTournament(roomCode: string): StoredTournament | null {
  return memory.get(roomCode.toUpperCase()) ?? null;
}

export function saveTournament(tournament: StoredTournament): StoredTournament {
  const code = tournament.roomCode.toUpperCase();
  const existing = memory.get(code);

  if (existing && existing.updatedAt > tournament.updatedAt) {
    return existing;
  }

  const next = { ...tournament, roomCode: code };
  memory.set(code, next);
  schedulePersist();
  return next;
}
