import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@clear_care:token',
  USER: '@clear_care:user',
  REFRESH_TOKEN: '@clear_care:refresh_token',
};

export const storage = {
  async getToken() {
    try {
      return await AsyncStorage.getItem(KEYS.TOKEN);
    } catch {
      return null;
    }
  },

  async setToken(token) {
    try {
      await AsyncStorage.setItem(KEYS.TOKEN, token);
    } catch (e) {
      console.error('Failed to save token', e);
    }
  },

  async removeToken() {
    try {
      await AsyncStorage.removeItem(KEYS.TOKEN);
    } catch (e) {
      console.error('Failed to remove token', e);
    }
  },

  async getUser() {
    try {
      const json = await AsyncStorage.getItem(KEYS.USER);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  },

  async setUser(user) {
    try {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user', e);
    }
  },

  async removeUser() {
    try {
      await AsyncStorage.removeItem(KEYS.USER);
    } catch (e) {
      console.error('Failed to remove user', e);
    }
  },

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token) {
    try {
      await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, token);
    } catch (e) {
      console.error('Failed to save refresh token', e);
    }
  },

  async clearAll() {
    try {
      await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER, KEYS.REFRESH_TOKEN]);
    } catch (e) {
      console.error('Failed to clear storage', e);
    }
  },

  async setItem(key, value) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, serialized);
    } catch (e) {
      console.error(`Failed to set ${key}`, e);
    }
  },

  async getItem(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to remove ${key}`, e);
    }
  },
};
