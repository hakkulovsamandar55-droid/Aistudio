import api from './client';

export const generationApi = {
  getStyles: () => api.get('/generate/styles'),
  generateImage: (prompt, options = {}) => api.post('/generate/image', { prompt, ...options }),
  generateVideo: (prompt, options = {}) => api.post('/generate/video', { prompt, ...options }),
  getStatus: (id) => api.get(`/generate/${id}/status`),
  setFavorite: (id, isFavorite) => api.patch(`/generate/${id}/favorite`, { isFavorite }),
  setPublic: (id, isPublic) => api.patch(`/generate/${id}/public`, { isPublic }),
  remove: (id) => api.delete(`/generate/${id}`),

  // Downloads stream through the API (with an attachment header) rather than
  // hitting the provider URL directly, because a cross-origin <a download> is
  // ignored by browsers and would just open the file in a new tab.
  download: async (id, filename) => {
    const response = await api.get(`/generate/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `ai-studio-${id}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
