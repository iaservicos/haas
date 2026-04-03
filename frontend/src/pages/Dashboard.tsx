import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vistoriaService } from '../services/vistoria.service';
import { supabase } from '../services/supabase';
import { Vistoria } from '../types';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { gerarTemplateEquipamentosComDados } from '../utils/gerarTemplateEquipamentosComDados';

declare global {
  interface Window {
    XLSX: any;
  }
}

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

  // IMPORTAÇÃO DE EQUIPAMENTOS
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [importandoArquivo, setImportandoArquivo] = useState(false);
  const [mensagemImportacao, setMensagemImportacao] = useState('');
  const [tipoMensagemImportacao, setTipoMensagemImportacao] = useState<'sucesso' | 'erro' | 'aviso'>('sucesso');
  const [equipamentosImportacao, setEquipamentosImportacao] = useState<any[]>([]);

  // CARREGAR DADOS INICIAIS
  useEffect(() => {
    loadVistorias();
    loadEquipamentosPendentes();
  }, []);

  // ATUALIZAR QUANDO FILTROS MUDAM
  useEffect(() => {
    aplicarFiltros();
  }, [filtroTecnico, filtroCliente, filtroEquipamento, filtroEstado, filtroMouse, filtroTeclado, vistorias]);

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

    if (novoStatus === 'Aprovado' && (!contratoSelecionado || !modelo || !sku)) {
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

    const ws = XLSX.utils.json_to_sheet(vistoriasExportacao.map((v: any) => ({
      'Técnico': v.tecnico,
      'Cliente': v.cliente,
      'Equipamento': v.equipamento,
      'Estado': v.estado,
      'Mouse': v.mouse_status,
      'Teclado': v.teclado_status,
      'Data': formatarData(v.data),
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vistorias');
    XLSX.writeFile(wb, 'relatorio-vistorias.xlsx');
  };

  // FUNÇÕES DE IMPORTAÇÃO
  const processarArquivoExcel = async (file: File) => {
    try {
      // Carregar XLSX se não estiver carregado
      if (!window.XLSX) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.async = true;
        document.head.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];

          const rows = window.XLSX.utils.sheet_to_json(worksheet);
          
          const equipamentosValidos = rows.map((row: any) => ({
            numero_serie: String(row['Nº Série'] || row['No Serie'] || row['numero_serie'] || '').trim(),
            nota_fiscal: String(row['Nota Fiscal'] || row['nota_fiscal'] || '').trim(),
            destino: String(row['Destino'] || row['destino'] || '').trim(),
            modelo: String(row['Modelo'] || row['modelo'] || '').trim(),
            sku: String(row['SKU'] || row['sku'] || '').trim(),
            contrato: String(row['Contrato'] || row['contrato'] || '').trim(),
            cliente: String(row['Cliente'] || row['cliente'] || '').trim()
          })).filter(eq => eq.numero_serie && eq.nota_fiscal && eq.destino);

          if (equipamentosValidos.length === 0) {
            setMensagemImportacao('Nenhum equipamento válido encontrado. Verifique as colunas: Nº Série, Nota Fiscal, Destino');
            setTipoMensagemImportacao('erro');
            return;
          }

          setEquipamentosImportacao(equipamentosValidos);
          setMensagemImportacao(`${equipamentosValidos.length} equipamentos encontrados e prontos para importação`);
          setTipoMensagemImportacao('sucesso');
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          setMensagemImportacao('Erro ao processar arquivo Excel');
          setTipoMensagemImportacao('erro');
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
      setMensagemImportacao('Erro ao ler arquivo');
      setTipoMensagemImportacao('erro');
      setImportandoArquivo(false);
    }
  };

  const confirmarImportacao = async () => {
    if (equipamentosImportacao.length === 0) {
      alert('Nenhum equipamento para importar');
      return;
    }

    setImportandoArquivo(true);
    let sucessos = 0;
    let erros = 0;

    try {
      for (const equipamento of equipamentosImportacao) {
        // Validar se NF e Destino estão preenchidos
        if (!equipamento.nota_fiscal || !equipamento.destino) {
          erros++;
          console.warn(`Equipamento ${equipamento.numero_serie} sem NF ou Destino`);
          continue;
        }

        const { error } = await supabase
          .from('contrato_equipamentos')
          .update({
            nota_fiscal: equipamento.nota_fiscal,
            destino: equipamento.destino,
          })
          .eq('numero_serie', equipamento.numero_serie);

        if (error) {
          console.error(`Erro ao atualizar ${equipamento.numero_serie}:`, error);
          erros++;
        } else {
          sucessos++;
        }
      }

      if (sucessos > 0) {
        setMensagemImportacao(`${sucessos} equipamentos atualizados com sucesso!${erros > 0 ? ` (${erros} com erro)` : ''}`);
        setTipoMensagemImportacao(erros > 0 ? 'aviso' : 'sucesso');
      } else {
        setMensagemImportacao(`Nenhum equipamento foi atualizado. Verifique os dados.`);
        setTipoMensagemImportacao('erro');
      }

      setEquipamentosImportacao([]);
      setArquivoSelecionado(null);

      setTimeout(() => {
        setMensagemImportacao('');
      }, 5000);
    } catch (error) {
      console.error('Erro ao importar:', error);
      setMensagemImportacao('Erro ao importar equipamentos.');
      setTipoMensagemImportacao('erro');
    } finally {
      setImportandoArquivo(false);
    }
  };

  const statsPendentes = {
    pendentes: equipamentosPendentes.filter(e => e.status === 'Pendente').length,
    aprovados: equipamentosPendentes.filter(e => e.status === 'Aprovado').length,
    rejeitados: equipamentosPendentes.filter(e => e.status === 'Rejeitado').length,
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          {sidebarOpen && <span className="font-bold">Portal HaaS</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-800 rounded">
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {sidebarOpen && (
            <>
              <div className="text-sm text-gray-400">Usuário</div>
              <div className="text-white font-semibold break-words">{usuario?.email}</div>
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
              >
                Alterar Senha
              </button>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            {sidebarOpen ? 'Sair' : 'X'}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Portal de Vistoria HaaS</h1>
        </div>

        {/* TABS */}
        <div className="bg-white border-b border-gray-200 px-6 flex gap-4">
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
            onClick={() => setActiveTab('pendentes')}
            className={`px-4 py-3 font-semibold border-b-2 transition relative ${
              activeTab === 'pendentes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Equipamentos Pendentes
            {statsPendentes.pendentes > 0 && (
              <span className="absolute top-1 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {statsPendentes.pendentes}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('importacao')}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === 'importacao'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Importar Informações
          </button>
        </div>

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'vistorias' ? (
            <>
              {/* ESTATÍSTICAS */}
              <div className="p-6 grid grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-gray-600 text-sm font-semibold">Total</div>
                  <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-gray-600 text-sm font-semibold">Com Avaria</div>
                  <div className="text-3xl font-bold text-red-600">{stats.comAvaria}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-gray-600 text-sm font-semibold">OK</div>
                  <div className="text-3xl font-bold text-green-600">{stats.semAvaria}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-gray-600 text-sm font-semibold">Mouse Ausente</div>
                  <div className="text-3xl font-bold text-orange-600">{stats.mouseAusente}</div>
                </div>
              </div>

              {/* FILTROS */}
              <div className="p-6 bg-white mx-6 rounded-lg shadow mb-6">
                <h3 className="text-lg font-bold mb-4">Filtros</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Filtrar por Técnico"
                    value={filtroTecnico}
                    onChange={(e) => setFiltroTecnico(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={filtroCliente}
                    onChange={(e) => setFiltroCliente(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos os Clientes</option>
                    {clientes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filtroEquipamento}
                    onChange={(e) => setFiltroEquipamento(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos os Equipamentos</option>
                    {equipamentos.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos os Estados</option>
                    <option value="Equipamento OK">Equipamento OK</option>
                    <option value="Equip. com AVARIA">Equip. com AVARIA</option>
                  </select>
                  <select
                    value={filtroMouse}
                    onChange={(e) => setFiltroMouse(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos os Mouses</option>
                    <option value="Mouse, OK">Mouse, OK</option>
                    <option value="Mouse, AUSENTE">Mouse, AUSENTE</option>
                  </select>
                  <select
                    value={filtroTeclado}
                    onChange={(e) => setFiltroTeclado(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos os Teclados</option>
                    <option value="Teclado, OK">Teclado, OK</option>
                    <option value="Teclado, AUSENTE">Teclado, AUSENTE</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={limparFiltros}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Limpar Filtros
                  </button>
                  <button
                    onClick={exportarRelatorio}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Exportar Relatório
                  </button>
                </div>
              </div>

              {/* TABELA DE VISTORIAS */}
              {loading ? (
                <div className="p-6 text-center text-gray-500">Carregando...</div>
              ) : (
                <div className="p-6">
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Técnico</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Equipamento</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Estado</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Mouse</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Teclado</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vistorias.map((vistoria) => (
                          <tr key={vistoria.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-600">{vistoria.tecnico}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{vistoria.cliente}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{vistoria.equipamento}</td>
                            <td className={`px-6 py-4 text-sm ${getCorEstado(vistoria.estado)}`}>{vistoria.estado}</td>
                            <td className={`px-6 py-4 text-sm ${getCorComponente(vistoria.mouse_status)}`}>{vistoria.mouse_status}</td>
                            <td className={`px-6 py-4 text-sm ${getCorComponente(vistoria.teclado_status)}`}>{vistoria.teclado_status}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{formatarData(vistoria.data)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'pendentes' ? (
            <>
              {/* ESTATÍSTICAS PENDENTES */}
              <div className="p-6 grid grid-cols-3 gap-4">
                <div className="bg-yellow-50 rounded-lg shadow p-4 border-l-4 border-yellow-400">
                  <div className="text-yellow-800 text-sm font-semibold">Pendentes</div>
                  <div className="text-3xl font-bold text-yellow-600">{statsPendentes.pendentes}</div>
                </div>
                <div className="bg-green-50 rounded-lg shadow p-4 border-l-4 border-green-400">
                  <div className="text-green-800 text-sm font-semibold">Aprovados</div>
                  <div className="text-3xl font-bold text-green-600">{statsPendentes.aprovados}</div>
                </div>
                <div className="bg-red-50 rounded-lg shadow p-4 border-l-4 border-red-400">
                  <div className="text-red-800 text-sm font-semibold">Rejeitados</div>
                  <div className="text-3xl font-bold text-red-600">{statsPendentes.rejeitados}</div>
                </div>
              </div>

              {/* FILTRO STATUS */}
              <div className="p-6 bg-white mx-6 rounded-lg shadow mb-6">
                <div className="flex gap-2">
                  {['Todos', 'Pendente', 'Aprovado', 'Rejeitado'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFiltroStatusPendente(status)}
                      className={`px-4 py-2 rounded-lg transition ${
                        filtroStatusPendente === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* TABELA PENDENTES */}
              <div className="p-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Série</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Usuário</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipamentosPendentes.map((eq) => (
                        <tr key={eq.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-600">{eq.numero_serie}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{eq.usuario_email}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{eq.cliente_nome}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              eq.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' :
                              eq.status === 'Aprovado' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {eq.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{formatarData(eq.created_at)}</td>
                          <td className="px-6 py-4 text-sm">
                            {eq.status === 'Pendente' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => abrirModalAprovacao(eq)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => abrirModalRejeicao(eq)}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                                >
                                  Rejeitar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MODAL APROVAÇÃO */}
              {modoAprovacao === 'aprovar' && equipamentoSelecionado && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-bold mb-4">Aprovar Equipamento</h3>
                    
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Série</label>
                        <input type="text" value={equipamentoSelecionado.numero_serie} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Usuário</label>
                        <input type="text" value={equipamentoSelecionado.usuario_email} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente</label>
                        <input type="text" value={equipamentoSelecionado.cliente_nome} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Contrato *</label>
                        <select
                          value={contratoSelecionado}
                          onChange={(e) => setContratoSelecionado(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione um contrato</option>
                          {contratos.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.numero_contrato} - {c.nome_cliente}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Modelo *</label>
                        <input
                          type="text"
                          value={modelo}
                          onChange={(e) => setModelo(e.target.value)}
                          placeholder="Ex: Notebook Dell"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">SKU *</label>
                        <input
                          type="text"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          placeholder="Ex: SKU123456"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Notas</label>
                        <textarea
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          placeholder="Observações sobre a aprovação"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setEquipamentoSelecionado(null);
                          setNotas('');
                          setModelo('');
                          setSku('');
                          setContratoSelecionado('');
                        }}
                        disabled={atualizando}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => salvarDecisao('Aprovado')}
                        disabled={atualizando}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-bold"
                      >
                        {atualizando ? 'Processando...' : 'Aprovar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL REJEIÇÃO */}
              {modoAprovacao === 'rejeitar' && equipamentoSelecionado && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-bold mb-4">Rejeitar Equipamento</h3>
                    
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Série</label>
                        <input type="text" value={equipamentoSelecionado.numero_serie} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo da Rejeição *</label>
                        <textarea
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          placeholder="Explique o motivo da rejeição"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={4}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setEquipamentoSelecionado(null);
                          setNotas('');
                        }}
                        disabled={atualizando}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => salvarDecisao('Rejeitado')}
                        disabled={atualizando || !notas.trim()}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-bold"
                      >
                        {atualizando ? 'Processando...' : 'Rejeitar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'importacao' ? (
            <>
              {/* INSTRUÇÕES */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 m-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-blue-900">Importar Informações de Equipamentos</h3>
                  <button
                    onClick={gerarTemplateEquipamentosComDados}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
                  >
                    Baixar Template
                  </button>
                </div>
                <div className="space-y-2 text-blue-800 text-sm">
                  <p><strong>Instruções:</strong></p>
                  <p>1. Clique em "Baixar Template" para obter o arquivo Excel com todos os equipamentos cadastrados</p>
                  <p>2. Preencha apenas as colunas: Nota Fiscal e Destino</p>
                  <p>3. Salve o arquivo</p>
                  <p>4. Selecione o arquivo abaixo para importar</p>
                </div>
              </div>

              {/* UPLOAD DE ARQUIVO */}
              <div className="bg-white rounded-lg shadow p-8 m-6">
                <div className="border-3 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setArquivoSelecionado(e.target.files[0]);
                        processarArquivoExcel(e.target.files[0]);
                      }
                    }}
                    disabled={importandoArquivo}
                    className="hidden"
                    id="fileInput"
                  />
                  <label htmlFor="fileInput" className="cursor-pointer block">
                    <p className="text-gray-700 font-bold mb-2 text-lg">
                      {arquivoSelecionado ? `${arquivoSelecionado.name}` : 'Clique para selecionar arquivo'}
                    </p>
                    <p className="text-gray-500 text-sm">ou arraste o arquivo aqui</p>
                    <p className="text-gray-400 text-xs mt-3">Formatos suportados: Excel (.xlsx, .xls)</p>
                  </label>
                </div>

                {mensagemImportacao && (
                  <div
                    className={`mt-6 p-4 rounded-lg text-sm font-semibold ${
                      tipoMensagemImportacao === 'sucesso'
                        ? 'bg-green-100 text-green-800'
                        : tipoMensagemImportacao === 'aviso'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {mensagemImportacao}
                  </div>
                )}

                {equipamentosImportacao.length > 0 && (
                  <div className="mt-8">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-bold text-white bg-green-600 px-4 py-2 rounded">Equipamentos a Importar ({equipamentosImportacao.length})</h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Número de Série</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Modelo</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Contrato</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Nota Fiscal</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Destino</th>
                          </tr>
                        </thead>
                        <tbody>
                          {equipamentosImportacao.map((eq, idx) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.numero_serie}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.modelo}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.sku}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.contrato}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.cliente}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.nota_fiscal}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.destino}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-6 py-4 bg-white border-t border-gray-200 flex gap-3 mt-4">
                      <button
                        onClick={() => {
                          setEquipamentosImportacao([]);
                          setArquivoSelecionado(null);
                          setMensagemImportacao('');
                        }}
                        disabled={importandoArquivo}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={confirmarImportacao}
                        disabled={importandoArquivo}
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-bold"
                      >
                        {importandoArquivo ? 'Importando...' : 'Confirmar Importação'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* MODAL ALTERAR SENHA */}
      {showChangePasswordModal && (
        <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />
      )}
    </div>
  );
}
