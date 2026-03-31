import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";

interface Contrato {
  id: string;
  numero_contrato: string;
  nome_cliente: string;
  cnpj_cliente?: string;
  status: 'active' | 'inactive' | 'completed';
  data_criacao: string;
}

export function GerenciarContratos() {
  const { usuario, logout } = useAuth();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [formData, setFormData] = useState({
    numero_contrato: '',
    nome_cliente: '',
    cnpj_cliente: '',
  });

  useEffect(() => {
    carregarContratos();
  }, []);

  const carregarContratos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clientes/contratos', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setContratos(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/clientes/contratos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        alert('Contrato criado com sucesso!');
        setFormData({ numero_contrato: '', nome_cliente: '', cnpj_cliente: '' });
        setShowForm(false);
        carregarContratos();
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      alert('Erro ao criar contrato');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'completed':
        return 'Concluído';
      default:
        return status;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white"
          >
            ☰
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">Menu</div>
          
          <a href="/" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Dashboard</span>}
          </a>

          <a href="/contratos" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
            {sidebarOpen && <span>Contratos</span>}
          </a>

          <a href="/clientes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Clientes</span>}
          </a>

          <a href="/equipamentos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Equipamentos</span>}
          </a>

          <a href="/confirmacoes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Confirmações</span>}
          </a>

          <a href="/fotos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Fotos</span>}
          </a>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-red-600 rounded transition"
          >
            {sidebarOpen && <span>Sair</span>}
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="https://raw.githubusercontent.com/iaservicos/IMAGENS/refs/heads/main/Logo_Positivo_Tecnologia_Prote%C3%A7%C3%A3o_Preto-3-(1)%20(1).png"
                alt="Logo Positivo"
                className="h-10 w-auto"
              />
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Contratos</h1>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Bem-vindo, <span className="font-semibold text-gray-900">{usuario?.nome || 'Carregando...'}</span></p>
            </div>
          </div>
        </div>

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Gerenciar Contratos</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {showForm ? 'Cancelar' : '+ Novo Contrato'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Criar Novo Contrato</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nº Contrato *
                      </label>
                      <input
                        type="text"
                        value={formData.numero_contrato}
                        onChange={(e) => setFormData({ ...formData, numero_contrato: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Cliente *
                      </label>
                      <input
                        type="text"
                        value={formData.nome_cliente}
                        onChange={(e) => setFormData({ ...formData, nome_cliente: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CNPJ (opcional)
                      </label>
                      <input
                        type="text"
                        value={formData.cnpj_cliente}
                        onChange={(e) => setFormData({ ...formData, cnpj_cliente: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="XX.XXX.XXX/0001-XX"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Criar Contrato
                  </button>
                </form>
              </div>
            )}

            {loading ? (
              <p className="text-center text-gray-600">Carregando contratos...</p>
            ) : contratos.length === 0 ? (
              <p className="text-center text-gray-600">Nenhum contrato encontrado</p>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nº Contrato</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">CNPJ</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Criação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {contratos.map((contrato) => (
                      <tr key={contrato.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{contrato.numero_contrato}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{contrato.nome_cliente}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{contrato.cnpj_cliente || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(contrato.status)}`}>
                            {getStatusLabel(contrato.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(contrato.data_criacao).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
