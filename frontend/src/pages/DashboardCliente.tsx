import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

interface Contrato {
  id: number;
  nome: string;
  numero_contrato: string;
  status: string;
}

interface Equipamento {
  id: number;
  numero_serie: string;
  modelo: string;
  tipo: string;
  destino?: string;
  nota_fiscal?: string;
  status: string;
  contrato_id: number;
}

export function DashboardCliente() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [stats, setStats] = useState({
    totalContratos: 0,
    totalEquipamentos: 0,
    checklistsPendentes: 0,
  });

  // FILTRO E MODAL
  const [filtroSerial, setFiltroSerial] = useState('');
  const [showAdicionarEquipamento, setShowAdicionarEquipamento] = useState(false);
  const [novoSerial, setNovoSerial] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [mensagemEquipamento, setMensagemEquipamento] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro' | 'aviso'>('sucesso');

  // Filtrar equipamentos em tempo real
  const equipamentosFiltrados = useMemo(() => {
    if (!filtroSerial.trim()) {
      return equipamentos;
    }
    return equipamentos.filter(eq =>
      eq.numero_serie.toLowerCase().includes(filtroSerial.toLowerCase())
    );
  }, [filtroSerial, equipamentos]);

  // CARREGAR CONTRATOS E EQUIPAMENTOS
  useEffect(() => {
    loadData();
  }, [usuario]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!usuario?.id) {
        console.log('Usuário não identificado');
        setLoading(false);
        return;
      }

      console.log('Buscando dados para usuário:', usuario.id);

      // 1. Buscar contratos do cliente
      const { data: usuarioContratos, error: ucError } = await supabase
        .from('usuario_contratos')
        .select('contrato_id')
        .eq('usuario_id', usuario.id);

      if (ucError) {
        console.error('Erro ao buscar usuario_contratos:', ucError);
        throw ucError;
      }

      if (!usuarioContratos || usuarioContratos.length === 0) {
        console.log('Nenhum contrato vinculado ao usuário');
        setContratos([]);
        setEquipamentos([]);
        setLoading(false);
        return;
      }

      const contratoIds = usuarioContratos.map((uc: any) => uc.contrato_id);
      console.log('Contrato IDs:', contratoIds);

      // 2. Buscar dados dos contratos
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

      // 3. Buscar TODOS os equipamentos de TODOS os contratos
      console.log('Buscando equipamentos para contratos:', contratoIds);
      const { data: equipamentosData, error: equipError } = await supabase
        .from('contrato_equipamentos')
        .select('*')
        .in('contrato_id', contratoIds);

      if (equipError) {
        console.error('Erro ao buscar equipamentos:', equipError);
        throw equipError;
      }

      console.log('Equipamentos encontrados:', equipamentosData?.length, 'registros');
      setEquipamentos(equipamentosData || []);

      // Contar checklists pendentes
      const pendentes = equipamentosData?.filter((e: any) => e.status === 'Pendente').length || 0;

      setStats({
        totalContratos: contratosData?.length || 0,
        totalEquipamentos: equipamentosData?.length || 0,
        checklistsPendentes: pendentes,
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const verificarEquipamento = async () => {
    if (!novoSerial.trim()) {
      setMensagemEquipamento('Por favor, informe um número de série');
      setTipoMensagem('erro');
      return;
    }

    setVerificando(true);
    try {
      console.log('=== INICIANDO VERIFICAÇÃO ===');
      console.log('Usuário ID:', usuario?.id);
      console.log('Serial:', novoSerial);

      // 1. Verificar se o serial já existe nos equipamentos do cliente
      const jaExiste = equipamentos.some(
        eq => eq.numero_serie.toLowerCase() === novoSerial.toLowerCase()
      );

      if (jaExiste) {
        console.log('Serial já existe nos equipamentos do cliente');
        setMensagemEquipamento('Este equipamento já está listado para você!');
        setTipoMensagem('aviso');
        setVerificando(false);
        return;
      }

      // 2. Buscar se o serial existe em outro contrato
      console.log('Buscando serial em outro contrato...');
      const { data: equipamentoExistente, error: searchError } = await supabase
        .from('contrato_equipamentos')
        .select('*, contratos(numero_contrato)')
        .eq('numero_serie', novoSerial)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Erro ao buscar serial:', searchError);
      }

      if (equipamentoExistente) {
        console.log('Serial encontrado em outro contrato:', equipamentoExistente);
        const numeroContrato = (equipamentoExistente.contratos as any)?.numero_contrato || 'desconhecido';
        setMensagemEquipamento(
          `Este número de série (${novoSerial}) pertence ao contrato ${numeroContrato}. ` +
          `Não pode ser devolvido neste contrato. Entre em contato com sua gestão de cliente.`
        );
        setTipoMensagem('erro');
        setVerificando(false);
        return;
      }

      console.log('Serial não existe em nenhum contrato. Salvando como pendente...');

      // 3. Serial não existe - enviar para analista revisar
      const dataInsercao = {
        user_id: usuario?.id,
        numero_serie: novoSerial,
        status: 'Pendente',
        created_at: new Date().toISOString(),
      };

      console.log('Dados a inserir:', dataInsercao);

      const { data: insertData, error: insertError } = await supabase
        .from('pendingEquipment')
        .insert([dataInsercao])
        .select();

      console.log('Resposta da inserção:', { data: insertData, error: insertError });

      if (insertError) {
        console.error('Erro ao salvar equipamento pendente:', insertError);
        throw insertError;
      }

      console.log('Equipamento salvo com sucesso!');

      setMensagemEquipamento(
        `Equipamento ${novoSerial} será enviado para análise da equipe. Você receberá uma confirmação em breve.`
      );
      setTipoMensagem('sucesso');

      setTimeout(() => {
        setNovoSerial('');
        setShowAdicionarEquipamento(false);
        setMensagemEquipamento('');
      }, 2000);
    } catch (error) {
      console.error('Erro ao verificar equipamento:', error);
      setMensagemEquipamento('Erro ao verificar equipamento. Tente novamente. Verifique o console para mais detalhes.');
      setTipoMensagem('erro');
    } finally {
      setVerificando(false);
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
            <p className="text-xs text-gray-500">ID: {usuario?.id?.substring(0, 8)}...</p>
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
              {/* INSTRUÇÕES E VÍDEO */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* INSTRUÇÕES */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-blue-900 mb-4">Instruções Importantes</h2>
                  <div className="space-y-3 text-blue-800 text-sm">
                    <p><strong>1. Vistoria Visual:</strong> Observe danos físicos, peças quebradas, amassados, manchas e irregularidades.</p>
                    <p><strong>2. Registro:</strong> Pequenas marcas de uso são permitidas. Registre tudo na planilha.</p>
                    <p><strong>3. Fotos:</strong> Tire fotos de cada equipamento conforme solicitado.</p>
                    <p><strong>4. Higienização:</strong> Após vistoria, higienize e embale o equipamento.</p>
                    <p><strong>5. Embalagem:</strong> Use fita transparente e lacre bem a caixa.</p>
                    <p><strong>6. Identificação:</strong> Coloque folha com série, modelo, quantidade, dimensões e peso.</p>
                  </div>
                </div>

                {/* VÍDEO */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Vídeo de Instruções</h2>
                  <div className="bg-gray-100 rounded-lg flex items-center justify-center h-64">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-600 mb-2">Vídeo de instruções</p>
                      <p className="text-xs text-gray-500">(A ser inserido)</p>
                    </div>
                  </div>
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

              {/* FILTRO E AÇÕES */}
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Filtrar por Número de Série
                    </label>
                    <input
                      type="text"
                      placeholder="Digite o número de série..."
                      value={filtroSerial}
                      onChange={(e) => setFiltroSerial(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowAdicionarEquipamento(true)}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
                  >
                    + Adicionar Equipamento
                  </button>
                </div>
              </div>

              {/* MODAL ADICIONAR EQUIPAMENTO */}
              {showAdicionarEquipamento && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-xl font-bold mb-4">Adicionar Equipamento Não Listado</h3>

                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Número de Série
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 123456789"
                        value={novoSerial}
                        onChange={(e) => setNovoSerial(e.target.value)}
                        disabled={verificando}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>

                    {mensagemEquipamento && (
                      <div
                        className={`p-3 rounded-lg mb-4 text-sm ${
                          tipoMensagem === 'sucesso'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : tipoMensagem === 'erro'
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                        }`}
                      >
                        {mensagemEquipamento}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowAdicionarEquipamento(false);
                          setNovoSerial('');
                          setMensagemEquipamento('');
                        }}
                        disabled={verificando}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={verificarEquipamento}
                        disabled={verificando || !novoSerial.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {verificando ? 'Verificando...' : 'Verificar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* EQUIPAMENTOS */}
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
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Destino</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Nota Fiscal</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {equipamentosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-gray-600">
                            {filtroSerial ? 'Nenhum equipamento encontrado com este filtro' : 'Nenhum equipamento para vistoria'}
                          </td>
                        </tr>
                      ) : (
                        equipamentosFiltrados.map(equipamento => (
                          <tr key={equipamento.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{equipamento.numero_serie}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{equipamento.modelo}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{equipamento.tipo}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{equipamento.destino || '—'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{equipamento.nota_fiscal || '—'}</td>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
