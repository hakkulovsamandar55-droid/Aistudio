import api from './client';

export const moduleApi = {
  list: () => api.get('/modules'),
};

export const magicApi = {
  preview: (prompt) => api.post('/magic/preview', { prompt }),
  run: (prompt) => api.post('/magic/run', { prompt }),
};

export const projectApi = {
  list: (page = 1, limit = 12) => api.get('/projects', { params: { page, limit } }),
  get: (id) => api.get(`/projects/${id}`),
  remove: (id) => api.delete(`/projects/${id}`),
};
