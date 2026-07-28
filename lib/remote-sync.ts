import { getSyncUrl } from '@/lib/config';
import { normalizeTournament } from '@/lib/tournament-utils';
import { Tournament } from '@/types/tournament';

const READ_TIMEOUT_MS = 15000;
const WRITE_TIMEOUT_MS = 45000;
const MAX_ATTEMPTS = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = READ_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function withRetries<T>(run: () => Promise<T | null>): Promise<T | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const result = await run();
    if (result !== null) {
      return result;
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

export async function fetchRemoteTournament(roomCode: string): Promise<Tournament | null> {
  const baseUrl = getSyncUrl();
  if (!baseUrl) {
    return null;
  }

  const code = roomCode.toUpperCase();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/tournaments/${code}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as Tournament;
      return normalizeTournament(payload);
    } catch {
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(2000 * (attempt + 1));
      }
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

  const saved = await withRetries(async () => {
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
        return null;
      }
      const payload = (await response.json()) as Tournament;
      return normalizeTournament(payload);
    } catch {
      return null;
    }
  });

  return saved !== null;
}

export async function checkRemoteSyncHealth(): Promise<boolean> {
  const baseUrl = getSyncUrl();
  if (!baseUrl) {
    return false;
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl}/health`, undefined, WRITE_TIMEOUT_MS);
    return response.ok;
  } catch {
    return false;
  }
}

export async function verifyRemoteTournament(roomCode: string): Promise<boolean> {
  const tournament = await fetchRemoteTournament(roomCode);
  return tournament !== null;
}
