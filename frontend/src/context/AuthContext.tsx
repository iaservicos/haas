import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar token e usuário do localStorage
    const storedToken = authService.getToken();
    const storedUsuario = localStorage.getItem('usuario');

    if (storedToken) {
      setToken(storedToken);
    }

    if (storedUsuario) {
      try {
        setUsuario(JSON.parse(storedUsuario));
      } catch (error) {
        console.error('Erro ao parsear usuário do localStorage:', error);
      }
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    authService.setToken(response.token);
    setToken(response.token);
    setUsuario(response.usuario);
    // Salvar no localStorage para persistir
    localStorage.setItem('usuario', JSON.stringify(response.usuario));
    setLoading(false);
  };

  const logout = () => {
    authService.removeToken();
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
