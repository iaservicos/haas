import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function DashboardCliente() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portal HaaS - Cliente</h1>
            <p className="text-sm text-gray-600">Bem-vindo, {usuario?.nome}</p>
          </div>
          
          {/* Menu Mobile */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              ☰
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bem-vindo ao Portal de Vistoria HaaS
          </h2>
          
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              📋 Instruções Importantes
            </h3>
            <div className="space-y-3 text-blue-800">
              <p>
                <strong>1. Embalagem:</strong> Certifique-se de que todos os equipamentos estão bem embalados e protegidos.
              </p>
              <p>
                <strong>2. Checklist:</strong> Você preencherá um checklist para cada equipamento listado.
              </p>
              <p>
                <strong>3. Fotos:</strong> Tire fotos de cada equipamento conforme solicitado no checklist.
              </p>
              <p>
                <strong>4. Análise:</strong> Nossas análises automáticas verificarão o estado de cada equipamento.
              </p>
              <p>
                <strong>5. Observações:</strong> Se houver algo errado, você pode editar antes de enviar.
              </p>
            </div>
          </div>

          {/* Video Placeholder */}
          <div className="bg-gray-100 rounded-lg p-8 mb-6 text-center">
            <div className="inline-block">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">Vídeo de instruções (em breve)</p>
            <p className="text-sm text-gray-500">Assista ao vídeo para entender melhor o processo</p>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={() => navigate('/contratos')}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Iniciar Checklist →
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-blue-600 mb-2">0</div>
            <p className="text-gray-600">Contratos Vinculados</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-green-600 mb-2">0</div>
            <p className="text-gray-600">Equipamentos</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-orange-600 mb-2">0</div>
            <p className="text-gray-600">Checklists Pendentes</p>
          </div>
        </div>
      </main>
    </div>
  );
}
