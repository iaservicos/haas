// frontend/src/pages/GerenciarContratos.tsx

import React, { useState, useEffect } from 'react';

interface Contrato {
  id: string;
  numero_contrato: string;
  nome_cliente: string;
  cnpj_cliente?: string;
  status: 'active' | 'inactive' | 'completed';
  data_criacao: string;
}

export function GerenciarContratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
  );
}
