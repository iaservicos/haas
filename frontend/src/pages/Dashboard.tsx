import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vistoriaService } from '../services/vistoria.service';
import { supabase } from '../services/supabase';
import { Vistoria } from '../types';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function Dashboard() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('vistorias');
  
  // FILTROS VISTORIAS
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroEquipamento, setFiltroEquipamento] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMouse, setFiltroMouse] = useState('');
  const [filtroTeclado, setFiltroTeclado] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  
  // LISTAS PARA OS DROPDOWNS
  const [clientes, setClientes] = useState<string[]>([]);
  const [equipamentos, setEquipamentos] = useState<string[]>([]);
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  
  // ESTATÍSTICAS VISTORIAS
  const [stats, setStats] = useState({
    total: 0,
    comAvaria: 0,
    semAvaria: 0,
    mouseOk: 0,
    mouseAusente: 0,
    tecladoOk: 0,
    tecladoAusente: 0,
  });

  // EQUIPAMENTOS PENDENTES
  const [equipamentosPendentes, setEquipamentosPendentes] = useState<any[]>([]);
  const [filtroStatusPendente, setFiltroStatusPendente] = useState('Pendente');
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<any>(null);
  const [notas, setNotas] = useState('');
  const [modelo, setModelo] = useState('');
  const [sku, setSku] = useState('');
  const [contratoSelecionado, setContratoSelecionado] = useState('');
  const [contratos, setContratos] = useState<any[]>([]);
  const [atualizando, setAtualizando] = useState(false);
  const [modoAprovacao, setModoAprovacao] = useState<'visualizar' | 'aprovar' | 'rejeitar'>('visualizar');
  const [tipoMaterial, setTipoMaterial] = useState('');

  // VISTORIAS DO PORTAL
  const [vistoriasPortal, setVistoriasPortal] = useState<any[]>([]);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [filtroEquipamentoPortal, setFiltroEquipamentoPortal] = useState('');
  const [filtroContratoPortal, setFiltroContratoPortal] = useState('');

  // CARREGAR DADOS INICIAIS
  useEffect(() => {
    loadVistorias();
    loadEquipamentosPendentes();
  }, []);

  // ATUALIZAR QUANDO FILTROS MUDAM
  useEffect(() => {
    aplicarFiltros();
  }, [filtroTecnico, filtroCliente, filtroEquipamento, filtroEstado, filtroMouse, filtroTeclado, vistorias]);

  // CARREGAR VISTORIAS DO PORTAL QUANDO ABA MUDA
  useEffect(() => {
    if (activeTab === 'vistoria') {
      loadVistoriasPortal();
    }
  }, [activeTab]);

  const loadVistorias = async () => {
    try {
      setLoading(true);
      const response = await vistoriaService.listar({ limit: 1000 });
      setVistorias(response.data);
      
      const clientesUnicos = [...new Set(response.data.map((v: any) => v.cliente))].filter(Boolean).sort();
      const equipamentosUnicos = [...new Set(response.data.map((v: any) => v.equipamento))].filter(Boolean).sort();
      const tecnicosUnicos = [...new Set(response.data.map((v: any) => v.tecnico))].filter(Boolean).sort();
      
      setClientes(clientesUnicos as string[]);
      setEquipamentos(equipamentosUnicos as string[]);
      setTecnicos(tecnicosUnicos as string[]);
    } catch (error) {
      console.error('Erro ao carregar vistorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipamentosPendentes = async () => {
    try {
      let query = supabase
        .from('pendingequipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (filtroStatusPendente !== 'Todos') {
        query = query.eq('status', filtroStatusPendente);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar equipamentos pendentes:', error);
        return;
      }

      setEquipamentosPendentes(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipamentos pendentes:', error);
    }
  };

  const loadVistoriasPortal = async () => {
    try {
      setLoadingPortal(true);
      console.log('[Dashboard] Carregando vistorias do portal...');
      
      const response = await fetch(`${API_BASE_URL}/inspecao/portal/listar`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar vistorias do portal: ${response.status}`);
      }

      const result = await response.json();
      console.log('[Dashboard] Vistorias do portal carregadas:', result.data);
      
      setVistoriasPortal(result.data || []);
    } catch (error) {
      console.error('[Dashboard] Erro ao carregar vistorias do portal:', error);
      setVistoriasPortal([]);
    } finally {
      setLoadingPortal(false);
    }
  };

  const buscarContratosDoUsuario = async (equipamento: any) => {
    try {
      // Buscar contratos do usuário
      const { data: usuarioContratos, error: ucError } = await supabase
        .from('usuario_contratos')
        .select('contrato_id')
        .eq('usuario_id', equipamento.user_id);

      if (ucError) {
        console.error('Erro ao buscar contratos:', ucError);
        return;
      }

      if (!usuarioContratos || usuarioContratos.length === 0) {
        console.log('Nenhum contrato encontrado');
        return;
      }

      const contratoIds = usuarioContratos.map((uc: any) => uc.contrato_id);

      // Buscar dados dos contratos
      const { data: contratosData, error: contratosError } = await supabase
        .from('contratos')
        .select('id, numero_contrato, nome_cliente')
        .in('id', contratoIds);

      if (contratosError) {
        console.error('Erro ao buscar contratos:', contratosError);
        return;
      }

      console.log('Contratos encontrados:', contratosData);
      setContratos(contratosData || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
    }
  };

  const abrirModalAprovacao = async (equipamento: any) => {
    setEquipamentoSelecionado(equipamento);
    setModoAprovacao('aprovar');
    setNotas('');
    setModelo('');
    setSku('');
    setTipoMaterial('');
    setContratoSelecionado('');
    await buscarContratosDoUsuario(equipamento);
  };

  const abrirModalRejeicao = (equipamento: any) => {
    setEquipamentoSelecionado(equipamento);
    setModoAprovacao('rejeitar');
    setNotas('');
  };

  const salvarDecisao = async (novoStatus: 'Aprovado' | 'Rejeitado') => {
    if (!equipamentoSelecionado) return;

    if (novoStatus === 'Aprovado' && (!contratoSelecionado || !modelo || !sku || !tipoMaterial)) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setAtualizando(true);
    try {
      const updateData: any = {
        status: novoStatus,
        analyst_notes: notas,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('pendingequipment')
        .update(updateData)
        .eq('id', equipamentoSelecionado.id);

      if (error) {
        console.error('Erro ao atualizar equipamento:', error);
        throw error;
      }

      // Se aprovado, criar equipamento na tabela contrato_equipamentos
      if (novoStatus === 'Aprovado') {
        const { error: insertError } = await supabase
          .from('contrato_equipamentos')
          .insert({
            numero_serie: equipamentoSelecionado.numero_serie,
            modelo: modelo,
            sku: sku,
            tipo_material: tipoMaterial,
            contrato_id: parseInt(contratoSelecionado),
          });

        if (insertError) {
          console.error('Erro ao criar equipamento:', insertError);
          throw insertError;
        }
      }

      // Recarregar lista
      await loadEquipamentosPendentes();
      setEquipamentoSelecionado(null);
      setNotas('');
      setModelo('');
      setSku('');
      setTipoMaterial('');
      setContratoSelecionado('');
    } catch (error) {
      console.error('Erro ao salvar decisão:', error);
      alert('Erro ao processar equipamento. Tente novamente.');
    } finally {
      setAtualizando(false);
    }
  };

  const aplicarFiltros = () => {
    let filtered = [...vistorias];

    if (filtroTecnico) {
      filtered = filtered.filter((v: any) =>
        v.tecnico?.toLowerCase().includes(filtroTecnico.toLowerCase())
      );
    }

    if (filtroCliente) {
      filtered = filtered.filter((v: any) =>
        v.cliente?.toLowerCase().includes(filtroCliente.toLowerCase())
      );
    }

    if (filtroEquipamento) {
      filtered = filtered.filter((v: any) =>
        v.equipamento?.toLowerCase().includes(filtroEquipamento.toLowerCase())
      );
    }

    if (filtroEstado) {
      filtered = filtered.filter((v: any) => v.estado === filtroEstado);
    }

    if (filtroMouse) {
      filtered = filtered.filter((v: any) => v.mouse_status === filtroMouse);
    }

    if (filtroTeclado) {
      filtered = filtered.filter((v: any) => v.teclado_status === filtroTeclado);
    }

    const newStats = {
      total: filtered.length,
      comAvaria: filtered.filter((v: any) => v.estado === 'Equip. com AVARIA').length,
      semAvaria: filtered.filter((v: any) => v.estado === 'Equipamento OK').length,
      mouseOk: filtered.filter((v: any) => v.mouse_status === 'Mouse, OK').length,
      mouseAusente: filtered.filter((v: any) => v.mouse_status === 'Mouse, AUSENTE').length,
      tecladoOk: filtered.filter((v: any) => v.teclado_status === 'Teclado, OK').length,
      tecladoAusente: filtered.filter((v: any) => v.teclado_status === 'Teclado, AUSENTE').length,
    };
    
    setStats(newStats);
  };

  const formatarData = (data: string) => {
    const dataParte = data.split('T')[0];
    const [ano, mes, dia] = dataParte.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const getCorEstado = (estado: string) => {
    const isAvaria = estado === 'Equip. com AVARIA';
    return isAvaria ? 'text-black font-bold' : 'text-black';
  };

  const getCorComponente = (status: string) => {
    const isOk = status?.includes('OK');
    return isOk ? 'text-black' : 'text-black font-bold';
  };

  const limparFiltros = () => {
    setFiltroTecnico('');
    setFiltroCliente('');
    setFiltroEquipamento('');
    setFiltroEstado('');
    setFiltroMouse('');
    setFiltroTeclado('');
  };

  const limparFiltrosPortal = () => {
    setFiltroEquipamentoPortal('');
    setFiltroContratoPortal('');
  };

  const exportarRelatorio = () => {
    const vistoriasExportacao = vistorias.filter((v: any) => {
      if (filtroTecnico && !v.tecnico?.toLowerCase().includes(filtroTecnico.toLowerCase())) return false;
      if (filtroCliente && !v.cliente?.toLowerCase().includes(filtroCliente.toLowerCase())) return false;
      if (filtroEquipamento && !v.equipamento?.toLowerCase().includes(filtroEquipamento.toLowerCase())) return false;
      if (filtroEstado && v.estado !== filtroEstado) return false;
      if (filtroMouse && v.mouse_status !== filtroMouse) return false;
      if (filtroTeclado && v.teclado_status !== filtroTeclado) return false;
      return true;
    });

    if (vistoriasExportacao.length === 0) {
      alert('Nenhuma vistoria para exportar com os filtros aplicados');
      return;
    }

    const headers = ['Data', 'Série', 'Equipamento', 'Cliente', 'Técnico', 'Estado', 'Laudo', 'Avaria', 'Teclado', 'Mouse'];
    
    const rows = vistoriasExportacao.map((v: any) => [
      formatarData(v.data_vistoria),
      v.numero_serie,
      v.equipamento,
      v.cliente,
      v.tecnico,
      v.estado === 'Equip. com AVARIA' ? 'Avaria' : 'OK',
      v.laudo || '—',
      v.avaria || '—',
      v.teclado_status || '—',
      v.mouse_status || '—',
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach((row: any[]) => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_vistorias_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGoToPhotos = () => {
    navigate('/fotos');
  };

  const handleGoToContratos = () => {
    navigate('/contratos');
  };

  const handleGoToClientes = () => {
    navigate('/clientes');
  };

  const handleGoToEquipamentos = () => {
    navigate('/equipamentos');
  };

  const handleGoToConfirmacoes = () => {
    navigate('/confirmacoes');
  };

  const statsPendentes = {
    pendentes: equipamentosPendentes.filter(e => e.status === 'Pendente').length,
    aprovados: equipamentosPendentes.filter(e => e.status === 'Aprovado').length,
    rejeitados: equipamentosPendentes.filter(e => e.status === 'Rejeitado').length,
  };

  const vistoriasPortalFiltradas = vistoriasPortal.filter((v: any) => {
    if (filtroEquipamentoPortal && !v.contrato_equipamentos?.numero_serie?.includes(filtroEquipamentoPortal)) return false;
    if (filtroContratoPortal && !v.contrato_equipamentos?.contratos?.numero_contrato?.includes(filtroContratoPortal)) return false;
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
          
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
            {sidebarOpen && <span>Dashboard</span>}
          </a>

          <button
            onClick={handleGoToClientes}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>Clientes</span>}
          </button>

          <button
            onClick={handleGoToContratos}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>Contratos</span>}
          </button>

          <button
            onClick={handleGoToEquipamentos}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>Equipamentos</span>}
          </button>

          <button
            onClick={handleGoToConfirmacoes}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>Confirmações</span>}
          </button>
          
          <button
            onClick={handleGoToPhotos}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>Fotos</span>}
          </button>

          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>Alterar Senha</span>}
          </button>

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
              <h1 className="text-2xl font-bold text-gray-900">Portal de Vistoria HaaS</h1>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Bem-vindo, <span className="font-semibold text-gray-900">{usuario?.nome || 'Carregando...'}</span></p>
            </div>
          </div>
        </div>

        {/* ABAS */}
        <div className="bg-white border-b border-gray-200 px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('vistorias')}
              className={`px-4 py-3 font-semibold border-b-2 transition ${
                activeTab === 'vistorias'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Vistorias
            </button>
            <button
              onClick={() => {
                setActiveTab('vistoria');
                loadVistoriasPortal();
              }}
              className={`px-4 py-3 font-semibold border-b-2 transition ${
                activeTab === 'vistoria'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Vistorias do Portal
            </button>
            <button
              onClick={() => {
                setActiveTab('pendentes');
                loadEquipamentosPendentes();
              }}
              className={`px-4 py-3 font-semibold border-b-2 transition relative ${
                activeTab === 'pendentes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Equipamentos Pendentes
              {statsPendentes.pendentes > 0 && (
                <span className="absolute top-2 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {statsPendentes.pendentes}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* ABA: VISTORIAS */}
            {activeTab === 'vistorias' ? (
              <>
                {/* CARDS DE ESTATÍSTICAS - VISTORIAS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-blue-100 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total de Vistorias</p>
                    <p className="text-5xl font-bold text-blue-900 mt-3">{stats.total}</p>
                  </div>

                  <div className="bg-gray-200 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Com Avaria</p>
                    <p className="text-5xl font-bold text-gray-800 mt-3">{stats.comAvaria}</p>
                  </div>

                  <div className="bg-gray-150 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Equipamento OK</p>
                    <p className="text-5xl font-bold text-gray-700 mt-3">{stats.semAvaria}</p>
                  </div>
                </div>

                {/* FILTROS */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Filtros Avançados</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={exportarRelatorio}
                        className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-700 transition"
                      >
                        Exportar Relatório
                      </button>
                      <button
                        onClick={limparFiltros}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Técnico</label>
                      <select
                        value={filtroTecnico}
                        onChange={(e) => setFiltroTecnico(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os Técnicos</option>
                        {tecnicos.map((tecnico) => (
                          <option key={tecnico} value={tecnico}>
                            {tecnico}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
                      <select
                        value={filtroCliente}
                        onChange={(e) => setFiltroCliente(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os Clientes</option>
                        {clientes.map((cliente) => (
                          <option key={cliente} value={cliente}>
                            {cliente}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Equipamento</label>
                      <select
                        value={filtroEquipamento}
                        onChange={(e) => setFiltroEquipamento(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os Equipamentos</option>
                        {equipamentos.map((equipamento) => (
                          <option key={equipamento} value={equipamento}>
                            {equipamento}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                      <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os Estados</option>
                        <option value="Equipamento OK">Equipamento OK</option>
                        <option value="Equip. com AVARIA">Com Avaria</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Mouse</label>
                      <select
                        value={filtroMouse}
                        onChange={(e) => setFiltroMouse(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os Mouses</option>
                        <option value="Mouse, OK">Mouse OK</option>
                        <option value="Mouse, AUSENTE">Mouse Ausente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Teclado</label>
                      <select
                        value={filtroTeclado}
                        onChange={(e) => setFiltroTeclado(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os Teclados</option>
                        <option value="Teclado, OK">Teclado OK</option>
                        <option value="Teclado, AUSENTE">Teclado Ausente</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* TABELA DE VISTORIAS */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Vistorias Recentes ({stats.total})</h3>
                  </div>

                  {loading ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-gray-600 font-semibold">Carregando dados...</p>
                    </div>
                  ) : stats.total === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-gray-600 font-semibold">Nenhuma vistoria encontrada com esses filtros</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Série</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Equipamento</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Técnico</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Laudo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Avaria</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Teclado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Mouse</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {vistorias
                            .filter((v: any) => {
                              if (filtroTecnico && !v.tecnico?.toLowerCase().includes(filtroTecnico.toLowerCase())) return false;
                              if (filtroCliente && !v.cliente?.toLowerCase().includes(filtroCliente.toLowerCase())) return false;
                              if (filtroEquipamento && !v.equipamento?.toLowerCase().includes(filtroEquipamento.toLowerCase())) return false;
                              if (filtroEstado && v.estado !== filtroEstado) return false;
                              if (filtroMouse && v.mouse_status !== filtroMouse) return false;
                              if (filtroTeclado && v.teclado_status !== filtroTeclado) return false;
                              return true;
                            })
                            .map((vistoria: any) => (
                              <tr key={vistoria.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 text-sm text-gray-900">{formatarData(vistoria.data_vistoria)}</td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-black">{vistoria.numero_serie}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.equipamento}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.cliente}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.tecnico}</td>
                                <td className={`px-6 py-4 text-sm ${getCorEstado(vistoria.estado)}`}>{vistoria.estado}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.laudo || '—'}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.avaria || '—'}</td>
                                <td className={`px-6 py-4 text-sm ${getCorComponente(vistoria.teclado_status)}`}>{vistoria.teclado_status || '—'}</td>
                                <td className={`px-6 py-4 text-sm ${getCorComponente(vistoria.mouse_status)}`}>{vistoria.mouse_status || '—'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : activeTab === 'vistoria' ? (
              <>
                {/* ABA: VISTORIAS DO PORTAL */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Filtros</h3>
                    <button
                      onClick={limparFiltrosPortal}
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Série</label>
                      <input
                        type="text"
                        value={filtroEquipamentoPortal}
                        onChange={(e) => setFiltroEquipamentoPortal(e.target.value)}
                        placeholder="Filtrar por série..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Contrato</label>
                      <input
                        type="text"
                        value={filtroContratoPortal}
                        onChange={(e) => setFiltroContratoPortal(e.target.value)}
                        placeholder="Filtrar por contrato..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* TABELA DE VISTORIAS DO PORTAL */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Vistorias do Portal ({vistoriasPortalFiltradas.length})</h3>
                  </div>

                  {loadingPortal ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-gray-600 font-semibold">Carregando vistorias do portal...</p>
                    </div>
                  ) : vistoriasPortalFiltradas.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-gray-600 font-semibold">Nenhuma vistoria do portal encontrada</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Série</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Modelo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contrato</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Respostas</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Observações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {vistoriasPortalFiltradas.map((vistoria: any) => (
                            <tr key={vistoria.id} className="hover:bg-gray-50 transition">
                              <td className="px-6 py-4 text-sm text-gray-900">{formatarData(vistoria.data_inspecao)}</td>
                              <td className="px-6 py-4 text-sm font-mono font-bold text-black">{vistoria.contrato_equipamentos?.numero_serie || '—'}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{vistoria.contrato_equipamentos?.modelo || '—'}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{vistoria.equipment_type}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{vistoria.contrato_equipamentos?.contratos?.numero_contrato || '—'}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <button
                                  onClick={() => alert(JSON.stringify(vistoria.respostas, null, 2))}
                                  className="text-blue-600 hover:text-blue-800 font-semibold"
                                >
                                  Ver Respostas
                                </button>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">{vistoria.observacoes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* ABA: EQUIPAMENTOS PENDENTES - CÓDIGO ORIGINAL AQUI */}
                <div className="text-center py-12">
                  <p className="text-gray-600 font-semibold">Aba de Equipamentos Pendentes</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE APROVAÇÃO/REJEIÇÃO */}
      {equipamentoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {modoAprovacao === 'aprovar' ? 'Aprovar Equipamento' : 'Rejeitar Equipamento'}
            </h2>

            {modoAprovacao === 'aprovar' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contrato</label>
                  <select
                    value={contratoSelecionado}
                    onChange={(e) => setContratoSelecionado(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um contrato</option>
                    {contratos.map((contrato) => (
                      <option key={contrato.id} value={contrato.id}>
                        {contrato.numero_contrato}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Modelo</label>
                  <input
                    type="text"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ex: Dell Optiplex 7090"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Ex: SKU-12345"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Material</label>
                  <select
                    value={tipoMaterial}
                    onChange={(e) => setTipoMaterial(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um tipo</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Notebook">Notebook</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Impressora">Impressora</option>
                  </select>
                </div>
              </>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notas</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Adicione observações..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-24"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setEquipamentoSelecionado(null)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => salvarDecisao(modoAprovacao === 'aprovar' ? 'Aprovado' : 'Rejeitado')}
                disabled={atualizando}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold text-white transition ${
                  modoAprovacao === 'aprovar'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } ${atualizando ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {atualizando ? 'Processando...' : modoAprovacao === 'aprovar' ? 'Aprovar' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ALTERAR SENHA */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        usuarioId={usuario?.id || ''}
        usuarioEmail={usuario?.email || ''}
      />
    </div>
  );
}
