import apiClient from './client';

export const authAPI = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  requestMagicLink: async (email) => {
    const response = await apiClient.post('/auth/magic-link', { email });
    return response.data;
  },

  verifyMagicLink: async (token) => {
    const response = await apiClient.post('/auth/magic-link/verify', { token });
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await apiClient.put('/auth/me', data);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};
