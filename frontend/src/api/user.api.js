import api from './client';

export const userApi = {
  getMe: () => api.get('/users/me'),
  getCreditsHistory: (page = 1, limit = 20) =>
    api.get('/users/me/credits/history', { params: { page, limit } }),
  getGenerations: (page = 1, limit = 20, type) =>
    api.get('/users/me/generations', { params: { page, limit, type } }),
};
