import api from './client';

export const paymentApi = {
  getPackages: () => api.get('/payments/packages'),
  createCheckout: (packageId) => api.post('/payments/checkout', { packageId }),
};
