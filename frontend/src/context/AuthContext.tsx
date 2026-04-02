import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

// ⚡ Constantes para timeout
const INACTIVITY_TIMEOUT = 40 * 60 * 1000; // 40 minutos em ms
const SESSION_STORAGE_KEY = 'session-last-activity';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⚡ NOVO: Resetar timer de inatividade
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    localStorage.setItem(SESSION_STORAGE_KEY, Date.now().toString());

    inactivityTimerRef.current = setTimeout(() => {
      console.log('⏱️ Sessão expirada por inatividade');
      logout();
    }, INACTIVITY_TIMEOUT);
  };

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

  // ⚡ NOVO: Monitorar atividade do usuário
  useEffect(() => {
    if (!token) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    authService.setToken(response.token);
    setToken(response.token);
    setUsuario(response.usuario);
    // Salvar no localStorage para persistir
    localStorage.setItem('usuario', JSON.stringify(response.usuario));
    setLoading(false);
    
    // ⚡ NOVO: Iniciar timer de inatividade após login
    resetInactivityTimer();
  };

  const logout = () => {
    authService.removeToken();
    localStorage.removeItem('usuario');
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setToken(null);
    setUsuario(null);
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
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
