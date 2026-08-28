import { useState, useEffect, type ReactNode } from 'react';
import type { AuthContextValue, User } from '../types';
import { AuthContext } from './AuthContextDef';
import { api } from '../api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const response = await api.auth.login({ email, password });
    setUser(response.user);
  }

  async function register(email: string, name: string, password: string) {
    const response = await api.auth.register({ email, name, password });
    setUser(response.user);
  }

  async function logout() {
    try {
      await api.auth.logout();
    } finally {
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
