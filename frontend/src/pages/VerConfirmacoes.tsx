// frontend/src/pages/VerConfirmacoes.tsx

import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

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
  url_foto: string;
  status_analise: string;
  resultado_analise: string;
  data_envio: string;
  data_criacao: string;
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
  const [confirmacoes, setConfirmacoes] = useState<Confirmacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmacaoSelecionada, setConfirmacaoSelecionada] = useState<Confirmacao | null>(null);
  const [filtro, setFiltro] = useState('todas');

  useEffect(() => {
    carregarConfirmacoes();
  }, []);

  const carregarConfirmacoes = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/confirmacoes/confirmacoes-clientes');
      setConfirmacoes(Array.isArray(response.data) ? response.data : []);

    } catch (error) {
      console.error('Erro ao carregar confirmações:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtrarConfirmacoes = () => {
    if (filtro === 'todas') return confirmacoes;
    if (filtro === 'ok') return confirmacoes.filter(c => c.resultado_analise === 'ok');
    if (filtro === 'problema') return confirmacoes.filter(c => c.resultado_analise === 'problema');
    return confirmacoes;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ok') {
      return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">✅ OK</span>;
    }
    if (status === 'problema') {
      return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">❌ Problema</span>;
    }
    return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">⏳ Analisando</span>;
  };

  const getStatusIcon = (valor: boolean | undefined) => {
    return valor ? '✅' : '❌';
  };

  const confirmacoesFiltradas = filtrarConfirmacoes();

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-center text-gray-600">Carregando confirmações...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Confirmações de Clientes</h2>
        <p className="text-gray-600">Visualize as confirmações enviadas pelos clientes e os resultados das análises</p>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
        <div className="flex gap-4">
          <button
            onClick={() => setFiltro('todas')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filtro === 'todas'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Todas ({confirmacoes.length})
          </button>
          <button
            onClick={() => setFiltro('ok')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filtro === 'ok'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            OK ({confirmacoes.filter(c => c.resultado_analise === 'ok').length})
          </button>
          <button
            onClick={() => setFiltro('problema')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filtro === 'problema'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Problema ({confirmacoes.filter(c => c.resultado_analise === 'problema').length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LISTA DE CONFIRMAÇÕES */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Confirmações</h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {confirmacoesFiltradas.length === 0 ? (
                <div className="p-4 text-center text-gray-600">
                  Nenhuma confirmação encontrada
                </div>
              ) : (
                confirmacoesFiltradas.map(confirmacao => (
                  <button
                    key={confirmacao.id}
                    onClick={() => setConfirmacaoSelecionada(confirmacao)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                      confirmacaoSelecionada?.id === confirmacao.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900 text-sm">
                        {confirmacao.usuario?.nome || 'Cliente'}
                      </p>
                      {getStatusBadge(confirmacao.resultado_analise)}
                    </div>
                    <p className="text-xs text-gray-600">
                      Série: {confirmacao.equipamento?.numero_serie || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(confirmacao.data_envio).toLocaleDateString('pt-BR')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* DETALHES DA CONFIRMAÇÃO */}
        <div className="lg:col-span-2">
          {confirmacaoSelecionada ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Detalhes da Confirmação</h3>
              </div>
              <div className="p-6 space-y-6">
                {/* INFORMAÇÕES DO CLIENTE */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Informações do Cliente</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Nome</p>
                      <p className="font-semibold text-gray-900">{confirmacaoSelecionada.usuario?.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{confirmacaoSelecionada.usuario?.email}</p>
                    </div>
                  </div>
                </div>

                {/* INFORMAÇÕES DO EQUIPAMENTO */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Informações do Equipamento</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Número de Série</p>
                      <p className="font-semibold text-gray-900">{confirmacaoSelecionada.equipamento?.numero_serie}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Modelo</p>
                      <p className="font-semibold text-gray-900">{confirmacaoSelecionada.equipamento?.modelo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tipo</p>
                      <p className="font-semibold text-gray-900">{confirmacaoSelecionada.equipamento?.tipo_equipamento}</p>
                    </div>
                  </div>
                </div>

                {/* CHECKLIST */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Checklist</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      <span className="mr-2">{getStatusIcon(confirmacaoSelecionada.equipamento_ligado)}</span>
                      Equipamento ligado
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="mr-2">{getStatusIcon(confirmacaoSelecionada.sem_problemas_visuais)}</span>
                      Sem problemas visuais
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="mr-2">{getStatusIcon(confirmacaoSelecionada.funcionando_normalmente)}</span>
                      Funcionando normalmente
                    </p>
                    {confirmacaoSelecionada.equipamento?.tipo_equipamento === 'Notebook' && (
                      <p className="text-sm text-gray-700">
                        <span className="mr-2">{getStatusIcon(confirmacaoSelecionada.fonte_presente)}</span>
                        Fonte presente
                      </p>
                    )}
                    {confirmacaoSelecionada.equipamento?.tipo_equipamento === 'Desktop' && (
                      <>
                        <p className="text-sm text-gray-700">
                          <span className="mr-2">{getStatusIcon(confirmacaoSelecionada.teclado_presente)}</span>
                          Teclado presente
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="mr-2">{getStatusIcon(confirmacaoSelecionada.mouse_presente)}</span>
                          Mouse presente
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* FOTO */}
                {confirmacaoSelecionada.url_foto && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Foto do Equipamento</h4>
                    <img
                      src={confirmacaoSelecionada.url_foto}
                      alt="Equipamento"
                      className="w-full h-64 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {/* RESULTADO DA ANÁLISE */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Resultado da Análise</h4>
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(confirmacaoSelecionada.resultado_analise)}
                    </div>
                    <p className="text-sm text-gray-700">
                      Status: <span className="font-semibold">{confirmacaoSelecionada.status_analise}</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Data de Envio: <span className="font-semibold">{new Date(confirmacaoSelecionada.data_envio).toLocaleString('pt-BR')}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">Selecione uma confirmação para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
