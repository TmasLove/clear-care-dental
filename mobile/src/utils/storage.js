import * as SecureStore from 'expo-secure-store';

const KEYS = {
  TOKEN: 'clear_care_token',
  USER: 'clear_care_user',
  REFRESH_TOKEN: 'clear_care_refresh_token',
};

export const storage = {
  async getToken() {
    try {
      return await SecureStore.getItemAsync(KEYS.TOKEN);
    } catch {
      return null;
    }
  },

  async setToken(token) {
    try {
      await SecureStore.setItemAsync(KEYS.TOKEN, token);
    } catch (e) {
      console.error('Failed to save token', e);
    }
  },

  async removeToken() {
    try {
      await SecureStore.deleteItemAsync(KEYS.TOKEN);
    } catch (e) {
      console.error('Failed to remove token', e);
    }
  },

  async getUser() {
    try {
      const json = await SecureStore.getItemAsync(KEYS.USER);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  },

  async setUser(user) {
    try {
      await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user', e);
    }
  },

  async removeUser() {
    try {
      await SecureStore.deleteItemAsync(KEYS.USER);
    } catch (e) {
      console.error('Failed to remove user', e);
    }
  },

  async getRefreshToken() {
    try {
      return await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token) {
    try {
      await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
    } catch (e) {
      console.error('Failed to save refresh token', e);
    }
  },

  async clearAll() {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(KEYS.TOKEN),
        SecureStore.deleteItemAsync(KEYS.USER),
        SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      ]);
    } catch (e) {
      console.error('Failed to clear storage', e);
    }
  },

  async setItem(key, value) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await SecureStore.setItemAsync(key, serialized);
    } catch (e) {
      console.error(`Failed to set ${key}`, e);
    }
  },

  async getItem(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error(`Failed to remove ${key}`, e);
    }
  },
};
