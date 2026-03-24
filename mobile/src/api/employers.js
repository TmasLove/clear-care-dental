import apiClient from './client';

export const employersAPI = {
  getEmployerProfile: async () => {
    const response = await apiClient.get('/employers/me');
    return response.data;
  },

  updateEmployerProfile: async (data) => {
    const response = await apiClient.put('/employers/me', data);
    return response.data;
  },

  getEmployerStats: async () => {
    const response = await apiClient.get('/employers/me/stats');
    return response.data;
  },

  getPlans: async () => {
    const response = await apiClient.get('/employers/me/plans');
    return response.data;
  },

  getPlanById: async (planId) => {
    const response = await apiClient.get(`/employers/me/plans/${planId}`);
    return response.data;
  },

  createPlan: async (data) => {
    const response = await apiClient.post('/employers/me/plans', data);
    return response.data;
  },

  updatePlan: async (planId, data) => {
    const response = await apiClient.put(`/employers/me/plans/${planId}`, data);
    return response.data;
  },

  deletePlan: async (planId) => {
    const response = await apiClient.delete(`/employers/me/plans/${planId}`);
    return response.data;
  },

  getMembers: async (params = {}) => {
    const response = await apiClient.get('/employers/me/members', { params });
    return response.data;
  },

  inviteMember: async (data) => {
    const response = await apiClient.post('/employers/me/members/invite', data);
    return response.data;
  },

  removeMember: async (memberId) => {
    const response = await apiClient.delete(`/employers/me/members/${memberId}`);
    return response.data;
  },

  getClaims: async (params = {}) => {
    const response = await apiClient.get('/employers/me/claims', { params });
    return response.data;
  },

  getSavingsReport: async () => {
    const response = await apiClient.get('/employers/me/savings');
    return response.data;
  },
};
