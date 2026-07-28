import { getSyncUrl } from '@/lib/config';
import { normalizeTournament } from '@/lib/tournament-utils';
import { Tournament } from '@/types/tournament';

const QUICK_READ_TIMEOUT_MS = 10000;
const LOAD_READ_TIMEOUT_MS = 15000;
const WRITE_TIMEOUT_MS = 45000;
const LOAD_MAX_ATTEMPTS = 2;
const SAVE_MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = QUICK_READ_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseTournamentResponse(response: Response): Promise<Tournament | null> {
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as Tournament;
  return normalizeTournament(payload);
}

export async function fetchRemoteTournamentQuick(roomCode: string): Promise<Tournament | null> {
  const baseUrl = getSyncUrl();
  if (!baseUrl) {
    return null;
  }

  const code = roomCode.toUpperCase();

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/tournaments/${code}`);
    return parseTournamentResponse(response);
  } catch {
    return null;
  }
}

export async function fetchRemoteTournament(roomCode: string): Promise<Tournament | null> {
  const baseUrl = getSyncUrl();
  if (!baseUrl) {
    return null;
  }

  const code = roomCode.toUpperCase();

  for (let attempt = 0; attempt < LOAD_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        `${baseUrl}/api/tournaments/${code}`,
        undefined,
        LOAD_READ_TIMEOUT_MS
      );
      const tournament = await parseTournamentResponse(response);
      if (tournament || response.status === 404) {
        return tournament;
      }
    } catch {
      // Retry on network errors only.
    }
    if (attempt < LOAD_MAX_ATTEMPTS - 1) {
      await sleep(1500);
    }
  }

  return null;
}

export async function saveRemoteTournament(tournament: Tournament): Promise<boolean> {
  const baseUrl = getSyncUrl();
  if (!baseUrl) {
    return false;
  }

  const code = tournament.roomCode.toUpperCase();

  for (let attempt = 0; attempt < SAVE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        `${baseUrl}/api/tournaments/${code}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tournament),
        },
        WRITE_TIMEOUT_MS
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return true;
    } catch {
      if (attempt < SAVE_MAX_ATTEMPTS - 1) {
        await sleep(2000 * (attempt + 1));
      }
    }
  }

  return false;
}

export async function checkRemoteSyncHealth(): Promise<boolean> {
  const baseUrl = getSyncUrl();
  if (!baseUrl) {
    return false;
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl}/health`, undefined, QUICK_READ_TIMEOUT_MS);
    return response.ok;
  } catch {
    return false;
  }
}
