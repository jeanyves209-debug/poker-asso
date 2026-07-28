import { Platform } from 'react-native';

const memoryStore = new Map<string, string>();

export async function storageGetItem(key: string): Promise<string | null> {
  if (memoryStore.has(key)) {
    return memoryStore.get(key) ?? null;
  }

  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function storageSetItem(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);

  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(key, value);
  } catch {
    // AsyncStorage optional until installed on native.
  }
}
