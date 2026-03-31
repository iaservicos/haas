// frontend/src/pages/GerenciarEquipamentos.tsx

import React, { useState, useEffect } from 'react';

interface Contrato {
  id: string;
  numero_contrato: string;
  nome_cliente: string;
  equipamentos?: Equipamento[];
}

interface Equipamento {
  id: string;
  numero_serie: string;
  modelo: string;
  sku?: string;
  tipo_equipamento: 'notebook' | 'desktop';
  data_fim_contrato?: string;
  informacoes_destino?: string;
  nota_fiscal?: string;
  material?: string;
  meses_garantia: number;
}

export function GerenciarEquipamentos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    numero_serie: '',
    modelo: '',
    sku: '',
    tipo_equipamento: 'notebook' as 'notebook' | 'desktop',
    data_fim_contrato: '',
    informacoes_destino: '',
    nota_fiscal: '',
    material: '',
    meses_garantia: 12,
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

  const carregarEquipamentos = async (contratoId: string) => {
    try {
      const response = await fetch(`/api/clientes/contratos/${contratoId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setContratoSelecionado(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    }
  };

  const handleSelectContrato = (contrato: Contrato) => {
    setContratoSelecionado(contrato);
    carregarEquipamentos(contrato.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contratoSelecionado) return;

    try {
      const response = await fetch(`/api/clientes/contratos/${contratoSelecionado.id}/equipamentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        alert('Equipamento adicionado com sucesso!');
        setFormData({
          numero_serie: '',
          modelo: '',
          sku: '',
          tipo_equipamento: 'notebook',
          data_fim_contrato: '',
          informacoes_destino: '',
          nota_fiscal: '',
          material: '',
          meses_garantia: 12,
        });
        setShowForm(false);
        carregarEquipamentos(contratoSelecionado.id);
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao adicionar equipamento:', error);
      alert('Erro ao adicionar equipamento');
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Gerenciar Equipamentos</h2>

      {/* Seleção de Contrato */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {contratos.map((contrato) => (
          <button
            key={contrato.id}
            onClick={() => handleSelectContrato(contrato)}
            className={`p-4 rounded-lg border-2 transition ${
              contratoSelecionado?.id === contrato.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-400'
            }`}
          >
            <p className="font-semibold text-gray-900">{contrato.numero_contrato}</p>
            <p className="text-sm text-gray-600">{contrato.nome_cliente}</p>
          </button>
        ))}
      </div>

      {contratoSelecionado && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">
              Equipamentos - {contratoSelecionado.numero_contrato}
            </h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showForm ? 'Cancelar' : '+ Novo Equipamento'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h4 className="text-xl font-semibold mb-4">Adicionar Equipamento</h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nº Série *</label>
                    <input
                      type="text"
                      value={formData.numero_serie}
                      onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                    <input
                      type="text"
                      value={formData.modelo}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={formData.tipo_equipamento}
                      onChange={(e) => setFormData({ ...formData, tipo_equipamento: e.target.value as 'notebook' | 'desktop' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="notebook">Notebook</option>
                      <option value="desktop">Desktop</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                    <input
                      type="text"
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meses de Garantia</label>
                    <input
                      type="number"
                      value={formData.meses_garantia}
                      onChange={(e) => setFormData({ ...formData, meses_garantia: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fim do Contrato</label>
                    <input
                      type="date"
                      value={formData.data_fim_contrato}
                      onChange={(e) => setFormData({ ...formData, data_fim_contrato: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nota Fiscal</label>
                    <input
                      type="text"
                      value={formData.nota_fiscal}
                      onChange={(e) => setFormData({ ...formData, nota_fiscal: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Informações de Destino</label>
                    <textarea
                      value={formData.informacoes_destino}
                      onChange={(e) => setFormData({ ...formData, informacoes_destino: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Adicionar Equipamento
                </button>
              </form>
            </div>
          )}

          {contratoSelecionado.equipamentos && contratoSelecionado.equipamentos.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nº Série</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Modelo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tipo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Destino</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nota Fiscal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contratoSelecionado.equipamentos.map((eq) => (
                    <tr key={eq.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{eq.numero_serie}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{eq.modelo}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{eq.sku || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${eq.tipo_equipamento === 'notebook' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                          {eq.tipo_equipamento}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{eq.informacoes_destino || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{eq.nota_fiscal || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">Nenhum equipamento adicionado</p>
          )}
        </>
      )}
    </div>
  );
}
