import apiClient from './client';

export const claimsAPI = {
  getClaims: async (params = {}) => {
    const response = await apiClient.get('/claims', { params });
    return response.data;
  },

  getClaimById: async (claimId) => {
    const response = await apiClient.get(`/claims/${claimId}`);
    return response.data;
  },

  submitClaim: async (data) => {
    const response = await apiClient.post('/claims', data);
    return response.data;
  },

  getClaimEstimate: async (data) => {
    const response = await apiClient.post('/claims/estimate', data);
    return response.data;
  },

  updateClaim: async (claimId, data) => {
    const response = await apiClient.put(`/claims/${claimId}`, data);
    return response.data;
  },

  getMemberClaims: async (memberId, params = {}) => {
    const response = await apiClient.get(`/members/${memberId}/claims`, { params });
    return response.data;
  },

  getEmployerClaims: async (employerId, params = {}) => {
    const response = await apiClient.get(`/employers/${employerId}/claims`, { params });
    return response.data;
  },

  getDentistClaims: async (dentistId, params = {}) => {
    const response = await apiClient.get(`/dentists/${dentistId}/claims`, { params });
    return response.data;
  },

  getClaimsStats: async () => {
    const response = await apiClient.get('/claims/stats');
    return response.data;
  },
};
