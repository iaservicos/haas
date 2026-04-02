import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface Contrato {
  id: number;
  nome: string;
  numero_contrato: string;
  status: string;
  data_inicio: string;
  data_fim: string;
}

interface Equipamento {
  id: number;
  numero_serie: string;
  modelo: string;
  tipo: string;
  localizacao: string;
  status: string;
}

export function DashboardCliente() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [contratoSelecionado, setContratoSelecionado] = useState<number | null>(null);
  const [stats, setStats] = useState({
    totalContratos: 0,
    totalEquipamentos: 0,
    checklistsPendentes: 0,
  });

  // CARREGAR CONTRATOS DO CLIENTE
  useEffect(() => {
    loadContratos();
  }, [usuario]);

  // CARREGAR EQUIPAMENTOS QUANDO CONTRATO É SELECIONADO
  useEffect(() => {
    if (contratoSelecionado) {
      loadEquipamentos(contratoSelecionado);
    }
  }, [contratoSelecionado]);

  const loadContratos = async () => {
    try {
      setLoading(true);
      
      if (!usuario?.id) {
        console.log('Usuário não identificado');
        setLoading(false);
        return;
      }

      console.log('Buscando contratos para usuário:', usuario.id);

      // ⚡ CORRIGIDO: Buscar contratos vinculados ao usuário cliente
      const { data, error } = await supabase
        .from('usuario_contratos')
        .select('contrato_id')
        .eq('usuario_id', usuario.id);

      if (error) {
        console.error('Erro ao buscar usuario_contratos:', error);
        throw error;
      }

      console.log('usuario_contratos encontrados:', data);

      if (!data || data.length === 0) {
        console.log('Nenhum contrato vinculado ao usuário');
        setContratos([]);
        setLoading(false);
        return;
      }

      // Extrair IDs dos contratos
      const contratoIds = data.map((uc: any) => uc.contrato_id);
      console.log('Contrato IDs:', contratoIds);

      // Buscar dados dos contratos
      const { data: contratosData, error: contratosError } = await supabase
        .from('contratos')
        .select('*')
        .in('id', contratoIds);

      if (contratosError) {
        console.error('Erro ao buscar contratos:', contratosError);
        throw contratosError;
      }

      console.log('Contratos encontrados:', contratosData);

      setContratos(contratosData || []);
      setStats(prev => ({
        ...prev,
        totalContratos: contratosData?.length || 0,
      }));

      // Selecionar primeiro contrato por padrão
      if (contratosData && contratosData.length > 0) {
        setContratoSelecionado(contratosData[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipamentos = async (contratoId: number) => {
    try {
      console.log('Buscando equipamentos para contrato:', contratoId);

      // ⚡ CORRIGIDO: Buscar equipamentos do contrato
      const { data, error } = await supabase
        .from('equipamentos_cliente')
        .select('*')
        .eq('contrato_id', contratoId);

      if (error) {
        console.error('Erro ao buscar equipamentos:', error);
        throw error;
      }

      console.log('Equipamentos encontrados:', data);

      setEquipamentos(data || []);
      
      // Contar checklists pendentes
      const pendentes = data?.filter((e: any) => e.status === 'Pendente').length || 0;
      
      setStats(prev => ({
        ...prev,
        totalEquipamentos: data?.length || 0,
        checklistsPendentes: pendentes,
      }));
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    }
  };

  const handleIniciarChecklist = (equipamentoId: number) => {
    navigate(`/checklist/${equipamentoId}`);
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
          
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
            {sidebarOpen && <span>Dashboard</span>}
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
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portal HaaS - Cliente</h1>
            <p className="text-sm text-gray-600">Bem-vindo, {usuario?.nome}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">{new Date().toLocaleDateString('pt-BR')}</p>
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
              {/* INSTRUÇÕES INICIAIS */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h2 className="text-lg font-semibold text-blue-900 mb-4"> Instruções Importantes</h2>
                <div className="space-y-3 text-blue-800 text-sm">
                  <p><strong>1. Vistoria Visual:</strong> Observe danos físicos, peças quebradas, amassados, manchas e irregularidades.</p>
                  <p><strong>2. Registro:</strong> Pequenas marcas de uso são permitidas. Registre tudo na planilha.</p>
                  <p><strong>3. Fotos:</strong> Tire fotos de cada equipamento conforme solicitado.</p>
                  <p><strong>4. Higienização:</strong> Após vistoria, higienize e embale o equipamento.</p>
                  <p><strong>5. Embalagem:</strong> Use fita transparente e lacre bem a caixa.</p>
                  <p><strong>6. Identificação:</strong> Coloque folha com série, modelo, quantidade, dimensões e peso.</p>
                </div>
              </div>

              {/* ESTATÍSTICAS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalContratos}</div>
                  <p className="text-gray-600">Contratos Vinculados</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalEquipamentos}</div>
                  <p className="text-gray-600">Equipamentos</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-orange-600 mb-2">{stats.checklistsPendentes}</div>
                  <p className="text-gray-600">Checklists Pendentes</p>
                </div>
              </div>

              {/* CONTRATOS */}
              <div className="bg-white rounded-lg shadow mb-8">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-gray-900">Contratos Vinculados</h2>
                </div>
                <div className="p-6">
                  {contratos.length === 0 ? (
                    <p className="text-gray-600">Nenhum contrato vinculado</p>
                  ) : (
                    <div className="space-y-3">
                      {contratos.map(contrato => (
                        <button
                          key={contrato.id}
                          onClick={() => setContratoSelecionado(contrato.id)}
                          className={`w-full p-4 rounded-lg border-2 transition text-left ${
                            contratoSelecionado === contrato.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-400'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-900">{contrato.nome}</p>
                              <p className="text-sm text-gray-600">Nº {contrato.numero_contrato}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Período: {new Date(contrato.data_inicio).toLocaleDateString('pt-BR')} a{' '}
                                {new Date(contrato.data_fim).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              contrato.status === 'Ativo'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {contrato.status}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* EQUIPAMENTOS */}
              {contratoSelecionado && (
                <div className="bg-white rounded-lg shadow">
                  <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-gray-900">Equipamentos para Vistoria</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Série</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Modelo</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Tipo</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Localização</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {equipamentos.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-gray-600">
                              Nenhum equipamento neste contrato
                            </td>
                          </tr>
                        ) : (
                          equipamentos.map(equipamento => (
                            <tr key={equipamento.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{equipamento.numero_serie}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{equipamento.modelo}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{equipamento.tipo}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{equipamento.localizacao}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  equipamento.status === 'Pendente'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : equipamento.status === 'Concluído'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {equipamento.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <button
                                  onClick={() => handleIniciarChecklist(equipamento.id)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition"
                                >
                                  Iniciar Vistoria
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
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
