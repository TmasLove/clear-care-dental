import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// expo-secure-store uses hardware-backed keychain on iOS/Android (native only).
// On web, fall back to AsyncStorage (sessionStorage-backed in browsers).
const isWeb = Platform.OS === 'web';

const store = {
  async get(key) {
    if (isWeb) return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key, value) {
    if (isWeb) return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key) {
    if (isWeb) return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

const KEYS = {
  TOKEN: 'clear_care_token',
  USER: 'clear_care_user',
  REFRESH_TOKEN: 'clear_care_refresh_token',
};

export const storage = {
  async getToken() {
    try { return await store.get(KEYS.TOKEN); } catch { return null; }
  },
  async setToken(token) {
    try { await store.set(KEYS.TOKEN, token); } catch (e) { console.error('Failed to save token', e); }
  },
  async removeToken() {
    try { await store.remove(KEYS.TOKEN); } catch (e) { console.error('Failed to remove token', e); }
  },

  async getUser() {
    try {
      const json = await store.get(KEYS.USER);
      return json ? JSON.parse(json) : null;
    } catch { return null; }
  },
  async setUser(user) {
    try { await store.set(KEYS.USER, JSON.stringify(user)); } catch (e) { console.error('Failed to save user', e); }
  },
  async removeUser() {
    try { await store.remove(KEYS.USER); } catch (e) { console.error('Failed to remove user', e); }
  },

  async getRefreshToken() {
    try { return await store.get(KEYS.REFRESH_TOKEN); } catch { return null; }
  },
  async setRefreshToken(token) {
    try { await store.set(KEYS.REFRESH_TOKEN, token); } catch (e) { console.error('Failed to save refresh token', e); }
  },

  async clearAll() {
    try {
      await Promise.all([
        store.remove(KEYS.TOKEN),
        store.remove(KEYS.USER),
        store.remove(KEYS.REFRESH_TOKEN),
      ]);
    } catch (e) { console.error('Failed to clear storage', e); }
  },

  async setItem(key, value) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await store.set(key, serialized);
    } catch (e) { console.error(`Failed to set ${key}`, e); }
  },
  async getItem(key) {
    try { return await store.get(key); } catch { return null; }
  },
  async removeItem(key) {
    try { await store.remove(key); } catch (e) { console.error(`Failed to remove ${key}`, e); }
  },
};
