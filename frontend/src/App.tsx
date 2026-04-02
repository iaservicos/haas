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


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

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

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fotos"
        element={
          <ProtectedRoute>
            <Fotos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contratos"
        element={
          <ProtectedRoute>
            <GerenciarContratos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <GerenciarClientes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipamentos"
        element={
          <ProtectedRoute>
            <GerenciarEquipamentos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/confirmacoes"
        element={
          <ProtectedRoute>
            <VerConfirmacoes />
          </ProtectedRoute>
        }
      />
      {/* NOVO: Dashboard do Cliente */}
      <Route
        path="/dashboard-cliente"
        element={
          <ProtectedRoute>
            <DashboardCliente />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
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
