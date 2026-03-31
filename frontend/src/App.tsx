import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Fotos } from './pages/Fotos';
import { LoginUnificado } from './components/LoginUnificado';
import { PortalAnalista } from './components/PortalAnalista';
import { PortalCliente } from './components/PortalCliente';


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
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

// Dentro do componente App:
<Routes>
  <Route path="/login" element={<LoginUnificado />} />
  <Route path="/portal-analista" element={<PortalAnalista />} />
  <Route path="/portal-cliente" element={<PortalCliente />} />
  {/* outras rotas */}
</Routes>


export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
