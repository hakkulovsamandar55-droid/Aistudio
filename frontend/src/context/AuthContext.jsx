import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/auth.api';
import { userApi } from '../api/user.api';
import { tokenStorage } from '../api/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    if (!tokenStorage.getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await userApi.getMe();
      setUser(response.data.data);
    } catch (err) {
      tokenStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();

    const handleSessionExpired = () => setUser(null);
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [loadCurrentUser]);

  const login = useCallback(async (email, password) => {
    const response = await authApi.login(email, password);
    const { user: loggedInUser, accessToken, refreshToken } = response.data.data;
    tokenStorage.setTokens(accessToken, refreshToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (email, password, name, referralCode) => {
    const response = await authApi.register(email, password, name, referralCode);
    const { user: newUser, accessToken, refreshToken } = response.data.data;
    tokenStorage.setTokens(accessToken, refreshToken);
    setUser(newUser);
    return newUser;
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    const response = await authApi.googleLogin(idToken);
    const { user: loggedInUser, accessToken, refreshToken } = response.data.data;
    tokenStorage.setTokens(accessToken, refreshToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await userApi.getMe();
    setUser(response.data.data);
    return response.data.data;
  }, []);

  const value = {
    user,
    credits: user?.credits ?? 0,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
