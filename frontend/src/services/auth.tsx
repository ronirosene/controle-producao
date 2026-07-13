'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, setAuthToken, getAuthToken, onAuthChange } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  features?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      authApi.me()
        .then(setUser)
        .catch(() => {
          setAuthToken(null);
          localStorage.removeItem('auth_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Heartbeat: check if token is still valid every 2min
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        await authApi.me();
      } catch {
        logout();
        window.location.href = '/login';
      }
    }, 120_000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    return onAuthChange((token) => {
      if (!token) {
        setUser(null);
        localStorage.removeItem('auth_token');
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setAuthToken(res.token);
    localStorage.setItem('auth_token', res.token);
    setUser(res.user);
  };

  const logout = () => {
    setAuthToken(null);
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
