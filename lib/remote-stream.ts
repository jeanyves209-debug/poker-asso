import { getSyncUrl } from '@/lib/config';
import { normalizeTournament } from '@/lib/tournament-utils';
import { Tournament } from '@/types/tournament';

export function isLiveStreamSupported(): boolean {
  return typeof EventSource !== 'undefined' && getSyncUrl() !== null;
}

export function subscribeToTournamentStream(
  roomCode: string,
  listener: (tournament: Tournament) => void
): () => void {
  const baseUrl = getSyncUrl();
  if (!baseUrl || typeof EventSource === 'undefined') {
    return () => {};
  }

  const url = `${baseUrl}/api/tournaments/${roomCode.toUpperCase()}/stream`;
  const source = new EventSource(url);

  source.onmessage = (event) => {
    if (!event.data) {
      return;
    }
    try {
      listener(normalizeTournament(JSON.parse(event.data) as Tournament));
    } catch {
      // Ignore malformed payloads.
    }
  };

  source.onerror = () => {
    // EventSource reconnects automatically.
  };

  return () => source.close();
}
