import { Platform, Share } from 'react-native';

import { getAppUrl } from '@/lib/config';
import {
  fetchRemoteTournament,
  fetchRemoteTournamentQuick,
  saveRemoteTournament,
} from '@/lib/remote-sync';
import {
  getActiveSyncUrls,
  isAnySyncEnabled,
  isLocalNetworkUrl,
} from '@/lib/sync-url';
import { storageGetItem, storageSetItem } from '@/lib/storage';
import { buildTournamentSummary, normalizeTournament } from '@/lib/tournament-utils';
import { SavedTournamentSummary } from '@/types/saved-tournament';
import { Tournament } from '@/types/tournament';

const RECENT_KEY = 'poker-asso:recent-v1';
const LAST_ACTIVE_KEY = 'poker-asso:last-active';
const MAX_RECENT = 12;
const CLOUD_SAVE_DEBOUNCE_MS = 4000;
const CLOUD_SAVE_DEBOUNCE_RUNNING_MS = 1500;

function storageKey(roomCode: string) {
  return `poker-asso:${roomCode}`;
}

let cloudSaveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingCloudTournament: Tournament | null = null;

async function readLocalTournament(roomCode: string): Promise<Tournament | null> {
  const payload = await storageGetItem(storageKey(roomCode.toUpperCase()));
  if (!payload) {
    return null;
  }

  try {
    return normalizeTournament(JSON.parse(payload) as Tournament);
  } catch {
    return null;
  }
}

async function writeLocalTournament(tournament: Tournament): Promise<void> {
  await storageSetItem(storageKey(tournament.roomCode), JSON.stringify(tournament));
}

function pickLatestTournament(
  remote: Tournament | null,
  local: Tournament | null
): Tournament | null {
  if (remote && local) {
    return remote.updatedAt >= local.updatedAt ? remote : local;
  }
  return remote ?? local;
}

async function saveToCloudEndpoints(tournament: Tournament): Promise<boolean> {
  const cloudUrls = (await getActiveSyncUrls()).filter((url) => !isLocalNetworkUrl(url));
  if (cloudUrls.length === 0) {
    return true;
  }
  const results = await Promise.all(
    cloudUrls.map((url) => saveRemoteTournament(tournament, url))
  );
  return results.some(Boolean);
}

function flushScheduledCloudSave(): Promise<boolean> {
  if (cloudSaveTimeout) {
    clearTimeout(cloudSaveTimeout);
    cloudSaveTimeout = null;
  }
  const tournament = pendingCloudTournament;
  pendingCloudTournament = null;
  if (!tournament) {
    return Promise.resolve(true);
  }
  return saveToCloudEndpoints(tournament);
}

function scheduleCloudSave(tournament: Tournament): void {
  pendingCloudTournament = tournament;
  const delay =
    tournament.timerStatus === 'running'
      ? CLOUD_SAVE_DEBOUNCE_RUNNING_MS
      : CLOUD_SAVE_DEBOUNCE_MS;
  if (cloudSaveTimeout) {
    return;
  }
  cloudSaveTimeout = setTimeout(() => {
    cloudSaveTimeout = null;
    const payload = pendingCloudTournament;
    pendingCloudTournament = null;
    if (payload) {
      void saveToCloudEndpoints(payload);
    }
  }, delay);
}

async function saveToLocalEndpoints(tournament: Tournament): Promise<void> {
  const localUrls = (await getActiveSyncUrls()).filter(isLocalNetworkUrl);
  if (localUrls.length === 0) {
    return;
  }
  await Promise.all(localUrls.map((url) => saveRemoteTournament(tournament, url)));
}

export async function saveTournament(
  tournament: Tournament,
  options?: { immediate?: boolean }
): Promise<boolean> {
  await writeLocalTournament(tournament);
  await storageSetItem(LAST_ACTIVE_KEY, tournament.roomCode);
  await updateRecentIndex(tournament);

  void saveToLocalEndpoints(tournament);

  let cloudSaved = true;
  const cloudUrls = (await getActiveSyncUrls()).filter((url) => !isLocalNetworkUrl(url));
  if (cloudUrls.length > 0) {
    if (options?.immediate) {
      await flushScheduledCloudSave();
      cloudSaved = await saveToCloudEndpoints(tournament);
    } else {
      scheduleCloudSave(tournament);
    }
  }

  publishTournament(tournament);
  return cloudSaved;
}

