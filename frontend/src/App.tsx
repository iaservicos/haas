import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Fotos } from './pages/Fotos';
import { GerenciarContratos } from './pages/GerenciarContratos';
import { GerenciarClientes } from './pages/GerenciarClientes';
import { GerenciarEquipamentos } from './pages/GerenciarEquipamentos';
import { VerConfirmacoes } from './pages/VerConfirmacoes';
import { DashboardCliente } from './pages/DashboardCliente';

// ⚡ NOVO: Componente para rotas protegidas com verificação de role
function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { isAuthenticated, loading, usuario } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // ⚡ NOVO: Se não está autenticado, redireciona para login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // ⚡ NOVO: Se está autenticado mas não tem permissão, redireciona para página inicial
  if (usuario && !allowedRoles.includes(usuario.user_type)) {
    console.warn(`❌ Acesso negado para ${usuario.user_type} em rota que requer: ${allowedRoles.join(', ')}`);
    
    // Redireciona para a página padrão do seu tipo de usuário
    if (usuario.user_type === 'client') {
      return <Navigate to="/dashboard-cliente" />;
    } else {
      return <Navigate to="/" />;
    }
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* ⚡ ROTAS PARA ANALISTAS */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['analyst']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fotos"
        element={
          <ProtectedRoute allowedRoles={['analyst']}>
            <Fotos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contratos"
        element={
          <ProtectedRoute allowedRoles={['analyst']}>
            <GerenciarContratos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute allowedRoles={['analyst']}>
            <GerenciarClientes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipamentos"
        element={
          <ProtectedRoute allowedRoles={['analyst']}>
            <GerenciarEquipamentos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/confirmacoes"
        element={
          <ProtectedRoute allowedRoles={['analyst']}>
            <VerConfirmacoes />
          </ProtectedRoute>
        }
      />

      {/* ⚡ ROTAS PARA CLIENTES */}
      <Route
        path="/dashboard-cliente"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <DashboardCliente />
          </ProtectedRoute>
        }
      />

      {/* ⚡ ROTA PADRÃO: Redireciona para login */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
