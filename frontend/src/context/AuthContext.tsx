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

// ⚡ Constantes
const INACTIVITY_TIMEOUT = 40 * 60 * 1000; // 40 minutos em ms
const SESSION_STORAGE_KEY = 'session-last-activity';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⚡ Função para fazer logout
  const performLogout = () => {
    authService.removeToken();
    localStorage.removeItem('usuario');
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.clear();
    setToken(null);
    setUsuario(null);
    
    // Redirecionar para login
    window.location.href = '/';
  };

  // ⚡ Resetar timer de inatividade
  const resetInactivityTimer = () => {
    // Limpar timer anterior
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Atualizar timestamp de última atividade
    localStorage.setItem(SESSION_STORAGE_KEY, Date.now().toString());

    // Criar novo timer - fazer logout após 40 minutos de inatividade
    inactivityTimerRef.current = setTimeout(() => {
      console.log('⏱️ Sessão expirada por inatividade');
      performLogout();
    }, INACTIVITY_TIMEOUT);
  };

  // ⚡ Carregar token e usuário ao iniciar
  useEffect(() => {
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

  // ⚡ Monitorar atividade do usuário (cliques, digitação, etc)
  useEffect(() => {
    if (!token) return; // Só monitorar se estiver logado

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Adicionar listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Inicializar timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [token]);

  // ⚡ Verificar se a sessão expirou ao carregar a página
  useEffect(() => {
    if (!token) return;

    const lastActivityTimestamp = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!lastActivityTimestamp) {
      resetInactivityTimer();
      return;
    }

    const lastActivity = parseInt(lastActivityTimestamp, 10);
    const timeSinceLastActivity = Date.now() - lastActivity;

    // Se passou mais tempo que o timeout, fazer logout
    if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
      console.log('⏱️ Sessão expirada - fazendo logout');
      performLogout();
    } else {
      // Caso contrário, reiniciar o timer
      resetInactivityTimer();
    }
  }, [token]);

  // ⚡ Limpar sessão ao fechar a aba/navegador
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    authService.setToken(response.token);
    setToken(response.token);
    setUsuario(response.usuario);
    // Salvar no localStorage para persistir
    localStorage.setItem('usuario', JSON.stringify(response.usuario));
    setLoading(false);
    
    // Iniciar timer de inatividade
    resetInactivityTimer();
  };

  const logout = () => {
    performLogout();
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
