import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function AnaliseEquipamento() {
  const navigate = useNavigate();
  const [vistoriasPortal, setVistoriasPortal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analiseCards, setAnaliseCards] = useState<any[]>([]);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [clientesUnicos, setClientesUnicos] = useState<string[]>([]);
  const [tiposUnicos, setTiposUnicos] = useState<string[]>([]);

  useEffect(() => {
    loadVistoriasPortal();
  }, []);

  useEffect(() => {
    gerarAnaliseCards();
  }, [vistoriasPortal, filtroCliente, filtroTipo]);

  const loadVistoriasPortal = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/inspecao/portal/listar`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar vistorias: ${response.status}`);
      }

      const result = await response.json();
      setVistoriasPortal(result.data || []);

      // Extrair clientes e tipos únicos
      const clientes = [...new Set(
        (result.data || []).map((v: any) => v.contrato_equipamentos?.contratos?.nome_cliente)
      )].filter(Boolean).sort() as string[];

      const tipos = [...new Set(
        (result.data || []).map((v: any) => v.equipment_type)
      )].filter(Boolean).sort() as string[];

      setClientesUnicos(clientes);
      setTiposUnicos(tipos);
    } catch (error) {
      console.error('Erro ao carregar vistorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const gerarAnaliseCards = () => {
    // Agrupar por Cliente + Tipo
    const grupos: { [key: string]: any[] } = {};

    vistoriasPortal.forEach((v: any) => {
      const cliente = v.contrato_equipamentos?.contratos?.nome_cliente;
      const tipo = v.equipment_type;

      if (!cliente || !tipo) return;

      // Aplicar filtros
      if (filtroCliente && cliente !== filtroCliente) return;
      if (filtroTipo && tipo !== filtroTipo) return;

      const chave = `${cliente}|${tipo}`;
      if (!grupos[chave]) {
        grupos[chave] = [];
      }
      grupos[chave].push(v);
    });

    // Converter para array de cards
    const cards = Object.entries(grupos).map(([chave, vistorias]) => {
      const [cliente, tipo] = chave.split('|');
      const totalInspecoes = vistorias.length;
      const comAvaria = vistorias.filter((v: any) =>
        Object.values(v.respostas || {}).some((r: any) => r === false || r === 'Não')
      ).length;
      const equipamentoOk = totalInspecoes - comAvaria;
      const conformidade = Math.round(((totalInspecoes - comAvaria) / totalInspecoes) * 100);

      return {
        cliente,
        tipo,
        totalInspecoes,
        comAvaria,
        equipamentoOk,
        conformidade,
        vistorias,
      };
    });

    // Ordenar por conformidade (descendente)
    cards.sort((a, b) => b.conformidade - a.conformidade);
    setAnaliseCards(cards);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <p className="text-center text-gray-600">Carregando análise de equipamentos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold"
          >
            ← Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Análise de Equipamentos</h1>
          <p className="text-gray-600 mt-2">Conformidade por Cliente e Tipo de Produto</p>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
              <select
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os Clientes</option>
                {clientesUnicos.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Produto</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os Tipos</option>
                {tiposUnicos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CARDS DE ANÁLISE */}
        {analiseCards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 font-semibold">Nenhuma análise encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analiseCards.map((card, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 border-l-4 border-blue-600">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{card.cliente}</h3>
                  <p className="text-sm text-gray-600 mt-1">{card.tipo}</p>
                </div>

                {/* ESTATÍSTICAS */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total de Inspeções:</span>
                    <span className="text-lg font-bold text-gray-900">{card.totalInspecoes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Com Avaria:</span>
                    <span className="text-lg font-bold text-red-600">{card.comAvaria}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Equipamento OK:</span>
                    <span className="text-lg font-bold text-green-600">{card.equipamentoOk}</span>
                  </div>
                </div>

                {/* CONFORMIDADE */}
                <div className={`p-4 rounded text-center border ${
                  card.conformidade >= 75
                    ? 'bg-green-50 border-green-200'
                    : card.conformidade >= 50
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Conformidade</p>
                  <p className={`text-3xl font-bold mt-2 ${
                    card.conformidade >= 75
                      ? 'text-green-600'
                      : card.conformidade >= 50
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {card.conformidade}%
                  </p>
                </div>

                {/* BARRA DE PROGRESSO */}
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition ${
                      card.conformidade >= 75
                        ? 'bg-green-600'
                        : card.conformidade >= 50
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${card.conformidade}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
