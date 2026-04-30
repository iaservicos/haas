import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gerarTemplateConfirmacoes } from '../utils/gerarTemplateConfirmacoes';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Cliente {
  id: number;
  nome_cliente: string;
}

interface Contrato {
  id: number;
  numero_contrato: string;
  nome_cliente: string;
}

interface Equipamento {
  id: number;
  numero_serie: string;
  modelo: string;
  tipo_material: string;
  confirmacao: {
    id: number;
    nota_fiscal: string | null;
    destino: string | null;
  } | null;
}

export const Confirmacoes: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // STATE
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  // FILTROS
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroContrato, setFiltroContrato] = useState('');

  // MODAL
  const [showModal, setShowModal] = useState(false);
  const [notaFiscal, setNotaFiscal] = useState('');
  const [destino, setDestino] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // UPLOAD
  const [uploadando, setUploadando] = useState(false);
  const [mensagemUpload, setMensagemUpload] = useState('');

  // CARREGAR CLIENTES
  useEffect(() => {
    loadClientes();
  }, []);

  // CARREGAR CONTRATOS QUANDO CLIENTE MUDA
  useEffect(() => {
    if (filtroCliente) {
      loadContratos(filtroCliente);
    } else {
      setContratos([]);
      setFiltroContrato('');
      setEquipamentos([]);
    }
  }, [filtroCliente]);

  // CARREGAR EQUIPAMENTOS QUANDO CONTRATO MUDA
  useEffect(() => {
    if (filtroContrato) {
      loadEquipamentos(filtroContrato);
    } else {
      setEquipamentos([]);
    }
  }, [filtroContrato]);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/confirmacoes/clientes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Erro ao buscar clientes');

      const result = await response.json();
      setClientes(result.data || []);
    } catch (error) {
      console.error('[Confirmacoes] Erro ao carregar clientes:', error);
      alert('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadContratos = async (nomeCliente: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/confirmacoes/contratos/${encodeURIComponent(nomeCliente)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Erro ao buscar contratos');

      const result = await response.json();
      setContratos(result.data || []);
    } catch (error) {
      console.error('[Confirmacoes] Erro ao carregar contratos:', error);
      alert('Erro ao carregar contratos');
    }
  };

  const loadEquipamentos = async (contratoId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/confirmacoes/equipamentos/${contratoId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Erro ao buscar equipamentos');

      const result = await response.json();
      setEquipamentos(result.data || []);
      setSelecionados(new Set());
    } catch (error) {
      console.error('[Confirmacoes] Erro ao carregar equipamentos:', error);
      alert('Erro ao carregar equipamentos');
    }
  };

  const handleSelecionarTodos = () => {
    if (selecionados.size === equipamentos.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(equipamentos.map(e => e.id)));
    }
  };

  const handleSelecionarEquipamento = (id: number) => {
    const novo = new Set(selecionados);
    if (novo.has(id)) {
      novo.delete(id);
    } else {
      novo.add(id);
    }
    setSelecionados(novo);
  };

  const handleSalvarConfirmacoes = async () => {
    if (!notaFiscal.trim() || !destino.trim()) {
      alert('Preencha Nota Fiscal e Destino');
      return;
    }

    setSalvando(true);
    try {
      if (editandoId) {
        // Modo edição - atualizar uma confirmação
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/confirmacoes/atualizar/${editandoId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nota_fiscal: notaFiscal,
            destino: destino,
          }),
        });

        if (!response.ok) throw new Error('Erro ao atualizar confirmação');
        alert('Confirmação atualizada com sucesso!');
      } else {
        // Modo criação - salvar múltiplas
        const equipamentosSelecionados = equipamentos.filter(e => selecionados.has(e.id));

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/confirmacoes/salvar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            equipamentos: equipamentosSelecionados.map(e => ({
              equipamento_id: e.id,
              numero_serie: e.numero_serie,
            })),
            nota_fiscal: notaFiscal,
            destino: destino,
          }),
        });

        if (!response.ok) throw new Error('Erro ao salvar confirmações');

        const result = await response.json();
        alert(`${result.salvos} equipamento(s) confirmado(s)!`);
      }

      setShowModal(false);
      setNotaFiscal('');
      setDestino('');
      setEditandoId(null);
      setSelecionados(new Set());

      // Recarregar equipamentos
      if (filtroContrato) {
        await loadEquipamentos(filtroContrato);
      }
    } catch (error) {
      console.error('[Confirmacoes] Erro ao salvar:', error);
      alert('Erro ao salvar confirmações');
    } finally {
      setSalvando(false);
    }
  };

  const handleEditarConfirmacao = (equipamento: Equipamento) => {
    if (equipamento.confirmacao) {
      setEditandoId(equipamento.confirmacao.id);
      setNotaFiscal(equipamento.confirmacao.nota_fiscal || '');
      setDestino(equipamento.confirmacao.destino || '');
      setShowModal(true);
    }
  };

  const handleDeletarConfirmacao = async (confirmacaoId: number) => {
    if (!confirm('Tem certeza que deseja deletar esta confirmação?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/confirmacoes/deletar/${confirmacaoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Erro ao deletar confirmação');

      alert('Confirmação deletada com sucesso!');
      if (filtroContrato) {
        await loadEquipamentos(filtroContrato);
      }
    } catch (error) {
      console.error('[Confirmacoes] Erro ao deletar:', error);
      alert('Erro ao deletar confirmação');
    }
  };

  // Carregar XLSX do CDN
  const loadXLSXLibrary = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).XLSX) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        setTimeout(() => {
          if ((window as any).XLSX) {
            resolve();
          } else {
            reject(new Error('XLSX não carregou'));
          }
        }, 100);
      };

      script.onerror = () => {
        reject(new Error('Erro ao carregar XLSX do CDN'));
      };

      document.head.appendChild(script);
    });
  };

  const handleImportarMassa = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadando(true);
    setMensagemUpload('');

    try {
      await loadXLSXLibrary();

      const XLSX = (window as any).XLSX;
      if (!XLSX) {
        setMensagemUpload('Biblioteca XLSX não carregou. Tente novamente.');
        setUploadando(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });

          // Procurar pela aba 'Confirmacoes'
          let worksheet = workbook.Sheets['Confirmacoes'];
          if (!worksheet) {
            // Se não encontrar, usar a primeira aba
            worksheet = workbook.Sheets[workbook.SheetNames[0]];
          }

          const dados = XLSX.utils.sheet_to_json(worksheet);

          // Validar dados antes de enviar
          if (!dados || dados.length === 0) {
            setMensagemUpload('Arquivo vazio ou sem dados válidos');
            setUploadando(false);
            return;
          }

          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/confirmacoes/importar`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dados }),
          });

          if (!response.ok) throw new Error('Erro ao importar');

          const result = await response.json();

          let msg = `${result.processados} equipamento(s) processado(s)!`;
          if (result.erros > 0) {
            msg += `\n\n${result.erros} erro(s):\n`;
            result.detalhesErros.forEach((e: any) => {
              msg += `- ${e.serial || `Linha ${e.linha}`}: ${e.erro}\n`;
            });
          }

          setMensagemUpload(msg);

          if (filtroContrato) {
            await loadEquipamentos(filtroContrato);
          }
        } catch (error) {
          console.error('[Confirmacoes] Erro ao processar arquivo:', error);
          setMensagemUpload('Erro ao processar arquivo');
        } finally {
          setUploadando(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('[Confirmacoes] Erro ao carregar XLSX:', error);
      setMensagemUpload('Erro ao carregar biblioteca XLSX');
      setUploadando(false);
    }

    event.target.value = '';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
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

          <a href="/clientes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Clientes</span>}
          </a>

          <a href="/contratos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Contratos</span>}
          </a>

          <a href="/equipamentos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Equipamentos</span>}
          </a>

          <a href="/confirmacoes" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
            {sidebarOpen && <span>Confirmacoes</span>}
          </a>

          <a href="/fotos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Fotos</span>}
          </a>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-red-600 rounded transition"
          >
            {sidebarOpen && <span>Sair</span>}
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://raw.githubusercontent.com/iaservicos/IMAGENS/refs/heads/main/Logo_Positivo_Tecnologia_Prote%C3%A7%C3%A3o_Preto-3-(1)%20(1).png"
              alt="Logo Positivo"
              className="h-10 w-auto"
            />
            <h1 className="text-2xl font-bold text-gray-900">Sistema de Vistoria HaaS</h1>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando...</p>
              </div>
            </div>
          ) : (
            <>
              {/* FILTROS */}
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cliente
                    </label>
                    <select
                      value={filtroCliente}
                      onChange={(e) => setFiltroCliente(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Selecione um cliente</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.nome_cliente}>
                          {c.nome_cliente}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Contrato
                    </label>
                    <select
                      value={filtroContrato}
                      onChange={(e) => setFiltroContrato(e.target.value)}
                      disabled={!filtroCliente}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                    >
                      <option value="">Selecione um contrato</option>
                      {contratos.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.numero_contrato}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* AÇÕES */}
              {filtroContrato && (
                <div className="bg-white rounded-lg shadow p-6 mb-8 flex gap-4">
                  <button
                    onClick={() => setShowModal(true)}
                    disabled={selecionados.size === 0}
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Selecionados ({selecionados.size})
                  </button>

                  <button
                    onClick={() => gerarTemplateConfirmacoes()}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold transition"
                  >
                    Baixar Template
                  </button>

                  <label className="px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition cursor-pointer">
                    Importar em Massa
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportarMassa}
                      disabled={uploadando}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* MENSAGEM UPLOAD */}
              {mensagemUpload && (
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-8 whitespace-pre-wrap text-sm text-gray-700">
                  {mensagemUpload}
                </div>
              )}

              {/* EQUIPAMENTOS */}
              {filtroContrato && (
                <div className="bg-white rounded-lg shadow">
                  <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Equipamentos</h2>
                    {equipamentos.length > 0 && (
                      <button
                        onClick={handleSelecionarTodos}
                        className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        {selecionados.size === equipamentos.length ? 'Desselecionar Todos' : 'Selecionar Todos'}
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selecionados.size === equipamentos.length && equipamentos.length > 0}
                              onChange={handleSelecionarTodos}
                              className="w-4 h-4"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Serial</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Modelo</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Nota Fiscal</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Destino</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Acao</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {equipamentos.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-gray-600">
                              Nenhum equipamento encontrado
                            </td>
                          </tr>
                        ) : (
                          equipamentos.map(eq => (
                            <tr key={eq.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  checked={selecionados.has(eq.id)}
                                  onChange={() => handleSelecionarEquipamento(eq.id)}
                                  className="w-4 h-4"
                                />
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">{eq.numero_serie}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.modelo}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.confirmacao?.nota_fiscal || '—'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.confirmacao?.destino || '—'}</td>
                              <td className="px-6 py-4 text-sm space-x-2">
                                {eq.confirmacao ? (
                                  <>
                                    <button
                                      onClick={() => handleEditarConfirmacao(eq)}
                                      className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 transition text-xs"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDeletarConfirmacao(eq.confirmacao!.id)}
                                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-xs"
                                    >
                                      Deletar
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODAL */}
              {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-xl font-bold mb-4">
                      {editandoId ? 'Editar Confirmacao' : `Confirmar ${selecionados.size} Equipamento(s)`}
                    </h3>

                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nota Fiscal
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: NF-123456"
                        value={notaFiscal}
                        onChange={(e) => setNotaFiscal(e.target.value)}
                        disabled={salvando}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Destino
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Sao Paulo - SP"
                        value={destino}
                        onChange={(e) => setDestino(e.target.value)}
                        disabled={salvando}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowModal(false);
                          setNotaFiscal('');
                          setDestino('');
                          setEditandoId(null);
                        }}
                        disabled={salvando}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSalvarConfirmacoes}
                        disabled={salvando}
                        className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
                      >
                        {salvando ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
