import { useContext } from 'react';
import { AuthContext } from './AuthContextDef';
import { AuthProvider } from './AuthContext';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export { AuthProvider };
