import apiClient from './client';

export const proceduresAPI = {
  getPriceCheck: async (zip) => {
    const response = await apiClient.get('/procedures/price-check', { params: { zip } });
    return response.data;
  },
};
