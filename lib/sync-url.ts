import { getSyncUrl } from '@/lib/config';
import { storageGetItem, storageSetItem } from '@/lib/storage';

const LOCAL_SYNC_KEY = 'poker-asso:local-sync-url';

let displaySyncOverride: string | null = null;

function normalizeUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

export function isLocalNetworkUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }
    if (hostname.endsWith('.local')) {
      return true;
    }
    if (hostname.startsWith('192.168.')) {
      return true;
    }
    if (hostname.startsWith('10.')) {
      return true;
    }
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function setDisplaySyncOverride(url: string | null): void {
  displaySyncOverride = url ? normalizeUrl(url) : null;
}

export async function getLocalSyncUrl(): Promise<string | null> {
  if (displaySyncOverride) {
    return displaySyncOverride;
  }
  const stored = await storageGetItem(LOCAL_SYNC_KEY);
  return stored ? normalizeUrl(stored) : null;
}

export async function setLocalSyncUrl(url: string): Promise<void> {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    await storageSetItem(LOCAL_SYNC_KEY, '');
    return;
  }
  await storageSetItem(LOCAL_SYNC_KEY, normalized);
}

export function getCloudSyncUrl(): string | null {
  return getSyncUrl();
}

export async function getActiveSyncUrls(): Promise<string[]> {
  const urls: string[] = [];
  const local = await getLocalSyncUrl();
  const cloud = getCloudSyncUrl();

  if (local) {
    urls.push(local);
  }
  if (cloud && cloud !== local) {
    urls.push(cloud);
  }
  return urls;
}

export async function isLocalSyncEnabled(): Promise<boolean> {
  const local = await getLocalSyncUrl();
  return local !== null && local.length > 0;
}

export async function isAnySyncEnabled(): Promise<boolean> {
  const urls = await getActiveSyncUrls();
  return urls.length > 0;
}
