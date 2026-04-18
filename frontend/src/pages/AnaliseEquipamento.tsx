import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface InspecaoItem {
  id: string;
  data_inspecao: string;
  respostas: Record<string, boolean | string>;
  observacoes?: string;
  equipment_type: string;
}

interface EquipamentoAnalise {
  id: number;
  numero_serie: string;
  modelo: string;
  tipo_material: string;
  inspecoes: InspecaoItem[];
  cliente_nome: string;
  numero_contrato: string;
}

export function AnaliseEquipamento() {
  const navigate = useNavigate();
  const [equipamentos, setEquipamentos] = useState<EquipamentoAnalise[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<EquipamentoAnalise | null>(null);
  const [filtroSerie, setFiltroSerie] = useState('');

  useEffect(() => {
    loadEquipamentos();
  }, []);

  const loadEquipamentos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/inspecao/portal/listar`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar dados: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || [];

      // Agrupar por equipamento
      const equipamentosMap = new Map<number, EquipamentoAnalise>();

      data.forEach((inspecao: any) => {
        const equipId = inspecao.equipamento_id;
        if (!equipId) return;

        if (!equipamentosMap.has(equipId)) {
          equipamentosMap.set(equipId, {
            id: equipId,
            numero_serie: inspecao.contrato_equipamentos?.numero_serie || '',
            modelo: inspecao.contrato_equipamentos?.modelo || '',
            tipo_material: inspecao.contrato_equipamentos?.tipo_material || inspecao.equipment_type,
            cliente_nome: inspecao.contrato_equipamentos?.contratos?.nome_cliente || '',
            numero_contrato: inspecao.contrato_equipamentos?.contratos?.numero_contrato || '',
            inspecoes: [],
          });
        }

        const equip = equipamentosMap.get(equipId)!;
        equip.inspecoes.push({
          id: inspecao.id,
          data_inspecao: inspecao.data_inspecao,
          respostas: inspecao.respostas || {},
          observacoes: inspecao.observacoes,
          equipment_type: inspecao.equipment_type,
        });
      });

      // Ordenar inspeções por data (mais recente primeiro)
      equipamentosMap.forEach((equip) => {
        equip.inspecoes.sort((a, b) =>
          new Date(b.data_inspecao).getTime() - new Date(a.data_inspecao).getTime()
        );
      });

      setEquipamentos(Array.from(equipamentosMap.values()));
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    const dataParte = data.split('T')[0];
    const [ano, mes, dia] = dataParte.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const equipamentosFiltrados = equipamentos.filter((e) =>
    e.numero_serie.toLowerCase().includes(filtroSerie.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600 font-semibold">Carregando dados...</p>
      </div>
    );
  }

  if (!equipamentoSelecionado) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          {/* HEADER */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-blue-600 hover:text-blue-800 font-semibold mb-4"
            >
              ← Voltar ao Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Análise de Equipamentos</h1>
            <p className="text-gray-600 mt-2">Visualize o histórico de inspeções por equipamento</p>
          </div>

          {/* FILTRO */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <input
              type="text"
              value={filtroSerie}
              onChange={(e) => setFiltroSerie(e.target.value)}
              placeholder="Filtrar por número de série..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* LISTA DE EQUIPAMENTOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipamentosFiltrados.map((equip) => {
              const totalInspecoes = equip.inspecoes.length;
              const comAvaria = equip.inspecoes.filter((i) =>
                Object.values(i.respostas).some((r) => r === false || r === 'Não')
              ).length;
              const conformidade = totalInspecoes > 0 ? Math.round(((totalInspecoes - comAvaria) / totalInspecoes) * 100) : 0;

              return (
                <div
                  key={equip.id}
                  onClick={() => setEquipamentoSelecionado(equip)}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer p-6"
                >
                  {/* HEADER DO CARD */}
                  <div className="border-b border-gray-200 pb-4 mb-4">
                    <p className="text-xs text-gray-600 uppercase font-semibold">Série</p>
                    <p className="text-lg font-mono font-bold text-black">{equip.numero_serie}</p>
                  </div>

                  {/* INFORMAÇÕES */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Modelo</p>
                      <p className="text-sm text-gray-900">{equip.modelo || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Cliente</p>
                      <p className="text-sm text-gray-900 font-semibold">{equip.cliente_nome || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Contrato</p>
                      <p className="text-sm text-gray-900">{equip.numero_contrato || '—'}</p>
                    </div>
                  </div>

                  {/* ESTATÍSTICAS */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{totalInspecoes}</p>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Inspeções</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-700">{comAvaria}</p>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Com Avaria</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${conformidade >= 75 ? 'text-green-600' : 'text-orange-600'}`}>
                        {conformidade}%
                      </p>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Conformidade</p>
                    </div>
                  </div>

                  {/* BOTÃO */}
                  <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm">
                    Ver Análise Detalhada
                  </button>
                </div>
              );
            })}
          </div>

          {equipamentosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 font-semibold">Nenhum equipamento encontrado</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // VISTA DETALHADA DO EQUIPAMENTO
  const equip = equipamentoSelecionado;
  const totalInspecoes = equip.inspecoes.length;
  const comAvaria = equip.inspecoes.filter((i) =>
    Object.values(i.respostas).some((r) => r === false || r === 'Não')
  ).length;
  const conformidade = totalInspecoes > 0 ? Math.round(((totalInspecoes - comAvaria) / totalInspecoes) * 100) : 0;

  // Coletar todas as perguntas únicas
  const todasAsPerguntas = Array.from(
    new Set(
      equip.inspecoes.flatMap((i) => Object.keys(i.respostas))
    )
  ).sort();

  // Analisar quais itens mais faltam
  const analiseItens = todasAsPerguntas.map((pergunta) => {
    const faltaCount = equip.inspecoes.filter((i) => {
      const resposta = i.respostas[pergunta];
      return resposta === false || resposta === 'Não';
    }).length;
    return { pergunta, faltaCount, percentualFalta: Math.round((faltaCount / totalInspecoes) * 100) };
  }).sort((a, b) => b.percentualFalta - a.percentualFalta);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <button
            onClick={() => setEquipamentoSelecionado(null)}
            className="text-blue-600 hover:text-blue-800 font-semibold mb-4"
          >
            ← Voltar à Lista
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Análise Detalhada do Equipamento</h1>
        </div>

        {/* INFORMAÇÕES DO EQUIPAMENTO */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border-r border-gray-200">
              <p className="text-xs text-gray-600 uppercase font-semibold">Série</p>
              <p className="text-2xl font-mono font-bold text-black mt-2">{equip.numero_serie}</p>
            </div>
            <div className="border-r border-gray-200">
              <p className="text-xs text-gray-600 uppercase font-semibold">Modelo</p>
              <p className="text-lg text-gray-900 font-semibold mt-2">{equip.modelo || '—'}</p>
            </div>
            <div className="border-r border-gray-200">
              <p className="text-xs text-gray-600 uppercase font-semibold">Cliente</p>
              <p className="text-lg text-gray-900 font-semibold mt-2">{equip.cliente_nome || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Contrato</p>
              <p className="text-lg text-gray-900 font-semibold mt-2">{equip.numero_contrato || '—'}</p>
            </div>
          </div>
        </div>

        {/* CARDS DE ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-100 rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total de Inspeções</p>
            <p className="text-5xl font-bold text-blue-900 mt-3">{totalInspecoes}</p>
          </div>

          <div className="bg-gray-200 rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Com Avaria</p>
            <p className="text-5xl font-bold text-gray-800 mt-3">{comAvaria}</p>
          </div>

          <div className="bg-gray-150 rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Conformidade</p>
            <p className={`text-5xl font-bold mt-3 ${conformidade >= 75 ? 'text-green-600' : 'text-orange-600'}`}>
              {conformidade}%
            </p>
          </div>
        </div>

        {/* ANÁLISE DE ITENS CRÍTICOS */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Itens Críticos (Mais Faltam)</h2>
          <div className="space-y-4">
            {analiseItens.slice(0, 5).map((item) => (
              <div key={item.pergunta} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 capitalize">{item.pergunta.replace(/_/g, ' ')}</p>
                  <div className="mt-2 w-full bg-gray-300 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${item.percentualFalta}%` }}
                    />
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-lg font-bold text-red-600">{item.percentualFalta}%</p>
                  <p className="text-xs text-gray-600">{item.faltaCount} de {totalInspecoes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TABELA COMPARATIVA */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Histórico de Inspeções</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase sticky left-0 bg-gray-50 z-10">
                    Data
                  </th>
                  {todasAsPerguntas.map((pergunta) => (
                    <th
                      key={pergunta}
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap"
                    >
                      {pergunta.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {equip.inspecoes.map((inspecao) => (
                  <tr key={inspecao.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 sticky left-0 bg-white hover:bg-gray-50">
                      {formatarData(inspecao.data_inspecao)}
                    </td>
                    {todasAsPerguntas.map((pergunta) => {
                      const resposta = inspecao.respostas[pergunta];
                      const isOk = resposta === true || resposta === 'Sim';
                      const isFaltando = resposta === false || resposta === 'Não';

                      return (
                        <td
                          key={pergunta}
                          className={`px-4 py-4 text-center text-sm font-semibold ${
                            isOk
                              ? 'bg-green-50 text-green-700'
                              : isFaltando
                              ? 'bg-red-50 text-red-700'
                              : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          {isOk ? '✓' : isFaltando ? '✕' : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* OBSERVAÇÕES */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Observações Recentes</h2>
          <div className="space-y-4">
            {equip.inspecoes
              .filter((i) => i.observacoes)
              .slice(0, 5)
              .map((inspecao) => (
                <div key={inspecao.id} className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                  <p className="text-xs text-gray-600 font-semibold">{formatarData(inspecao.data_inspecao)}</p>
                  <p className="text-sm text-gray-900 mt-2">{inspecao.observacoes}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
