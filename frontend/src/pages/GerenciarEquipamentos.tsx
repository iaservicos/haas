import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";

interface Equipamento {
  id: string;
  numero_serie: string;
  modelo: string;
  tipo_equipamento: string;
  contrato_id: string;
  contrato_nome: string;
  status: 'ativo' | 'inativo';
}

interface Contrato {
  id: string;
  nome: string;
}

export function GerenciarEquipamentos() {
  const { usuario, logout } = useAuth();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [filtroContrato, setFiltroContrato] = useState('');
  const [showNovoForm, setShowNovoForm] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [novoEquipamento, setNovoEquipamento] = useState({
    numero_serie: '',
    modelo: '',
    tipo_equipamento: 'Notebook',
    contrato_id: '',
  });

  const [editData, setEditData] = useState<Partial<Equipamento>>({});

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carregar contratos
      const respContratos = await fetch('/api/contratos/listar', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const dataContratos = await respContratos.json();
      if (dataContratos.success) {
        setContratos(dataContratos.data || []);
      }

      // Carregar equipamentos
      const respEquipamentos = await fetch('/api/equipamentos/listar', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const dataEquipamentos = await respEquipamentos.json();
      if (dataEquipamentos.success) {
        setEquipamentos(dataEquipamentos.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (equipamento: Equipamento) => {
    setEditandoId(equipamento.id);
    setEditData({ ...equipamento });
  };

  const handleSalvarEdicao = async (id: string) => {
    try {
      setSalvando(true);
      const response = await fetch(`/api/equipamentos/atualizar/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      const data = await response.json();
      if (data.success) {
        alert('Equipamento atualizado com sucesso!');
        setEditandoId(null);
        carregarDados();
      } else {
        alert('Erro ao atualizar: ' + data.message);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar equipamento');
    } finally {
      setSalvando(false);
    }
  };

  const handleInserirNovo = async () => {
    if (!novoEquipamento.numero_serie || !novoEquipamento.modelo || !novoEquipamento.contrato_id) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      setSalvando(true);
      const response = await fetch('/api/equipamentos/criar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(novoEquipamento),
      });

      const data = await response.json();
      if (data.success) {
        alert('Equipamento inserido com sucesso!');
        setNovoEquipamento({ numero_serie: '', modelo: '', tipo_equipamento: 'Notebook', contrato_id: '' });
        setShowNovoForm(false);
        carregarDados();
      } else {
        alert('Erro ao inserir: ' + data.message);
      }
    } catch (error) {
      console.error('Erro ao inserir:', error);
      alert('Erro ao inserir equipamento');
    } finally {
      setSalvando(false);
    }
  };

  const equipamentosFiltrados = equipamentos.filter(eq => {
    if (filtroContrato && eq.contrato_id !== filtroContrato) return false;
    return true;
  });

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

          <a href="/contratos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Contratos</span>}
          </a>

          <a href="/clientes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Clientes</span>}
          </a>

          <a href="/equipamentos" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
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
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Equipamentos</h1>
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
              <h2 className="text-3xl font-bold text-gray-900">Equipamentos Cadastrados</h2>
              <button
                onClick={() => setShowNovoForm(!showNovoForm)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                + Novo Equipamento
              </button>
            </div>

            {/* FORMULÁRIO DE NOVO EQUIPAMENTO */}
            {showNovoForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Inserir Novo Equipamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Série *</label>
                    <input
                      type="text"
                      value={novoEquipamento.numero_serie}
                      onChange={(e) => setNovoEquipamento({ ...novoEquipamento, numero_serie: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: ABC123456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                    <input
                      type="text"
                      value={novoEquipamento.modelo}
                      onChange={(e) => setNovoEquipamento({ ...novoEquipamento, modelo: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Positivo Motion"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                      value={novoEquipamento.tipo_equipamento}
                      onChange={(e) => setNovoEquipamento({ ...novoEquipamento, tipo_equipamento: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Notebook">Notebook</option>
                      <option value="Desktop">Desktop</option>
                      <option value="Monitor">Monitor</option>
                      <option value="Impressora">Impressora</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contrato *</label>
                    <select
                      value={novoEquipamento.contrato_id}
                      onChange={(e) => setNovoEquipamento({ ...novoEquipamento, contrato_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um contrato</option>
                      {contratos.map(contrato => (
                        <option key={contrato.id} value={contrato.id}>
                          {contrato.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleInserirNovo}
                    disabled={salvando}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => setShowNovoForm(false)}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* FILTRO */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Contrato</label>
              <select
                value={filtroContrato}
                onChange={(e) => setFiltroContrato(e.target.value)}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os contratos</option>
                {contratos.map(contrato => (
                  <option key={contrato.id} value={contrato.id}>
                    {contrato.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* TABELA */}
            {loading ? (
              <p className="text-center text-gray-600">Carregando equipamentos...</p>
            ) : equipamentosFiltrados.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">Nenhum equipamento encontrado</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Série</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Modelo</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tipo</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Contrato</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {equipamentosFiltrados.map((eq) => (
                        <tr key={eq.id} className="hover:bg-gray-50">
                          {editandoId === eq.id ? (
                            <>
                              <td className="px-6 py-4">
                                <input
                                  type="text"
                                  value={editData.numero_serie || ''}
                                  onChange={(e) => setEditData({ ...editData, numero_serie: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <input
                                  type="text"
                                  value={editData.modelo || ''}
                                  onChange={(e) => setEditData({ ...editData, modelo: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  value={editData.tipo_equipamento || ''}
                                  onChange={(e) => setEditData({ ...editData, tipo_equipamento: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="Notebook">Notebook</option>
                                  <option value="Desktop">Desktop</option>
                                  <option value="Monitor">Monitor</option>
                                  <option value="Impressora">Impressora</option>
                                  <option value="Outro">Outro</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.contrato_nome}</td>
                              <td className="px-6 py-4 text-sm space-x-2">
                                <button
                                  onClick={() => handleSalvarEdicao(eq.id)}
                                  disabled={salvando}
                                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition disabled:opacity-50"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => setEditandoId(null)}
                                  className="bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400 transition"
                                >
                                  Cancelar
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{eq.numero_serie}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.modelo}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.tipo_equipamento}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.contrato_nome}</td>
                              <td className="px-6 py-4 text-sm">
                                <button
                                  onClick={() => handleEditClick(eq)}
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  Editar
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
