import React, { useEffect, useState } from 'react';

interface Props {
  vistoriasPortal: any[];
  clienteSelecionado: string;
  tipoSelecionado: string;
  onClose: () => void;
}

export function AnaliseClienteTipo({ vistoriasPortal, clienteSelecionado, tipoSelecionado, onClose }: Props) {
  const [analise, setAnalise] = useState<any>(null);

  useEffect(() => {
    gerarAnalise();
  }, [vistoriasPortal, clienteSelecionado, tipoSelecionado]);

  const gerarAnalise = () => {
    if (!clienteSelecionado || !tipoSelecionado) {
      setAnalise(null);
      return;
    }

    // Filtrar vistorias por cliente e tipo
    const vistoriasFiltradasClienteTipo = vistoriasPortal.filter((v: any) => {
      const cliente = v.contrato_equipamentos?.contratos?.nome_cliente;
      const tipo = v.equipment_type;
      return cliente === clienteSelecionado && tipo === tipoSelecionado;
    });

    if (vistoriasFiltradasClienteTipo.length === 0) {
      setAnalise(null);
      return;
    }

    // Coletar todas as perguntas
    const todasAsPerguntas = Array.from(
      new Set(
        vistoriasFiltradasClienteTipo.flatMap((v: any) => Object.keys(v.respostas || {}))
      )
    ).sort();

    // Analisar cada pergunta
    const analisePerguntas = todasAsPerguntas.map((pergunta) => {
      const totalRespostas = vistoriasFiltradasClienteTipo.length;
      const respostasOk = vistoriasFiltradasClienteTipo.filter((v: any) => {
        const resposta = v.respostas?.[pergunta];
        return resposta === true || resposta === 'Sim';
      }).length;
      const respostasFaltando = vistoriasFiltradasClienteTipo.filter((v: any) => {
        const resposta = v.respostas?.[pergunta];
        return resposta === false || resposta === 'Não';
      }).length;

      return {
        pergunta,
        totalRespostas,
        respostasOk,
        respostasFaltando,
        percentualOk: Math.round((respostasOk / totalRespostas) * 100),
        percentualFaltando: Math.round((respostasFaltando / totalRespostas) * 100),
      };
    });

    // Ordenar por percentual de falta (descendente)
    analisePerguntas.sort((a, b) => b.percentualFaltando - a.percentualFaltando);

    // Calcular estatísticas gerais
    const totalInspecoes = vistoriasFiltradasClienteTipo.length;
    const comAvaria = vistoriasFiltradasClienteTipo.filter((v: any) =>
      Object.values(v.respostas || {}).some((r: any) => r === false || r === 'Não')
    ).length;
    const conformidade = Math.round(((totalInspecoes - comAvaria) / totalInspecoes) * 100);

    setAnalise({
      cliente: clienteSelecionado,
      tipo: tipoSelecionado,
      totalInspecoes,
      comAvaria,
      equipamentoOk: totalInspecoes - comAvaria,
      conformidade,
      perguntas: analisePerguntas,
      perguntasCriticas: analisePerguntas.filter((p) => p.percentualFaltando > 30),
      vistorias: vistoriasFiltradasClienteTipo,
    });
  };

  if (!analise) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8 border-l-4 border-blue-600">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">Análise: {analise.cliente} - {analise.tipo}</h3>
        <p className="text-sm text-gray-600 mt-1">Conformidade de itens por número de série</p>
      </div>

      {/* CARDS DE ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <p className="text-xs text-gray-600 uppercase font-semibold">Total de Inspeções</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{analise.totalInspecoes}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <p className="text-xs text-gray-600 uppercase font-semibold">Com Avaria</p>
          <p className="text-2xl font-bold text-gray-700 mt-2">{analise.comAvaria}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <p className="text-xs text-gray-600 uppercase font-semibold">Equipamento OK</p>
          <p className="text-2xl font-bold text-gray-700 mt-2">{analise.equipamentoOk}</p>
        </div>
        <div className={`p-4 rounded border ${analise.conformidade >= 75 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className="text-xs text-gray-600 uppercase font-semibold">Conformidade</p>
          <p className={`text-2xl font-bold mt-2 ${analise.conformidade >= 75 ? 'text-green-600' : 'text-orange-600'}`}>{analise.conformidade}%</p>
        </div>
      </div>

      {/* ITENS CRÍTICOS */}
      {analise.perguntasCriticas.length > 0 && (
        <div className="bg-red-50 p-4 rounded border border-red-200 mb-6">
          <h4 className="text-sm font-bold text-red-800 mb-3">⚠️ Itens Críticos (Faltam em &gt;30% das inspeções)</h4>
          <div className="flex flex-wrap gap-2">
            {analise.perguntasCriticas.slice(0, 5).map((p: any) => (
              <span key={p.pergunta} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                {p.pergunta.replace(/_/g, ' ')}: {p.percentualFaltando}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TABELA COM COLUNAS POR SÉRIE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r border-gray-200">Item</th>
              {analise.vistorias.map((v: any, idx: number) => (
                <th key={idx} className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r border-gray-200 whitespace-nowrap">
                  <div className="text-xs">{v.contrato_equipamentos?.numero_serie}</div>
                  <div className="text-xs text-gray-500">{new Date(v.data_inspecao).toLocaleDateString('pt-BR')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {analise.perguntas.map((p: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-200 bg-gray-50 capitalize sticky left-0 z-10">
                  {p.pergunta.replace(/_/g, ' ')}
                </td>
                {analise.vistorias.map((v: any, vidx: number) => {
                  const resposta = v.respostas?.[p.pergunta];
                  const isOk = resposta === true || resposta === 'Sim';
                  const isFaltando = resposta === false || resposta === 'Não';
                  
                  return (
                    <td key={vidx} className="px-3 py-3 text-center border-r border-gray-200">
                      {isFaltando && (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-800 font-bold">✕</span>
                      )}
                      {isOk && (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-800 font-bold">✓</span>
                      )}
                      {!isOk && !isFaltando && (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-800 font-bold">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-4">✓ = OK | ✕ = Faltando | - = Sem resposta</p>
    </div>
  );
}
