import { getSyncUrl } from '@/lib/config';
import { normalizeTournament } from '@/lib/tournament-utils';
import { Tournament } from '@/types/tournament';

const REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRemoteTournament(roomCode: string): Promise<Tournament | null> {
  const baseUrl = getSyncUrl();
  if (!baseUrl) {
    return null;
  }

  const code = roomCode.toUpperCase();

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/tournaments/${code}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as Tournament;
    return normalizeTournament(payload);
  } catch {
    return null;
  }
}

export async function saveRemoteTournament(tournament: Tournament): Promise<Tournament | null> {
  const baseUrl = getSyncUrl();
  if (!baseUrl) {
    return null;
  }

  const code = tournament.roomCode.toUpperCase();

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/tournaments/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tournament),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as Tournament;
    return normalizeTournament(payload);
  } catch {
    return null;
  }
}

export async function checkRemoteSyncHealth(): Promise<boolean> {
  const baseUrl = getSyncUrl();
  if (!baseUrl) {
    return false;
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
