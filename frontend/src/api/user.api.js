import api from './client';

export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (name) => api.patch('/users/me', { name }),
  changePassword: (currentPassword, newPassword) =>
    api.post('/users/me/password', { currentPassword, newPassword }),
  getStats: () => api.get('/users/me/stats'),
  getCreditsHistory: (page = 1, limit = 20) =>
    api.get('/users/me/credits/history', { params: { page, limit } }),
  getGenerations: (page = 1, limit = 20, filters = {}) =>
    api.get('/users/me/generations', { params: { page, limit, ...filters } }),
  getReferrals: () => api.get('/users/me/referrals'),
  getQuota: () => api.get('/users/me/quota'),
  claimDailyBonus: () => api.post('/users/me/daily-bonus'),
};
