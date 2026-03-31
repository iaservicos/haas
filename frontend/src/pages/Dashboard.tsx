import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vistoriaService } from '../services/vistoria.service';
import { Vistoria } from '../types';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

export function Dashboard() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
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
    // Extrai apenas a parte da data (YYYY-MM-DD) sem a hora
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
    // Filtrar vistorias conforme os filtros aplicados
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

    // Criar cabeçalho do CSV
    const headers = ['Data', 'Série', 'Equipamento', 'Cliente', 'Técnico', 'Estado', 'Laudo', 'Avaria', 'Teclado', 'Mouse'];
    
    // Criar linhas do CSV
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

    // Montar CSV
    let csvContent = headers.join(',') + '\n';
    rows.forEach((row: any[]) => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    // Criar blob e download
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

  // NOVO: Funções de navegação
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

          {/* NOVO: Botão Contratos */}
          <button
            onClick={handleGoToContratos}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>Contratos</span>}
          </button>

          {/* NOVO: Botão Clientes */}
          <button
            onClick={handleGoToClientes}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>Clientes</span>}
          </button>

          {/* NOVO: Botão Equipamentos */}
          <button
            onClick={handleGoToEquipamentos}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>Equipamentos</span>}
          </button>

          {/* NOVO: Botão Confirmações */}
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

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* CARDS DE ESTATÍSTICAS - CORPORATIVO */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Card Total */}
              <div className="bg-blue-100 rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total de Vistorias</p>
                <p className="text-5xl font-bold text-blue-900 mt-3">{stats.total}</p>
              </div>

              {/* Card Avaria */}
              <div className="bg-gray-200 rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Com Avaria</p>
                <p className="text-5xl font-bold text-gray-800 mt-3">{stats.comAvaria}</p>
              </div>

              {/* Card OK */}
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
                            <td className="px-6 py-4 text-sm">
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
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-gray-900 text-gray-400 text-xs py-4 px-8 border-t border-gray-800">
          <p>Desenvolvido por <span className="font-semibold text-white">IA Serviços</span>  •  <span className="font-semibold text-white">Supervisora: Mikaela Nogueira</span>  •  <span className="font-semibold text-white">Analistas: Angélica Rejan, Ryan Gabriel, Weslley Neri</span></p>
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