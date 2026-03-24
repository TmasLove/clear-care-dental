import apiClient from './client';

export const dentistsAPI = {
  searchDentists: async (params = {}) => {
    const response = await apiClient.get('/dentists/search', { params });
    return response.data;
  },

  getDentistById: async (dentistId) => {
    const response = await apiClient.get(`/dentists/${dentistId}`);
    return response.data;
  },

  getDentistProfile: async () => {
    const response = await apiClient.get('/dentists/me');
    return response.data;
  },

  updateDentistProfile: async (data) => {
    const response = await apiClient.put('/dentists/me', data);
    return response.data;
  },

  getDentistPatients: async (params = {}) => {
    const response = await apiClient.get('/dentists/me/patients', { params });
    return response.data;
  },

  getDentistPayments: async (params = {}) => {
    const response = await apiClient.get('/dentists/me/payments', { params });
    return response.data;
  },

  getDentistPaymentStats: async () => {
    const response = await apiClient.get('/dentists/me/payments/stats');
    return response.data;
  },

  verifyPatientEligibility: async (memberIdString) => {
    const response = await apiClient.post('/dentists/verify-eligibility', {
      memberId: memberIdString,
    });
    return response.data;
  },

  getDentistAppointments: async (params = {}) => {
    const response = await apiClient.get('/dentists/me/appointments', { params });
    return response.data;
  },

  getNearbyDentists: async (lat, lng, radius = 10) => {
    const response = await apiClient.get('/dentists/nearby', {
      params: { lat, lng, radius },
    });
    return response.data;
  },
};
