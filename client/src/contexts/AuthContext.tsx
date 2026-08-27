import { useState, useEffect, type ReactNode } from 'react';
import type { AuthContextValue, User } from '../types';
import { AuthContext } from './AuthContextDef';
import { api } from '../api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth.me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const response = await api.auth.login({ email, password });
    localStorage.setItem('token', response.token);
    setUser(response.user);
  }

  async function register(email: string, name: string, password: string, role?: 'admin' | 'cashier') {
    const response = await api.auth.register({ email, name, password, role });
    localStorage.setItem('token', response.token);
    setUser(response.user);
  }

  async function logout() {
    try {
      await api.auth.logout();
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  }

  const value: AuthContextValue = { user, loading, login, register, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
