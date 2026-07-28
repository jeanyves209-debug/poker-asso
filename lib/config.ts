export function getSyncUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_SYNC_URL?.trim();
  return url ? url.replace(/\/$/, '') : null;
}

export function getAppUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_APP_URL?.trim();
  return url ? url.replace(/\/$/, '') : null;
}

export function isRemoteSyncEnabled(): boolean {
  return getSyncUrl() !== null;
}
