import api from './client';

export const authApi = {
  register: (email, password, name, referralCode) =>
    api.post('/auth/register', { email, password, name, referralCode }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  googleLogin: (idToken) => api.post('/auth/google', { idToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
};
