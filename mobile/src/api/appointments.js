import apiClient from './client';

export const appointmentsAPI = {
  getAppointments: async (params = {}) => {
    const response = await apiClient.get('/appointments', { params });
    return response.data;
  },

  getAppointmentById: async (appointmentId) => {
    const response = await apiClient.get(`/appointments/${appointmentId}`);
    return response.data;
  },

  createAppointment: async (data) => {
    const response = await apiClient.post('/appointments', data);
    return response.data;
  },

  updateAppointment: async (appointmentId, data) => {
    const response = await apiClient.put(`/appointments/${appointmentId}`, data);
    return response.data;
  },

  cancelAppointment: async (appointmentId) => {
    const response = await apiClient.delete(`/appointments/${appointmentId}`);
    return response.data;
  },

  getTodayAppointments: async () => {
    const today = new Date().toISOString().split('T')[0];
    const response = await apiClient.get('/appointments', {
      params: { date: today },
    });
    return response.data;
  },

  confirmAppointment: async (appointmentId) => {
    const response = await apiClient.put(`/appointments/${appointmentId}/confirm`);
    return response.data;
  },
};
