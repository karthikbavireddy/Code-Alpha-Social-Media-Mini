import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, authStorage } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authStorage.getUser());
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync / Verify user session on mount
  const refreshUser = useCallback(async () => {
    const token = authStorage.getToken();
    if (!token && !authStorage.getUser()) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const data = await api.getMe();
      setUser(data);
      authStorage.setUser(data);
      return data;
    } catch (err) {
      // If unauthorized, wipe stored credentials
      if (err.status === 401 || err.status === 403) {
        authStorage.clear();
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (username, password) => {
    try {
      const response = await api.login({ username, password });
      if (response.token) {
        authStorage.setToken(response.token);
      }
      if (response.user) {
        setUser(response.user);
        authStorage.setUser(response.user);
      }
      addToast(`Welcome back, @${response.user?.username}!`, 'success');
      // fetch full user stats
      await refreshUser();
      return response;
    } catch (err) {
      addToast(err.message || 'Login failed. Please check your credentials.', 'error');
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.register(userData);
      if (response.token) {
        authStorage.setToken(response.token);
      }
      if (response.user) {
        setUser(response.user);
        authStorage.setUser(response.user);
      }
      addToast(`Account created! Welcome to ConnectSphere, @${response.user?.username}!`, 'success');
      await refreshUser();
      return response;
    } catch (err) {
      addToast(err.message || 'Registration failed. Please check form inputs.', 'error');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    } finally {
      authStorage.clear();
      setUser(null);
      addToast('Logged out successfully.', 'info');
    }
  };

  const value = {
    user,
    setUser,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    toasts,
    addToast,
    removeToast,
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
