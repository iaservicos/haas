import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";

interface Confirmacao {
  id: string;
  equipamento_id: string;
  usuario_id: string;
  equipamento_ligado: boolean;
  sem_problemas_visuais: boolean;
  funcionando_normalmente: boolean;
  fonte_presente?: boolean;
  teclado_presente?: boolean;
  mouse_presente?: boolean;
  url_foto?: string;
  status_analise: 'pendente' | 'analisando' | 'concluido' | 'erro';
  resultado_analise?: 'ok' | 'problema';
  analise_gptmaker?: string;
  data_criacao: string;
  data_envio?: string;
  equipamento?: {
    numero_serie: string;
    modelo: string;
    tipo_equipamento: string;
  };
  usuario?: {
    email: string;
    nome: string;
  };
}

export function VerConfirmacoes() {
  const { usuario, logout } = useAuth();
  const [confirmacoes, setConfirmacoes] = useState<Confirmacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroResultado, setFiltroResultado] = useState('');
  const [confirmacaoSelecionada, setConfirmacaoSelecionada] = useState<Confirmacao | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    carregarConfirmacoes();
    const interval = setInterval(carregarConfirmacoes, 5000);
    return () => clearInterval(interval);
  }, []);

  const carregarConfirmacoes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/confirmacoes/confirmacoes-clientes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setConfirmacoes(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar confirmações:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmacoesFiltradas = confirmacoes.filter((conf) => {
    if (filtroStatus && conf.status_analise !== filtroStatus) return false;
    if (filtroResultado && conf.resultado_analise !== filtroResultado) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-gray-100 text-gray-800';
      case 'analisando':
        return 'bg-yellow-100 text-yellow-800';
      case 'concluido':
        return 'bg-green-100 text-green-800';
      case 'erro':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultadoColor = (resultado?: string) => {
    switch (resultado) {
      case 'ok':
        return 'bg-green-100 text-green-800';
      case 'problema':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'analisando':
        return 'Analisando';
      case 'concluido':
        return 'Concluído';
      case 'erro':
        return 'Erro';
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

          <a href="/contratos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Contratos</span>}
          </a>

          <a href="/clientes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Clientes</span>}
          </a>

          <a href="/equipamentos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Equipamentos</span>}
          </a>

          <a href="/confirmacoes" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
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
              <h1 className="text-2xl font-bold text-gray-900">Confirmações dos Clientes</h1>
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
              <h2 className="text-3xl font-bold text-gray-900">Confirmações dos Clientes</h2>
              <button
                onClick={carregarConfirmacoes}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Atualizar
              </button>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="pendente">Pendente</option>
                    <option value="analisando">Analisando</option>
                    <option value="concluido">Concluído</option>
                    <option value="erro">Erro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
                  <select
                    value={filtroResultado}
                    onChange={(e) => setFiltroResultado(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="ok">OK</option>
                    <option value="problema">Problema</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="text-center text-gray-600">Carregando confirmações...</p>
            ) : confirmacoesFiltradas.length === 0 ? (
              <p className="text-center text-gray-600">Nenhuma confirmação encontrada</p>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Equipamento</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Resultado</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Envio</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {confirmacoesFiltradas.map((conf) => (
                      <tr key={conf.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{conf.usuario?.nome || '-'}</p>
                            <p className="text-xs text-gray-600">{conf.usuario?.email || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{conf.equipamento?.numero_serie || '-'}</p>
                            <p className="text-xs text-gray-600">{conf.equipamento?.modelo || '-'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(conf.status_analise)}`}>
                            {getStatusLabel(conf.status_analise)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {conf.resultado_analise ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getResultadoColor(conf.resultado_analise)}`}>
                              {conf.resultado_analise === 'ok' ? 'OK' : 'Problema'}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {conf.data_envio ? new Date(conf.data_envio).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => setConfirmacaoSelecionada(conf)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal de Detalhes */}
            {confirmacaoSelecionada && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-90vh overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-2xl font-bold text-gray-900">Detalhes da Confirmação</h3>
                      <button
                        onClick={() => setConfirmacaoSelecionada(null)}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-6">
                      {/* Cliente */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Cliente</h4>
                        <p className="text-gray-600">{confirmacaoSelecionada.usuario?.nome}</p>
                        <p className="text-sm text-gray-500">{confirmacaoSelecionada.usuario?.email}</p>
                      </div>

                      {/* Equipamento */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Equipamento</h4>
                        <p className="text-gray-600">{confirmacaoSelecionada.equipamento?.numero_serie}</p>
                        <p className="text-sm text-gray-500">{confirmacaoSelecionada.equipamento?.modelo}</p>
                      </div>

                      {/* Checklist */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Checklist</h4>
                        <div className="space-y-1">
                          <p className="text-sm"><span className={confirmacaoSelecionada.equipamento_ligado ? '✅' : '❌'}></span> Equipamento ligado</p>
                          <p className="text-sm"><span className={confirmacaoSelecionada.sem_problemas_visuais ? '✅' : '❌'}></span> Sem problemas visuais</p>
                          <p className="text-sm"><span className={confirmacaoSelecionada.funcionando_normalmente ? '✅' : '❌'}></span> Funcionando normalmente</p>
                          {confirmacaoSelecionada.fonte_presente !== undefined && (
                            <p className="text-sm"><span className={confirmacaoSelecionada.fonte_presente ? '✅' : '❌'}></span> Fonte presente</p>
                          )}
                          {confirmacaoSelecionada.teclado_presente !== undefined && (
                            <p className="text-sm"><span className={confirmacaoSelecionada.teclado_presente ? '✅' : '❌'}></span> Teclado presente</p>
                          )}
                          {confirmacaoSelecionada.mouse_presente !== undefined && (
                            <p className="text-sm"><span className={confirmacaoSelecionada.mouse_presente ? '✅' : '❌'}></span> Mouse presente</p>
                          )}
                        </div>
                      </div>

                      {/* Foto */}
                      {confirmacaoSelecionada.url_foto && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Foto do Equipamento</h4>
                          <img
                            src={confirmacaoSelecionada.url_foto}
                            alt="Equipamento"
                            className="max-w-full h-auto rounded-lg border border-gray-300"
                          />
                        </div>
                      )}

                      {/* Análise GPT-Maker */}
                      {confirmacaoSelecionada.analise_gptmaker && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Análise GPT-Maker</h4>
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{confirmacaoSelecionada.analise_gptmaker}</p>
                          </div>
                        </div>
                      )}

                      {/* Status e Resultado */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Status</h4>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(confirmacaoSelecionada.status_analise)}`}>
                            {getStatusLabel(confirmacaoSelecionada.status_analise)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Resultado</h4>
                          {confirmacaoSelecionada.resultado_analise ? (
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getResultadoColor(confirmacaoSelecionada.resultado_analise)}`}>
                              {confirmacaoSelecionada.resultado_analise === 'ok' ? 'OK' : 'Problema'}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setConfirmacaoSelecionada(null)}
                      className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
