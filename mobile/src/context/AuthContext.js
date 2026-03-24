import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';
import { storage } from '../utils/storage';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Restore session on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await storage.getToken();
        const savedUser = await storage.getUser();

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);

          // Optionally re-validate token with server
          try {
            const profile = await authAPI.getProfile();
            setUser(profile.user || profile);
            await storage.setUser(profile.user || profile);
          } catch {
            // Token expired — clear session
            await storage.clearAll();
            setToken(null);
            setUser(null);
          }
        }
      } catch (e) {
        console.error('Failed to restore session', e);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const data = await authAPI.login(email, password);
      const { token: newToken, user: newUser, refreshToken } = data;

      await storage.setToken(newToken);
      await storage.setUser(newUser);
      if (refreshToken) {
        await storage.setRefreshToken(refreshToken);
      }

      setToken(newToken);
      setUser(newUser);
      return newUser;
    } catch (error) {
      const msg = error.userMessage || 'Login failed. Please check your credentials.';
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const loginWithMagicLink = useCallback(async (magicToken) => {
    setAuthError(null);
    try {
      const data = await authAPI.verifyMagicLink(magicToken);
      const { token: newToken, user: newUser, refreshToken } = data;

      await storage.setToken(newToken);
      await storage.setUser(newUser);
      if (refreshToken) await storage.setRefreshToken(refreshToken);

      setToken(newToken);
      setUser(newUser);
      return newUser;
    } catch (error) {
      const msg = error.userMessage || 'Magic link verification failed.';
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const register = useCallback(async (registrationData) => {
    setAuthError(null);
    try {
      const data = await authAPI.register(registrationData);
      const { token: newToken, user: newUser, refreshToken } = data;

      await storage.setToken(newToken);
      await storage.setUser(newUser);
      if (refreshToken) await storage.setRefreshToken(refreshToken);

      setToken(newToken);
      setUser(newUser);
      return newUser;
    } catch (error) {
      const msg = error.userMessage || 'Registration failed. Please try again.';
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore logout API errors
    } finally {
      await storage.clearAll();
      setToken(null);
      setUser(null);
      setAuthError(null);
    }
  }, []);

  const updateUser = useCallback(async (updatedData) => {
    try {
      const data = await authAPI.updateProfile(updatedData);
      const updatedUser = data.user || data;
      setUser(updatedUser);
      await storage.setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      const msg = error.userMessage || 'Failed to update profile.';
      throw new Error(msg);
    }
  }, []);

  const clearError = useCallback(() => setAuthError(null), []);

  const value = {
    user,
    token,
    loading,
    authError,
    isAuthenticated: !!token && !!user,
    role: user?.role || null,
    login,
    loginWithMagicLink,
    register,
    logout,
    updateUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
