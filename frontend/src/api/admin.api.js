import api from './client';

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (page = 1, limit = 20, search = '') => api.get('/admin/users', { params: { page, limit, search } }),
  getUserDetail: (id) => api.get(`/admin/users/${id}`),
  adjustCredits: (id, amount, description) => api.post(`/admin/users/${id}/credits`, { amount, description }),
  setUserActive: (id, isActive) => api.patch(`/admin/users/${id}/active`, { isActive }),
  setUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  setUserPlan: (id, plan) => api.patch(`/admin/users/${id}/plan`, { plan }),
  getGenerations: (page = 1, limit = 20, filters = {}) =>
    api.get('/admin/generations', { params: { page, limit, ...filters } }),
  getPackages: () => api.get('/admin/packages'),
  createPackage: (data) => api.post('/admin/packages', data),
  updatePackage: (id, data) => api.patch(`/admin/packages/${id}`, data),
  getAnnouncements: () => api.get('/admin/announcements'),
  createAnnouncement: (message) => api.post('/admin/announcements', { message }),
  updateAnnouncement: (id, data) => api.patch(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),
  getProviders: () => api.get('/admin/providers'),
  updateProvider: (provider, data) => api.patch(`/admin/providers/${provider}`, data),
  getEconomics: () => api.get('/admin/economics'),
  getQueue: () => api.get('/admin/queue'),
};
