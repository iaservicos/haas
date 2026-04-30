import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';

interface Equipamento {
  id: number;
  numero_serie: string;
  modelo: string;
  contrato_id: number;
}

interface Contrato {
  id: number;
  numero_contrato: string;
  nome_cliente: string;
}

interface Confirmacao {
  id: number;
  equipamento_id: number;
  numero_serie: string;
  nota_fiscal: string | null;
  destino: string | null;
}

export function Confirmacoes() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // FILTROS
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroContrato, setFiltroContrato] = useState('');

  // DADOS
  const [clientes, setClientes] = useState<Contrato[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [confirmacoes, setConfirmacoes] = useState<Confirmacao[]>([]);

  // SELEÇÃO
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  // MODAL
  const [showModal, setShowModal] = useState(false);
  const [notaFiscal, setNotaFiscal] = useState('');
  const [destino, setDestino] = useState('');
  const [salvando, setSalvando] = useState(false);

  // UPLOAD
  const [uploadando, setUploadando] = useState(false);
  const [mensagemUpload, setMensagemUpload] = useState('');

  // CARREGAR DADOS INICIAIS
  useEffect(() => {
    loadDados();
  }, []);

  // FILTRAR CONTRATOS QUANDO CLIENTE MUDA
  useEffect(() => {
    if (filtroCliente) {
      const clienteSelecionado = clientes.find(c => c.nome_cliente === filtroCliente);
      if (clienteSelecionado) {
        loadContratos(clienteSelecionado.id);
      }
    } else {
      setContratos([]);
      setFiltroContrato('');
    }
  }, [filtroCliente]);

  // FILTRAR EQUIPAMENTOS QUANDO CONTRATO MUDA
  useEffect(() => {
    if (filtroContrato) {
      loadEquipamentos(parseInt(filtroContrato));
    } else {
      setEquipamentos([]);
    }
  }, [filtroContrato]);

  const loadDados = async () => {
    try {
      setLoading(true);

      // Buscar clientes únicos
      const { data: contratosData, error: contratosError } = await supabase
        .from('contratos')
        .select('id, numero_contrato, nome_cliente')
        .order('nome_cliente');

      if (contratosError) throw contratosError;

      const clientesUnicos = Array.from(
        new Map(
          (contratosData || []).map(c => [c.nome_cliente, c])
        ).values()
      );

      setClientes(clientesUnicos);

      // Buscar confirmações existentes
      const { data: confirmacoesData, error: confirmacoesError } = await supabase
        .from('equipamento_confirmacoes')
        .select('*');

      if (confirmacoesError) throw confirmacoesError;
      setConfirmacoes(confirmacoesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadContratos = async (clienteId: number) => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('id, numero_contrato, nome_cliente')
        .eq('nome_cliente', clientes.find(c => c.id === clienteId)?.nome_cliente || '')
        .order('numero_contrato');

      if (error) throw error;
      setContratos(data || []);
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
    }
  };

  const loadEquipamentos = async (contratoId: number) => {
    try {
      const { data, error } = await supabase
        .from('contrato_equipamentos')
        .select('id, numero_serie, modelo')
        .eq('contrato_id', contratoId)
        .order('numero_serie');

      if (error) throw error;
      setEquipamentos(data || []);
      setSelecionados(new Set());
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    }
  };

  const equipamentosFiltrados = useMemo(() => {
    return equipamentos.map(eq => {
      const confirmacao = confirmacoes.find(c => c.equipamento_id === eq.id);
      return {
        ...eq,
        confirmacao,
      };
    });
  }, [equipamentos, confirmacoes]);

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
      const equipamentosSelecionados = equipamentos.filter(e => selecionados.has(e.id));

      for (const eq of equipamentosSelecionados) {
        const confirmacaoExistente = confirmacoes.find(c => c.equipamento_id === eq.id);

        if (confirmacaoExistente) {
          // Atualizar
          const { error } = await supabase
            .from('equipamento_confirmacoes')
            .update({
              nota_fiscal: notaFiscal,
              destino: destino,
              updated_at: new Date().toISOString(),
            })
            .eq('id', confirmacaoExistente.id);

          if (error) throw error;
        } else {
          // Inserir
          const { error } = await supabase
            .from('equipamento_confirmacoes')
            .insert({
              equipamento_id: eq.id,
              numero_serie: eq.numero_serie,
              nota_fiscal: notaFiscal,
              destino: destino,
            });

          if (error) throw error;
        }
      }

      alert(`✅ ${equipamentosSelecionados.length} equipamento(s) confirmado(s)!`);
      setShowModal(false);
      setNotaFiscal('');
      setDestino('');
      setSelecionados(new Set());
      await loadDados();
      if (filtroContrato) {
        await loadEquipamentos(parseInt(filtroContrato));
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar confirmações');
    } finally {
      setSalvando(false);
    }
  };

  const handleImportarMassa = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadando(true);
    setMensagemUpload('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const dados = XLSX.utils.sheet_to_json(worksheet);

      let sucessos = 0;
      let erros: string[] = [];

      for (const linha of dados) {
        const serial = (linha['Serial'] || linha['serial'] || '').toString().trim();
        const nf = (linha['Nota Fiscal'] || linha['nota_fiscal'] || '').toString().trim();
        const dest = (linha['Destino'] || linha['destino'] || '').toString().trim();

        if (!serial) {
          erros.push('Linha sem Serial');
          continue;
        }

        // Buscar equipamento pelo serial
        const { data: equipData, error: equipError } = await supabase
          .from('contrato_equipamentos')
          .select('id')
          .eq('numero_serie', serial)
          .single();

        if (equipError || !equipData) {
          erros.push(`Serial não encontrado: ${serial}`);
          continue;
        }

        // Verificar se já existe confirmação
        const { data: confirmData } = await supabase
          .from('equipamento_confirmacoes')
          .select('id')
          .eq('equipamento_id', equipData.id)
          .single();

        if (confirmData) {
          // Atualizar
          await supabase
            .from('equipamento_confirmacoes')
            .update({
              nota_fiscal: nf,
              destino: dest,
              updated_at: new Date().toISOString(),
            })
            .eq('id', confirmData.id);
        } else {
          // Inserir
          await supabase
            .from('equipamento_confirmacoes')
            .insert({
              equipamento_id: equipData.id,
              numero_serie: serial,
              nota_fiscal: nf,
              destino: dest,
            });
        }

        sucessos++;
      }

      let msg = `✅ ${sucessos} equipamento(s) processado(s)!`;
      if (erros.length > 0) {
        msg += `\n\n❌ ${erros.length} erro(s):\n${erros.join('\n')}`;
      }

      setMensagemUpload(msg);
      await loadDados();
      if (filtroContrato) {
        await loadEquipamentos(parseInt(filtroContrato));
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      setMensagemUpload('❌ Erro ao processar arquivo');
    } finally {
      setUploadando(false);
      event.target.value = '';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
          
          <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Dashboard</span>}
          </a>

          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
            {sidebarOpen && <span>Confirmações</span>}
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
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="https://raw.githubusercontent.com/iaservicos/IMAGENS/refs/heads/main/Logo_Positivo_Tecnologia_Prote%C3%A7%C3%A3o_Preto-3-(1)%20(1).png"
                alt="Logo Positivo"
                className="h-10 w-auto"
              />
              <h1 className="text-2xl font-bold text-gray-900">Sistema de Vistoria HaaS</h1>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Bem-vindo, <span className="font-semibold text-gray-900">{usuario?.nome || 'Carregando...'}</span></p>
            </div>
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                    className="px-6 py-2 bg-blue-950 hover:bg-black text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Selecionados ({selecionados.size})
                  </button>

                  <label className="px-6 py-2 bg-blue-950 hover:bg-black text-white rounded-lg font-semibold transition cursor-pointer">
                    📥 Importar em Massa
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 whitespace-pre-wrap text-sm text-blue-800">
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {equipamentosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-600">
                              Nenhum equipamento encontrado
                            </td>
                          </tr>
                        ) : (
                          equipamentosFiltrados.map(eq => (
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
                    <h3 className="text-xl font-bold mb-4">Confirmar {selecionados.size} Equipamento(s)</h3>

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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Destino
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: São Paulo - SP"
                        value={destino}
                        onChange={(e) => setDestino(e.target.value)}
                        disabled={salvando}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowModal(false);
                          setNotaFiscal('');
                          setDestino('');
                        }}
                        disabled={salvando}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSalvarConfirmacoes}
                        disabled={salvando}
                        className="flex-1 px-4 py-2 bg-blue-950 text-white rounded-lg hover:bg-black transition disabled:opacity-50"
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
}
