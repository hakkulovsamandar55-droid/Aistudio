import api from './client';

export const galleryApi = {
  list: (page = 1, limit = 24, type) => api.get('/gallery', { params: { page, limit, type } }),
};

export const announcementApi = {
  list: () => api.get('/announcements'),
};
