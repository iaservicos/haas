import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vistoriaService } from '../services/vistoria.service';
import { supabase } from '../services/supabase';
import { Vistoria } from '../types';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

import * as XLSX from 'xlsx';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function Dashboard() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('vistoria');
  
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

  // VISTORIAS DO PORTAL
  const [vistoriasPortal, setVistoriasPortal] = useState<any[]>([]);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [filtroClientePortal, setFiltroClientePortal] = useState('');
  const [filtroEquipamentoPortal, setFiltroEquipamentoPortal] = useState('');
  const [filtroContratoPortal, setFiltroContratoPortal] = useState('');
  const [filtroTipoPortal, setFiltroTipoPortal] = useState('');
  const [filtroStatusPortal, setFiltroStatusPortal] = useState('');
  
  // LISTAS PARA DROPDOWNS PORTAL
  const [clientesPortal, setClientesPortal] = useState<string[]>([]);
  
  // ESTATÍSTICAS PORTAL
  const [statsPortal, setStatsPortal] = useState({
    total: 0,
    comAvaria: 0,
    equipamentoOk: 0,
  });

  // MODAL DE RESPOSTAS
  const [showRespostasModal, setShowRespostasModal] = useState(false);
  const [respostasModal, setRespostasModal] = useState<any>(null);

  // MODAL DE FOTO
  const [showFotoModal, setShowFotoModal] = useState(false);
  const [fotoModalUrl, setFotoModalUrl] = useState<string>('');
  const [fotoModalNome, setFotoModalNome] = useState<string>('');

  const abrirModalFoto = async (vistoriaId: string) => {
    try {
      const { data: fotos, error } = await supabase
        .from('fotos_vistoria')
        .select('foto_url, foto_nome')
        .eq('vistoria_id', vistoriaId)
        .limit(1);

      if (error || !fotos || fotos.length === 0) {
        alert('Nenhuma foto encontrada para esta vistoria');
        return;
      }

      const foto = fotos[0];
      if (!foto.foto_url) {
        alert('URL da foto nao disponivel');
        return;
      }

      setFotoModalUrl(foto.foto_url);
      setFotoModalNome(foto.foto_nome || 'Foto');
      setShowFotoModal(true);
    } catch (error) {
      console.error('Erro ao abrir foto:', error);
      alert('Erro ao abrir foto');
    }
  }

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

  // CARREGAR DADOS INICIAIS
  useEffect(() => {
    loadVistoriasPortal();
    loadVistorias();
    loadEquipamentosPendentes();
  }, []);

  // ATUALIZAR QUANDO FILTROS MUDAM
  useEffect(() => {
    aplicarFiltros();
  }, [filtroTecnico, filtroCliente, filtroEquipamento, filtroEstado, filtroMouse, filtroTeclado, vistorias]);

  // CALCULAR ESTATÍSTICAS DO PORTAL
  useEffect(() => {
    calcularEstatisticasPortal();
  }, [vistoriasPortal, filtroClientePortal, filtroEquipamentoPortal, filtroContratoPortal, filtroTipoPortal, filtroStatusPortal]);

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
      
      const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/inspecao/portal/listar`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
     },
  });


      if (!response.ok) {
        throw new Error(`Erro ao carregar vistorias do portal: ${response.status}`);
      }

      const result = await response.json();
      console.log('[Dashboard] Vistorias do portal carregadas:', result.data);
      
      setVistoriasPortal(result.data || []);

      // Extrair clientes únicos
      const clientesUnicos = [...new Set(
        (result.data || []).map((v: any) => v.contrato_equipamentos?.contratos?.nome_cliente)
      )].filter(Boolean).sort();
      setClientesPortal(clientesUnicos as string[]);
    } catch (error) {
      console.error('[Dashboard] Erro ao carregar vistorias do portal:', error);
      setVistoriasPortal([]);
    } finally {
      setLoadingPortal(false);
    }
  };

  const calcularEstatisticasPortal = () => {
    let filtered = [...vistoriasPortal];

    if (filtroClientePortal) {
      filtered = filtered.filter((v: any) =>
        v.contrato_equipamentos?.contratos?.nome_cliente?.toLowerCase().includes(filtroClientePortal.toLowerCase())
      );
    }

    if (filtroEquipamentoPortal) {
      filtered = filtered.filter((v: any) =>
        v.contrato_equipamentos?.numero_serie?.toLowerCase().includes(filtroEquipamentoPortal.toLowerCase())
      );
    }

    if (filtroContratoPortal) {
      filtered = filtered.filter((v: any) =>
        v.contrato_equipamentos?.contratos?.numero_contrato?.toLowerCase().includes(filtroContratoPortal.toLowerCase())
      );
    }

    if (filtroTipoPortal) {
      filtered = filtered.filter((v: any) =>
        v.equipment_type?.toLowerCase().includes(filtroTipoPortal.toLowerCase())
      );
    }

    if (filtroStatusPortal) {
      filtered = filtered.filter((v: any) => {
        const respostas = v.respostas || {};
        const temAvaria = Object.values(respostas).some((r: any) => r === false || r === 'Não');
        return filtroStatusPortal === 'com_avaria' ? temAvaria : !temAvaria;
      });
    }

    // Contar com prioridade para análise da IA
    const temAvaria = filtered.filter((v: any) => {
      // Verificar análise da IA primeiro
      if (v.analise_ia && typeof v.analise_ia === 'object' && v.analise_ia.status === 'AVARIA') {
        return true;
      }
      // Se não tem IA ou IA não detectou avaria, verificar respostas
      const respostas = v.respostas || {};
      return Object.values(respostas).some((r: any) => r === false || r === 'Não');
    }).length;

    const newStats = {
      total: filtered.length,
      comAvaria: temAvaria,
      equipamentoOk: filtered.length - temAvaria,
    };
    
    setStatsPortal(newStats);
  };

  const abrirModalRespostas = (vistoria: any) => {
    setRespostasModal(vistoria);
    setShowRespostasModal(true);
  };

  
  // Funcao para determinar status final (prioriza IA)
  const getStatusFinal = (vistoria: any) => {
    const analise = vistoria.analise_ia;
    if (analise && typeof analise === 'object' && analise.status === 'AVARIA') {
      return 'Com Avaria';
    }
    const respostas = vistoria.respostas || {};
    const temAvaria = Object.values(respostas).some((r: any) => r === false || r === 'Nao');
    return temAvaria ? 'Com Avaria' : 'OK';
  };

  const buscarContratosDoUsuario = async (equipamento: any) => {
    try {
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
    setFiltroClientePortal('');
    setFiltroEquipamentoPortal('');
    setFiltroContratoPortal('');
    setFiltroTipoPortal('');
    setFiltroStatusPortal('');
  };

  const exportarRelatorioPortal = () => {
    let vistoriasExportacao = vistoriasPortal.filter((v: any) => {
      if (filtroClientePortal && !v.contrato_equipamentos?.contratos?.nome_cliente?.toLowerCase().includes(filtroClientePortal.toLowerCase())) return false;
      if (filtroEquipamentoPortal && !v.contrato_equipamentos?.numero_serie?.toLowerCase().includes(filtroEquipamentoPortal.toLowerCase())) return false;
      if (filtroContratoPortal && !v.contrato_equipamentos?.contratos?.numero_contrato?.toLowerCase().includes(filtroContratoPortal.toLowerCase())) return false;
      if (filtroTipoPortal && !v.equipment_type?.toLowerCase().includes(filtroTipoPortal.toLowerCase())) return false;
      if (filtroStatusPortal) {
        const respostas = v.respostas || {};
        const temAvaria = Object.values(respostas).some((r: any) => r === false || r === 'Não');
        return filtroStatusPortal === 'com_avaria' ? temAvaria : !temAvaria;
      }
      return true;
    });

    if (vistoriasExportacao.length === 0) {
      alert('Nenhuma vistoria para exportar com os filtros aplicados');
      return;
    }

    const itensUnicos = Array.from(new Set(
      vistoriasExportacao.flatMap((v: any) => Object.keys(v.respostas || {}))
    )).sort();

    const headers = ['Data', 'Cliente', 'Série', 'Modelo', 'Tipo', 'Contrato', 'Status', 'Análise IA', ...itensUnicos, 'Observações'];
    
    const rows = vistoriasExportacao.map((v: any) => {
      const respostas = v.respostas || {};
      const temAvaria = Object.values(respostas).some((r: any) => r === false || r === 'Não');
      const statusGeral = temAvaria ? 'NOK' : 'OK';
      
      const respostasIndividuais = itensUnicos.map((item) => {
        const resposta = respostas[item];
        if (resposta === true || resposta === 'Sim' || resposta === 'OK') return 'OK';
        if (resposta === false || resposta === 'Não' || resposta === 'Faltando') return 'NOK';
        return 'Sem resposta';
      });
      
      // Formatar análise da IA
      let analiseIADisplay = '—';
      if (v.analise_ia) {
        const analise = v.analise_ia;
        if (typeof analise === 'object') {
          const status = analise.status || 'pendente';
          const categoria = analise.categoria || '';
          const tipo_dano = analise.tipo_dano || '';
          
          if (status === 'OK') {
            analiseIADisplay = 'OK - Sem problemas';
          } else if (status === 'AVARIA') {
            analiseIADisplay = `AVARIA - ${categoria}${tipo_dano ? ' - ' + tipo_dano : ''}`;
          } else if (status === 'pendente') {
            analiseIADisplay = 'PENDENTE';
          } else if (status === 'ERRO') {
            analiseIADisplay = 'ERRO';
          }
        } else if (typeof analise === 'string') {
          analiseIADisplay = analise;
        }
      }
      
      return [
        formatarData(v.data_inspecao),
        v.contrato_equipamentos?.contratos?.nome_cliente || '—',
        v.contrato_equipamentos?.numero_serie || '—',
        v.contrato_equipamentos?.modelo || '—',
        v.equipment_type || '—',
        v.contrato_equipamentos?.contratos?.numero_contrato || '—',
        statusGeral,
        analiseIADisplay,
        ...respostasIndividuais,
        v.observacoes || '—',
      ];
    });

    const jsonData = rows.map((row: any[]) => {
      const obj: any = {
        'Data': row[0],
        'Cliente': row[1],
        'Serie': row[2],
        'Modelo': row[3],
        'Tipo': row[4],
        'Contrato': row[5],
        'Status': row[6],
      };
      
      obj['Análise IA'] = row[7];
      
      itensUnicos.forEach((item, idx) => {
        obj[item] = row[8 + idx];
      });
      
      obj['Observacoes'] = row[8 + itensUnicos.length];
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(jsonData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vistorias');
    
    const colWidths = [15, 20, 15, 25, 15, 20, 12, 35, ...itensUnicos.map(() => 15), 30];
    ws['!cols'] = colWidths.map(w => ({ wch: w }));
    
    XLSX.writeFile(wb, `relatorio_vistorias_portal_${new Date().toISOString().split('T')[0]}.xlsx`);
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

    const ws = XLSX.utils.json_to_sheet(rows.map((row: any[]) => ({
      'Data': row[0],
      'Serie': row[1],
      'Equipamento': row[2],
      'Cliente': row[3],
      'Tecnico': row[4],
      'Estado': row[5],
      'Laudo': row[6],
      'Avaria': row[7],
      'Teclado': row[8],
      'Mouse': row[9],
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vistorias');
    ws['!cols'] = [15, 15, 20, 20, 15, 12, 20, 15, 12, 12].map(w => ({ wch: w }));
    XLSX.writeFile(wb, `relatorio_vistorias_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    if (filtroClientePortal && !v.contrato_equipamentos?.contratos?.nome_cliente?.toLowerCase().includes(filtroClientePortal.toLowerCase())) return false;
    if (filtroEquipamentoPortal && !v.contrato_equipamentos?.numero_serie?.toLowerCase().includes(filtroEquipamentoPortal.toLowerCase())) return false;
    if (filtroContratoPortal && !v.contrato_equipamentos?.contratos?.numero_contrato?.toLowerCase().includes(filtroContratoPortal.toLowerCase())) return false;
    if (filtroTipoPortal && !v.equipment_type?.toLowerCase().includes(filtroTipoPortal.toLowerCase())) return false;
    if (filtroStatusPortal) {
      const respostas = v.respostas || {};
      const temAvaria = Object.values(respostas).some((r: any) => r === false || r === 'Não');
      return filtroStatusPortal === 'com_avaria' ? temAvaria : !temAvaria;
    }
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
              <h1 className="text-2xl font-bold text-gray-900">Sistema de Vistoria HaaS</h1>
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
            {activeTab === 'vistoria' ? (
              <>
                {/* CARDS DE ESTATÍSTICAS - PORTAL */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-blue-100 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total de Vistorias</p>
                    <p className="text-5xl font-bold text-blue-900 mt-3">{statsPortal.total}</p>
                  </div>

                  <div className="bg-gray-200 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Com Avaria</p>
                    <p className="text-5xl font-bold text-gray-800 mt-3">{statsPortal.comAvaria}</p>
                  </div>

                  <div className="bg-gray-150 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Equipamento OK</p>
                    <p className="text-5xl font-bold text-gray-700 mt-3">{statsPortal.equipamentoOk}</p>
                  </div>
                </div>

                {/* FILTROS AVANÇADOS */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Filtros Avançados</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={exportarRelatorioPortal}
                        className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-700 transition"
                      >
                        Exportar Relatório
                      </button>
                      <button
                        onClick={limparFiltrosPortal}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
                      <select
                        value={filtroClientePortal}
                        onChange={(e) => setFiltroClientePortal(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os Clientes</option>
                        {clientesPortal.map((cliente) => (
                          <option key={cliente} value={cliente}>
                            {cliente}
                          </option>
                        ))}
                      </select>
                    </div>

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

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Equipamento</label>
                      <select
                        value={filtroTipoPortal}
                        onChange={(e) => setFiltroTipoPortal(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os Tipos</option>
                        <option value="Desktop">Desktop</option>
                        <option value="Monitor">Monitor</option>
                        <option value="Notebook">Notebook</option>
                        <option value="MiniPro">MiniPro</option>
                        <option value="All in One">All in One</option>
                        <option value="Duo">Duo</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Chromebook">Chromebook</option>
                        <option value="Máquina de pagamento">Máquina de pagamento</option>
                        <option value="Diversos">Diversos</option>
                        <option value="Celular">Celular</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        value={filtroStatusPortal}
                        onChange={(e) => setFiltroStatusPortal(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os Status</option>
                        <option value="ok">Equipamento OK</option>
                        <option value="com_avaria">Com Avaria</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* TABELA MATRIZ - ITENS x SÉRIES */}
                {filtroClientePortal && filtroTipoPortal && vistoriasPortalFiltradas.length > 0 && (() => {
                  const itensUnicos = Array.from(new Set(
                    vistoriasPortalFiltradas.flatMap((v: any) => 
                      Object.keys(v.respostas || {})
                    )
                  )).sort();

                  if (itensUnicos.length === 0) return null;

                  const obterStatusResposta = (resposta: any) => {
                    if (resposta === true || resposta === 'Sim' || resposta === 'OK') return 'OK';
                    if (resposta === false || resposta === 'Não' || resposta === 'Faltando') return 'Faltando';
                    return 'Sem resposta';
                  };

                  const obterCorStatusResposta = (status: string) => {
                    return 'bg-gray-50 text-gray-800';
                  };

                  return (
                    <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900">Análise por Série - Itens vs Respostas</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100 border-b-2 border-gray-300">
                              <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-300 sticky left-0 bg-gray-100 min-w-[180px]">
                                Série / Item
                              </th>
                              <th className="px-4 py-3 text-center font-semibold text-gray-900 border-r border-gray-300 min-w-[80px] text-xs">
                                STATUS
                              </th>
                              {itensUnicos.map((item) => (
                                <th
                                  key={item}
                                  className="px-3 py-3 text-center font-semibold text-gray-900 border-r border-gray-300 min-w-[100px] text-xs"
                                >
                                  {item.replace(/_/g, ' ')}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {vistoriasPortalFiltradas.map((vistoria: any, idx: number) => {
                              const temAvaria = Object.values(vistoria.respostas || {}).some((r: any) => r === false || r === 'Não' || r === 'Faltando');
                              const statusGeral = temAvaria ? 'NOK' : 'OK';
                              return (
                              <tr key={vistoria.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-300 sticky left-0 bg-inherit">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-sm">{vistoria.contrato_equipamentos?.numero_serie || '—'}</span>
                                    <span className="text-xs text-gray-500">{formatarData(vistoria.data_inspecao)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center font-semibold border-r border-gray-300 bg-gray-50 text-gray-800">
                                  {statusGeral}
                                </td>
                                {itensUnicos.map((item) => {
                                  const resposta = vistoria.respostas?.[item];
                                  const status = obterStatusResposta(resposta);
                                  const corClasses = obterCorStatusResposta(status);
                                  const simbolo = status === 'OK' ? '✓' : status === 'Faltando' ? '✕' : '—';

                                  return (
                                    <td
                                      key={`${vistoria.id}-${item}`}
                                      className={`px-3 py-3 text-center border-r border-gray-300 ${corClasses}`}
                                    >
                                      {simbolo}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

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
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Série</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Modelo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contrato</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Análise IA</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Foto</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Observações</th>
                    
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {vistoriasPortalFiltradas.map((vistoria: any) => {
                            const respostas = vistoria.respostas || {};
                            const temAvaria = Object.values(respostas).some((r: any) => r === false || r === 'Não');
                            return (
                              <tr key={vistoria.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 text-sm text-gray-900">{formatarData(vistoria.data_inspecao)}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{vistoria.contrato_equipamentos?.contratos?.nome_cliente || '—'}</td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-black">{vistoria.contrato_equipamentos?.numero_serie || '—'}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.contrato_equipamentos?.modelo || '—'}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.equipment_type}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.contrato_equipamentos?.contratos?.numero_contrato || '—'}</td>
                                <td className="px-6 py-4 text-sm">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    getStatusFinal(vistoria) === 'Com Avaria'
                                      ? 'bg-gray-200 text-gray-800 font-bold'
                                      : 'bg-gray-200 text-gray-800'
                                  }`}>
                                    {getStatusFinal(vistoria)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {(() => {
                                    try {
                                      const analise = vistoria.analise_ia;
                                      
                                      if (!analise) {
                                        return <span className="text-gray-500">—</span>;
                                      }
                                      
                                      const status = analise.status || 'pendente';
                                      const categoria = analise.categoria || '';
                                      const tipo_dano = analise.tipo_dano || '';
                                      
                                      let statusDisplay = '';
                                      
                                      if (status === 'OK') {
                                        statusDisplay = 'OK - Sem problemas';
                                      } else if (status === 'AVARIA') {
                                        const fullText = `AVARIA${categoria ? ' - ' + categoria : ''}${tipo_dano ? ' - ' + tipo_dano : ''}`;
                                        statusDisplay = fullText.length > 45 ? fullText.substring(0, 45) + '...' : fullText;
                                      } else if (status === 'pendente') {
                                        statusDisplay = 'PENDENTE';
                                      } else if (status === 'ERRO') {
                                        statusDisplay = 'ERRO';
                                      }
                                      
                                      return <span className="text-gray-900 truncate" title={statusDisplay}>{statusDisplay || '—'}</span>;
                                    } catch (e) {
                                      return <span className="text-gray-500">—</span>;
                                    }
                                  })()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  <button
                                    onClick={() => abrirModalFoto(vistoria.vistoria_id)}
                                    className="text-blue-600 hover:text-blue-800 font-semibold"
                                  >
                                    Foto
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  <button
                                    onClick={() => abrirModalRespostas(vistoria)}
                                    className="text-blue-600 hover:text-blue-800 font-semibold"
                                  >
                                    Ver Detalhes
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.observacoes || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : activeTab === 'vistorias' ? (
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
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contrato</th>
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
                                <td className="px-6 py-4 text-sm font-mono font-bold text-blue-600">
                                  {vistoria.contrato_equipamentos?.[0]?.contratos?.[0]?.numero_contrato || '—'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.cliente}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.tecnico}</td>
                                <td className={`px-6 py-4 text-sm ${getCorEstado(vistoria.estado)}`}>
                                  <span className={`${getCorEstado(vistoria.estado)}`}>
                                    {vistoria.estado === 'Equip. com AVARIA' ? 'Avaria' : 'OK'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-black">{vistoria.laudo || '—'}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{vistoria.avaria || '—'}</td>
                                <td className="px-6 py-4 text-sm">
                                  <span className={`${getCorComponente(vistoria.teclado_status)}`}>
                                    {vistoria.teclado_status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <span className={`${getCorComponente(vistoria.mouse_status)}`}>
                                    {vistoria.mouse_status}
                                  </span>
                                </td>
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
                {/* ABA: EQUIPAMENTOS PENDENTES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-blue-100 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Pendentes</p>
                    <p className="text-5xl font-bold text-blue-900 mt-3">{statsPendentes.pendentes}</p>
                  </div>

                  <div className="bg-gray-200 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Aprovados</p>
                    <p className="text-5xl font-bold text-gray-800 mt-3">{statsPendentes.aprovados}</p>
                  </div>

                  <div className="bg-gray-150 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Rejeitados</p>
                    <p className="text-5xl font-bold text-gray-700 mt-3">{statsPendentes.rejeitados}</p>
                  </div>
                </div>

                {/* FILTRO PENDENTES */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Filtrar por Status
                  </label>
                  <div className="flex gap-2">
                    {['Todos', 'Pendente', 'Aprovado', 'Rejeitado'].map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          setFiltroStatusPendente(status);
                          loadEquipamentosPendentes();
                        }}
                        className={`px-4 py-2 rounded font-semibold transition ${
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

                {/* TABELA EQUIPAMENTOS PENDENTES */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Equipamentos para Análise ({equipamentosPendentes.length})</h3>
                  </div>

                  {equipamentosPendentes.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-gray-600 font-semibold">Nenhum equipamento encontrado</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Série</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Usuário</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contrato</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {equipamentosPendentes.map(equipamento => (
                            <tr key={equipamento.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{equipamento.numero_serie}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{equipamento.usuario_email || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{equipamento.cliente_nome || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{equipamento.numero_contrato || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  equipamento.status === 'Pendente'
                                    ? 'bg-blue-100 text-blue-800'
                                    : equipamento.status === 'Aprovado'
                                    ? 'bg-gray-200 text-gray-800'
                                    : 'bg-gray-200 text-gray-800'
                                }`}>
                                  {equipamento.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {new Date(equipamento.created_at).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                {equipamento.status === 'Pendente' ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => abrirModalAprovacao(equipamento)}
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
                                    >
                                      Aprovar
                                    </button>
                                    <button
                                      onClick={() => abrirModalRejeicao(equipamento)}
                                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-semibold transition"
                                    >
                                      Rejeitar
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-500 text-xs">Processado</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-gray-900 text-gray-400 text-xs py-4 px-8 border-t border-gray-800">
          <p>Desenvolvido por <span className="font-semibold text-white">IA Serviços</span>  •  <span className="font-semibold text-white">Supervisora: Mikaela Nogueira</span>  •  <span className="font-semibold text-white">Analistas: Angélica Rejan, Ryan Gabriel, Weslley Neri</span></p>
        </div>
      </div>

      {/* MODAL DE RESPOSTAS ESTRUTURADO */}
      {showRespostasModal && respostasModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* HEADER */}
            <div className="sticky top-0 bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Detalhes da Inspecao</h2>
                <p className="text-gray-400 text-sm mt-1">{formatarData(respostasModal.data_inspecao)}</p>
              </div>
              <button
                onClick={() => setShowRespostasModal(false)}
                className="text-gray-400 hover:text-white rounded-full p-2 transition"
              >
                ✕
              </button>
            </div>

            {/* INFORMAÇÕES DO EQUIPAMENTO */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Informações do Equipamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Cliente</p>
                  <p className="text-lg font-bold text-gray-900">{respostasModal.contrato_equipamentos?.contratos?.nome_cliente || '—'}</p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Contrato</p>
                  <p className="text-lg font-bold text-gray-900">{respostasModal.contrato_equipamentos?.contratos?.numero_contrato || '—'}</p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Número de Série</p>
                  <p className="text-lg font-mono font-bold text-black">{respostasModal.contrato_equipamentos?.numero_serie || '—'}</p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Modelo</p>
                  <p className="text-lg font-bold text-gray-900">{respostasModal.contrato_equipamentos?.modelo || '—'}</p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Tipo</p>
                  <p className="text-lg font-bold text-gray-900">{respostasModal.equipment_type || '—'}</p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold">Status Geral</p>
                  <p className="text-lg font-bold text-gray-700">
                    {Object.values(respostasModal.respostas || {}).some((r: any) => r === false || r === 'Nao') ? 'Com Avaria' : 'OK'}
                  </p>
                </div>
              </div>
            </div>

            {/* ANALISE DA IA - DESTAQUE PROFISSIONAL */}
            {respostasModal.analise_ia && (
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-900 uppercase mb-3">Analise da IA</h3>
                <div className="p-4 bg-white border border-gray-200 rounded space-y-3">
                  {typeof respostasModal.analise_ia === 'object' ? (
                    <>
                      {respostasModal.analise_ia.status && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Status</p>
                          <p className="text-sm text-gray-900 font-bold">{respostasModal.analise_ia.status}</p>
                        </div>
                      )}
                      {respostasModal.analise_ia.categoria && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Categoria</p>
                          <p className="text-sm text-gray-900">{respostasModal.analise_ia.categoria}</p>
                        </div>
                      )}
                      {respostasModal.analise_ia.tipo_dano && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Tipo de Dano</p>
                          <p className="text-sm text-gray-900">{respostasModal.analise_ia.tipo_dano}</p>
                        </div>
                      )}
                      {respostasModal.analise_ia.descricao && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase">Descricao</p>
                          <p className="text-sm text-gray-800 leading-relaxed">{respostasModal.analise_ia.descricao}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-800 leading-relaxed">{respostasModal.analise_ia}</p>
                  )}
                </div>
              </div>
            )}

            {/* RESPOSTAS ESTRUTURADAS */}
            <div className="px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Respostas da Inspecao</h3>
              <div className="space-y-3">
                {Object.entries(respostasModal.respostas || {}).map(([pergunta, resposta]: [string, any]) => {
                  const isOk = resposta === true || resposta === 'Sim';
                  const isFaltando = resposta === false || resposta === 'Nao';
                  
                  return (
                    <div key={pergunta} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 capitalize">{pergunta.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOk && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-semibold">
                              ✓ OK
                            </span>
                          )}
                          {isFaltando && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-semibold">
                              ✕ Faltando
                            </span>
                          )}
                          {!isOk && !isFaltando && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-semibold">
                              {resposta}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* OBSERVACOES */}
            {respostasModal.observacoes && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Observacoes</h3>
                <p className="text-sm text-gray-800">{respostasModal.observacoes}</p>
              </div>
            )}

            {/* FOOTER DO MODAL */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowRespostasModal(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DECISÃO */}
      {equipamentoSelecionado && modoAprovacao === 'aprovar' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Aprovar Equipamento</h3>

            {/* INFO DO EQUIPAMENTO */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Série</p>
                  <p className="text-lg font-bold text-gray-900">{equipamentoSelecionado.numero_serie}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Usuário</p>
                  <p className="text-sm text-gray-900">{equipamentoSelecionado.usuario_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Cliente</p>
                  <p className="text-sm text-gray-900">{equipamentoSelecionado.cliente_nome || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Data</p>
                  <p className="text-sm text-gray-900">{new Date(equipamentoSelecionado.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>

            {/* CAMPOS DE APROVAÇÃO */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contrato *
                </label>
                <select
                  value={contratoSelecionado}
                  onChange={(e) => setContratoSelecionado(e.target.value)}
                  disabled={atualizando}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Selecione um contrato</option>
                  {contratos.map(contrato => (
                    <option key={contrato.id} value={contrato.id}>
                      {contrato.numero_contrato} - {(contrato as any).nome_cliente || 'Sem cliente'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Modelo *
                </label>
                <input
                  type="text"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  disabled={atualizando}
                  placeholder="Ex: POSITIVO MASTER D610 SS81T0ANEB150VCN-1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  SKU *
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={atualizando}
                  placeholder="Ex: 1304788"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Equipamento *
                </label>
                <select
                  value={tipoMaterial}
                  onChange={(e) => setTipoMaterial(e.target.value)}
                  disabled={atualizando}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Selecione um tipo</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Notebook">Notebook</option>
                  <option value="MiniPro">MiniPro</option>
                  <option value="All in One">All in One</option>
                  <option value="Duo">Duo</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Chromebook">Chromebook</option>
                  <option value="Máquina de pagamento">Máquina de pagamento</option>
                  <option value="Diversos">Diversos</option>
                  <option value="Celular">Celular</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notas da Análise
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  disabled={atualizando}
                  placeholder="Digite suas notas aqui..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 h-20"
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
                  setTipoMaterial('');
                  setContratoSelecionado('');
                }}
                disabled={atualizando}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => salvarDecisao('Aprovado')}
                disabled={atualizando}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {atualizando ? 'Processando...' : 'Aprovar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REJEIÇÃO */}
      {equipamentoSelecionado && modoAprovacao === 'rejeitar' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Rejeitar Equipamento</h3>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                <strong>Série:</strong> {equipamentoSelecionado.numero_serie}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Usuário:</strong> {equipamentoSelecionado.usuario_email || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Cliente:</strong> {equipamentoSelecionado.cliente_nome || 'N/A'}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Motivo da Rejeição *
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                disabled={atualizando}
                placeholder="Explique o motivo da rejeição..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 h-24"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEquipamentoSelecionado(null);
                  setNotas('');
                }}
                disabled={atualizando}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => salvarDecisao('Rejeitado')}
                disabled={atualizando || !notas.trim()}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
              >
                {atualizando ? 'Processando...' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FOTO */}
      {showFotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{fotoModalNome}</h3>
              <button
                onClick={() => setShowFotoModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 flex justify-center">
              <img
                src={fotoModalUrl}
                alt={fotoModalNome}
                className="max-w-full max-h-96 object-contain"
              />
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowFotoModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Fechar
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(fotoModalUrl);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fotoModalNome || 'foto.jpg';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Erro ao fazer download:', error);
                    alert('Erro ao fazer download da foto');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Baixar
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
