import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [dealerProfile, setDealerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('ac_token');
    if (!token) {
      setUser(null);
      setDealerProfile(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setDealerProfile(data.dealer || null);
    } catch {
      localStorage.removeItem('ac_token');
      setUser(null);
      setDealerProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    const handleExpired = () => {
      setUser(null);
      setDealerProfile(null);
    };
    window.addEventListener('ac:auth-expired', handleExpired);
    return () => window.removeEventListener('ac:auth-expired', handleExpired);
  }, [fetchCurrentUser]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('ac_token', data.access_token);
    await fetchCurrentUser();
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('ac_token', data.access_token);
    await fetchCurrentUser();
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('ac_token');
    setUser(null);
    setDealerProfile(null);
  };

  const refreshUser = () => fetchCurrentUser();

  return (
    <AuthContext.Provider
      value={{
        user,
        dealerProfile,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