export async function pushTournamentToCloud(tournament: Tournament): Promise<boolean> {
  if (!(await isAnySyncEnabled())) {
    return false;
  }
  await writeLocalTournament(tournament);
  await flushScheduledCloudSave();
  await saveToLocalEndpoints(tournament);
  return saveToCloudEndpoints(tournament);
}

async function updateRecentIndex(tournament: Tournament): Promise<void> {
  const summary = buildTournamentSummary(tournament);
  const raw = await storageGetItem(RECENT_KEY);
  let recent: SavedTournamentSummary[] = [];
  if (raw) {
    try {
      recent = JSON.parse(raw) as SavedTournamentSummary[];
    } catch {
      recent = [];
    }
  }
  const next = [
    summary,
    ...recent.filter((item) => item.roomCode !== tournament.roomCode),
  ].slice(0, MAX_RECENT);
  await storageSetItem(RECENT_KEY, JSON.stringify(next));
}

export async function loadTournament(
  roomCode: string,
  options?: { quick?: boolean }
): Promise<Tournament | null> {
  const code = roomCode.toUpperCase();
  const syncEnabled = await isAnySyncEnabled();
  const remotePromise = syncEnabled
    ? options?.quick
      ? fetchRemoteTournamentQuick(code)
      : fetchRemoteTournament(code)
    : Promise.resolve(null);

  const [remote, local] = await Promise.all([remotePromise, readLocalTournament(code)]);

  const tournament = pickLatestTournament(remote, local);
  if (tournament) {
    await writeLocalTournament(tournament);
  }
  return tournament;
}

export async function loadRecentTournaments(): Promise<SavedTournamentSummary[]> {
  const raw = await storageGetItem(RECENT_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as SavedTournamentSummary[];
  } catch {
    return [];
  }
}

export async function loadLastActiveRoomCode(): Promise<string | null> {
  const code = await storageGetItem(LAST_ACTIVE_KEY);
  return code ? code.toUpperCase() : null;
}

type SyncMessage = {
  type: 'STATE_UPDATE';
  payload: Tournament;
};

type SyncListener = (tournament: Tournament) => void;

const listeners = new Map<string, Set<SyncListener>>();
const channels = new Map<string, BroadcastChannel>();

function getChannel(roomCode: string): BroadcastChannel | null {
  if (Platform.OS !== 'web' || typeof BroadcastChannel === 'undefined') {
    return null;
  }

  if (!channels.has(roomCode)) {
    const channel = new BroadcastChannel(`poker-asso-${roomCode}`);
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      if (event.data?.type !== 'STATE_UPDATE') {
        return;
      }
      const roomListeners = listeners.get(roomCode);
      roomListeners?.forEach((listener) => listener(event.data.payload));
    };
    channels.set(roomCode, channel);
  }

  return channels.get(roomCode) ?? null;
}

export function publishTournament(tournament: Tournament): void {
  const channel = getChannel(tournament.roomCode);
  channel?.postMessage({ type: 'STATE_UPDATE', payload: tournament } satisfies SyncMessage);
}

export function subscribeToTournament(
  roomCode: string,
  listener: SyncListener
): () => void {
  const code = roomCode.toUpperCase();
  getChannel(code);

  if (!listeners.has(code)) {
    listeners.set(code, new Set());
  }

  listeners.get(code)?.add(listener);

  return () => {
    listeners.get(code)?.delete(listener);
    if ((listeners.get(code)?.size ?? 0) === 0) {
      listeners.delete(code);
    }
  };
}

function buildDisplayPath(roomCode: string): string {
  const appUrl = getAppUrl();
  if (appUrl) {
    return `${appUrl}/display/${roomCode}`;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/display/${roomCode}`;
  }

  return `pokerasso://display/${roomCode}`;
}

export function getDisplayUrl(roomCode: string): string {
  return buildDisplayPath(roomCode);
}

export async function getDisplayUrlAsync(roomCode: string): Promise<string> {
  return buildDisplayPath(roomCode);
}

export function getControlUrl(roomCode: string): string {
  const appUrl = getAppUrl();
  if (appUrl) {
    return `${appUrl}/control/${roomCode}`;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/control/${roomCode}`;
  }

  return `pokerasso://control/${roomCode}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  await Share.share({ message: text });
}

export { getLocalSyncUrl, setLocalSyncUrl, isAnySyncEnabled, isLocalSyncEnabled } from '@/lib/sync-url';
