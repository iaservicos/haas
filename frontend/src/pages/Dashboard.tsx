// frontend/src/pages/Dashboard.tsx - VERSÃO ATUALIZADA COM MENU INTEGRADO

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vistoriaService } from '../services/vistoria.service';
import { Vistoria } from '../types';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

// Importar os novos componentes
import { GerenciarContratos } from './GerenciarContratos';
import { GerenciarClientes } from './GerenciarClientes';
import { GerenciarEquipamentos } from './GerenciarEquipamentos';
import { VerConfirmacoes } from './VerConfirmacoes';

type MenuOption = 'dashboard' | 'fotos' | 'contratos' | 'clientes' | 'equipamentos' | 'confirmacoes';

export function Dashboard() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState<MenuOption>('dashboard');
  
  // FILTROS
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
  
  // ESTATÍSTICAS
  const [stats, setStats] = useState({
    total: 0,
    comAvaria: 0,
    semAvaria: 0,
    mouseOk: 0,
    mouseAusente: 0,
    tecladoOk: 0,
    tecladoAusente: 0,
  });

  // CARREGAR DADOS INICIAIS
  useEffect(() => {
    loadVistorias();
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
      
      // EXTRAIR LISTAS ÚNICAS PARA OS DROPDOWNS
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

  const renderContent = () => {
    switch (activeMenu) {
      case 'contratos':
        return <GerenciarContratos />;
      case 'clientes':
        return <GerenciarClientes />;
      case 'equipamentos':
        return <GerenciarEquipamentos />;
      case 'confirmacoes':
        return <VerConfirmacoes />;
      case 'fotos':
        handleGoToPhotos();
        return null;
      case 'dashboard':
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => {
    return (
      <div className="p-8">
        {/* CARDS DE ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-100 rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total de Vistorias</p>
            <p className="text-5xl font-bold text-blue-900 mt-3">{stats.total}</p>
          </div>

          <div className="bg-gray-200 rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Com Avaria</p>
            <p className="text-5xl font-bold text-gray-800 mt-3">{stats.comAvaria}</p>
          </div>

          <div className="bg-green-100 rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Equipamento OK</p>
            <p className="text-5xl font-bold text-green-900 mt-3">{stats.semAvaria}</p>
          </div>

          <div className="bg-blue-50 rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Mouse OK</p>
            <p className="text-5xl font-bold text-blue-700 mt-3">{stats.mouseOk}</p>
          </div>

          <div className="bg-red-50 rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Mouse Ausente</p>
            <p className="text-5xl font-bold text-red-700 mt-3">{stats.mouseAusente}</p>
          </div>

          <div className="bg-yellow-50 rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Teclado Ausente</p>
            <p className="text-5xl font-bold text-yellow-700 mt-3">{stats.tecladoAusente}</p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Filtrar por Técnico"
              value={filtroTecnico}
              onChange={(e) => setFiltroTecnico(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Filtrar por Cliente"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Filtrar por Equipamento"
              value={filtroEquipamento}
              onChange={(e) => setFiltroEquipamento(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os Estados</option>
              <option value="Equipamento OK">Equipamento OK</option>
              <option value="Equip. com AVARIA">Equip. com AVARIA</option>
            </select>
            <select
              value={filtroMouse}
              onChange={(e) => setFiltroMouse(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os Mouse</option>
              <option value="Mouse, OK">Mouse, OK</option>
              <option value="Mouse, AUSENTE">Mouse, AUSENTE</option>
            </select>
            <select
              value={filtroTeclado}
              onChange={(e) => setFiltroTeclado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os Teclados</option>
              <option value="Teclado, OK">Teclado, OK</option>
              <option value="Teclado, AUSENTE">Teclado, AUSENTE</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={limparFiltros}
              className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition"
            >
              Limpar Filtros
            </button>
            <button
              onClick={exportarRelatorio}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              📥 Exportar CSV
            </button>
          </div>
        </div>

        {/* TABELA DE VISTORIAS */}
        {loading ? (
          <p className="text-center text-gray-600">Carregando vistorias...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Data</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Série</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Equipamento</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Cliente</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Técnico</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Estado</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Teclado</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Mouse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vistorias.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{formatarData(v.data_vistoria)}</td>
                    <td className="px-6 py-4 font-medium">{v.numero_serie}</td>
                    <td className="px-6 py-4">{v.equipamento}</td>
                    <td className="px-6 py-4">{v.cliente}</td>
                    <td className="px-6 py-4">{v.tecnico}</td>
                    <td className={`px-6 py-4 ${getCorEstado(v.estado)}`}>{v.estado}</td>
                    <td className={`px-6 py-4 ${getCorComponente(v.teclado_status)}`}>{v.teclado_status}</td>
                    <td className={`px-6 py-4 ${getCorComponente(v.mouse_status)}`}>{v.mouse_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
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
          
          <button
            onClick={() => setActiveMenu('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${
              activeMenu === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {sidebarOpen && <span>📊 Dashboard</span>}
          </button>

          <div className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase mt-4">Gerenciamento</div>

          <button
            onClick={() => setActiveMenu('contratos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${
              activeMenu === 'contratos' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {sidebarOpen && <span>📋 Contratos</span>}
          </button>

          <button
            onClick={() => setActiveMenu('clientes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${
              activeMenu === 'clientes' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {sidebarOpen && <span>👥 Clientes</span>}
          </button>

          <button
            onClick={() => setActiveMenu('equipamentos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${
              activeMenu === 'equipamentos' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {sidebarOpen && <span>💻 Equipamentos</span>}
          </button>

          <button
            onClick={() => setActiveMenu('confirmacoes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded transition ${
              activeMenu === 'confirmacoes' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {sidebarOpen && <span>✅ Confirmações</span>}
          </button>

          <div className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase mt-4">Outros</div>

          <button
            onClick={handleGoToPhotos}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>📸 Fotos</span>}
          </button>

          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>🔑 Alterar Senha</span>}
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-red-600 rounded transition"
          >
            {sidebarOpen && <span>🚪 Sair</span>}
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

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>

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
