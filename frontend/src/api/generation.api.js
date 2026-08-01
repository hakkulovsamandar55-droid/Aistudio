import api from './client';

export const generationApi = {
  generateImage: (prompt, options = {}) => api.post('/generate/image', { prompt, ...options }),
  generateVideo: (prompt, options = {}) => api.post('/generate/video', { prompt, ...options }),
  getStatus: (id) => api.get(`/generate/${id}/status`),
};
