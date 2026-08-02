import api from './client';

export const remixApi = {
  getStyles: () => api.get('/remix/styles'),
  remix: (file, style) => {
    const form = new FormData();
    form.append('image', file);
    form.append('style', style);
    return api.post('/remix', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
