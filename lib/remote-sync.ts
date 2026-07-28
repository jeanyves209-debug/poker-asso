import { getActiveSyncUrls, isLocalNetworkUrl } from '@/lib/sync-url';
import { normalizeTournament } from '@/lib/tournament-utils';
import { Tournament } from '@/types/tournament';

const LOCAL_READ_TIMEOUT_MS = 3000;
const LOCAL_WRITE_TIMEOUT_MS = 5000;
const CLOUD_READ_TIMEOUT_MS = 10000;
const CLOUD_WRITE_TIMEOUT_MS = 45000;
const LOAD_MAX_ATTEMPTS = 2;
const SAVE_MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTimeouts(baseUrl: string) {
  if (isLocalNetworkUrl(baseUrl)) {
    return { read: LOCAL_READ_TIMEOUT_MS, write: LOCAL_WRITE_TIMEOUT_MS, saveAttempts: 1 };
  }
  return { read: CLOUD_READ_TIMEOUT_MS, write: CLOUD_WRITE_TIMEOUT_MS, saveAttempts: SAVE_MAX_ATTEMPTS };
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = CLOUD_READ_TIMEOUT_MS
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

export async function fetchTournamentFromBase(
  baseUrl: string,
  roomCode: string,
  quick = true
): Promise<Tournament | null> {
  const code = roomCode.toUpperCase();
  const { read } = getTimeouts(baseUrl);
  const attempts = quick ? 1 : LOAD_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/tournaments/${code}`, undefined, read);
      const tournament = await parseTournamentResponse(response);
      if (tournament || response.status === 404) {
        return tournament;
      }
    } catch {
      // Retry on network errors only.
    }
    if (attempt < attempts - 1) {
      await sleep(isLocalNetworkUrl(baseUrl) ? 200 : 1500);
    }
  }

  return null;
}

export async function fetchRemoteTournamentQuick(roomCode: string): Promise<Tournament | null> {
  return fetchTournamentFromNetwork(roomCode, true);
}

export async function fetchRemoteTournament(roomCode: string): Promise<Tournament | null> {
  return fetchTournamentFromNetwork(roomCode, false);
}

export async function fetchTournamentFromNetwork(
  roomCode: string,
  quick: boolean
): Promise<Tournament | null> {
  const urls = await getActiveSyncUrls();
  if (urls.length === 0) {
    return null;
  }

  const results = await Promise.all(
    urls.map((baseUrl) => fetchTournamentFromBase(baseUrl, roomCode, quick))
  );

  let best: Tournament | null = null;
  for (const tournament of results) {
    if (!tournament) {
      continue;
    }
    if (!best || tournament.updatedAt > best.updatedAt) {
      best = tournament;
    }
  }
  return best;
}

export async function saveRemoteTournament(
  tournament: Tournament,
  baseUrl?: string
): Promise<boolean> {
  const urls = baseUrl ? [baseUrl] : await getActiveSyncUrls();
  if (urls.length === 0) {
    return false;
  }

  const results = await Promise.all(urls.map((url) => saveTournamentToBase(tournament, url)));
  return results.some(Boolean);
}

async function saveTournamentToBase(tournament: Tournament, baseUrl: string): Promise<boolean> {
  const code = tournament.roomCode.toUpperCase();
  const { write, saveAttempts } = getTimeouts(baseUrl);

  for (let attempt = 0; attempt < saveAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        `${baseUrl}/api/tournaments/${code}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tournament),
        },
        write
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return true;
    } catch {
      if (attempt < saveAttempts - 1) {
        await sleep(isLocalNetworkUrl(baseUrl) ? 300 : 2000 * (attempt + 1));
      }
    }
  }

  return false;
}

export async function checkRemoteSyncHealth(baseUrl?: string): Promise<boolean> {
  const urls = baseUrl ? [baseUrl] : await getActiveSyncUrls();
  if (urls.length === 0) {
    return false;
  }

  const checks = await Promise.all(
    urls.map(async (url) => {
      try {
        const { read } = getTimeouts(url);
        const response = await fetchWithTimeout(`${url}/health`, undefined, read);
        return response.ok;
      } catch {
        return false;
      }
    })
  );

  return checks.some(Boolean);
}

export async function checkLocalSyncHealth(): Promise<boolean> {
  const { getLocalSyncUrl } = await import('@/lib/sync-url');
  const local = await getLocalSyncUrl();
  if (!local) {
    return false;
  }
  return checkRemoteSyncHealth(local);
}
