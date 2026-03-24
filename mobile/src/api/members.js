import apiClient from './client';

export const membersAPI = {
  getMembers: async (params = {}) => {
    const response = await apiClient.get('/members', { params });
    return response.data;
  },

  getMemberById: async (memberId) => {
    const response = await apiClient.get(`/members/${memberId}`);
    return response.data;
  },

  getMemberEligibility: async (memberId) => {
    const response = await apiClient.get(`/members/${memberId}/eligibility`);
    return response.data;
  },

  getMemberByMemberID: async (memberIdString) => {
    const response = await apiClient.get(`/members/lookup/${memberIdString}`);
    return response.data;
  },

  getMemberPlan: async (memberId) => {
    const response = await apiClient.get(`/members/${memberId}/plan`);
    return response.data;
  },

  getMemberBenefits: async (memberId) => {
    const response = await apiClient.get(`/members/${memberId}/benefits`);
    return response.data;
  },

  inviteMember: async (data) => {
    const response = await apiClient.post('/members/invite', data);
    return response.data;
  },

  updateMember: async (memberId, data) => {
    const response = await apiClient.put(`/members/${memberId}`, data);
    return response.data;
  },

  removeMember: async (memberId) => {
    const response = await apiClient.delete(`/members/${memberId}`);
    return response.data;
  },

  getMemberUsage: async (memberId) => {
    const response = await apiClient.get(`/members/${memberId}/usage`);
    return response.data;
  },
};
