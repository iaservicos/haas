import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vistoriaService } from '../services/vistoria.service';
import { supabase } from '../services/supabase';
import { Vistoria } from '../types';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

declare global {
  interface Window {
    XLSX: any;
  }
}

export function Dashboard() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [stats, setStats] = useState({ total: 0, comAvaria: 0, semAvaria: 0 });
  const [statsPendentes, setStatsPendentes] = useState({ pendentes: 0, aprovados: 0, rejeitados: 0 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [activeTab, setActiveTab] = useState('vistorias');
  
  // Filtros
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);

  // Estados de equipamentos pendentes
  const [equipamentosPendentes, setEquipamentosPendentes] = useState<any[]>([]);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<any>(null);
  const [modoAprovacao, setModoAprovacao] = useState<'aprovar' | 'rejeitar' | null>(null);
  const [contratos, setContratos] = useState<any[]>([]);
  const [contratoSelecionado, setContratoSelecionado] = useState('');
  const [modelo, setModelo] = useState('');
  const [sku, setSku] = useState('');
  const [notas, setNotas] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const [filtroStatusPendentes, setFiltroStatusPendentes] = useState('Pendente');

  // Estados de importação
  const [equipamentosImportacao, setEquipamentosImportacao] = useState<any[]>([]);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [importandoArquivo, setImportandoArquivo] = useState(false);
  const [mensagemImportacao, setMensagemImportacao] = useState('');
  const [tipoMensagemImportacao, setTipoMensagemImportacao] = useState<'sucesso' | 'erro' | 'aviso'>('sucesso');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      await carregarVistorias();
      await carregarEquipamentosPendentes();
      await carregarContratos();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarVistorias = async () => {
    try {
      const data = await vistoriaService.getVistorias();
      setVistorias(data);

      // Calcular estatísticas
      const total = data.length;
      const comAvaria = data.filter(v => v.status === 'Com Avaria').length;
      const semAvaria = data.filter(v => v.status === 'Sem Avaria').length;
      setStats({ total, comAvaria, semAvaria });

      // Extrair técnicos e clientes únicos
      const tecnicos = [...new Set(data.map(v => v.tecnico))].filter(Boolean) as string[];
      const clientes = [...new Set(data.map(v => v.cliente))].filter(Boolean) as string[];
      setTecnicos(tecnicos);
      setClientes(clientes);
    } catch (error) {
      console.error('Erro ao carregar vistorias:', error);
    }
  };

  const carregarEquipamentosPendentes = async () => {
    try {
      const { data, error } = await supabase
        .from('pendingequipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEquipamentosPendentes(data || []);

      // Calcular estatísticas
      const pendentes = (data || []).filter(e => e.status === 'Pendente').length;
      const aprovados = (data || []).filter(e => e.status === 'Aprovado').length;
      const rejeitados = (data || []).filter(e => e.status === 'Rejeitado').length;
      setStatsPendentes({ pendentes, aprovados, rejeitados });
    } catch (error) {
      console.error('Erro ao carregar equipamentos pendentes:', error);
    }
  };

  const carregarContratos = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('id, numero_contrato, nome_cliente')
        .order('numero_contrato', { ascending: true });

      if (error) throw error;
      setContratos(data || []);
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
    }
  };

  const loadXLSXLibrary = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.XLSX) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        setTimeout(() => {
          if (window.XLSX) {
            resolve();
          } else {
            reject(new Error('XLSX não carregou'));
          }
        }, 100);
      };

      script.onerror = () => {
        reject(new Error('Erro ao carregar XLSX do CDN'));
      };

      document.head.appendChild(script);
    });
  };

  const processarArquivoExcel = async (file: File) => {
    try {
      setImportandoArquivo(true);
      setMensagemImportacao('');

      await loadXLSXLibrary();

      const XLSX = window.XLSX;
      if (!XLSX) {
        setMensagemImportacao('Biblioteca XLSX não carregou. Tente novamente.');
        setTipoMensagemImportacao('erro');
        setImportandoArquivo(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets['Equipamentos'];

          if (!worksheet) {
            setMensagemImportacao('Aba "Equipamentos" não encontrada no arquivo');
            setTipoMensagemImportacao('erro');
            setImportandoArquivo(false);
            return;
          }

          const rows = XLSX.utils.sheet_to_json(worksheet);
          
          const equipamentosValidos = rows.map((row: any) => ({
            numero_serie: String(row['Nº Série'] || row['No Serie'] || row['numero_serie'] || '').trim(),
            nota_fiscal: String(row['Nota Fiscal'] || row['nota_fiscal'] || '').trim(),
            destino: String(row['Destino'] || row['destino'] || '').trim()
          })).filter(eq => eq.numero_serie && eq.nota_fiscal && eq.destino);

          if (equipamentosValidos.length === 0) {
            setMensagemImportacao('Nenhum equipamento válido encontrado. Verifique as colunas: Nº Série, Nota Fiscal, Destino');
            setTipoMensagemImportacao('erro');
            setImportandoArquivo(false);
            return;
          }

          console.log('Equipamentos válidos:', equipamentosValidos.length);
          setEquipamentosImportacao(equipamentosValidos);
          setMensagemImportacao(`${equipamentosValidos.length} equipamentos encontrados. Clique em "Confirmar Importação" para salvar.`);
          setTipoMensagemImportacao('sucesso');
        } catch (error) {
          console.error('Erro ao processar Excel:', error);
          setMensagemImportacao('Erro ao processar arquivo. Verifique o formato.');
          setTipoMensagemImportacao('erro');
        } finally {
          setImportandoArquivo(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Erro ao carregar XLSX:', error);
      setMensagemImportacao('Erro ao carregar biblioteca XLSX. Verifique sua conexão.');
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
    try {
      for (const equipamento of equipamentosImportacao) {
        const { error } = await supabase
          .from('contrato_equipamentos')
          .update({
            nota_fiscal: equipamento.nota_fiscal,
            destino: equipamento.destino,
          })
          .eq('numero_serie', equipamento.numero_serie);

        if (error) {
          console.error(`Erro ao atualizar ${equipamento.numero_serie}:`, error);
        }
      }

      setMensagemImportacao(`✅ ${equipamentosImportacao.length} equipamentos importados com sucesso!`);
      setTipoMensagemImportacao('sucesso');
      setEquipamentosImportacao([]);
      setArquivoSelecionado(null);

      setTimeout(() => {
        setMensagemImportacao('');
      }, 3000);
    } catch (error) {
      console.error('Erro ao importar:', error);
      setMensagemImportacao('Erro ao importar equipamentos.');
      setTipoMensagemImportacao('erro');
    } finally {
      setImportandoArquivo(false);
    }
  };

  const salvarDecisao = async (status: 'Aprovado' | 'Rejeitado') => {
    if (!equipamentoSelecionado) return;

    if (status === 'Aprovado') {
      if (!contratoSelecionado || !modelo || !sku) {
        alert('Preencha todos os campos obrigatórios');
        return;
      }
    } else if (status === 'Rejeitado') {
      if (!notas.trim()) {
        alert('Informe o motivo da rejeição');
        return;
      }
    }

    setAtualizando(true);
    try {
      // Atualizar status na tabela pendingequipment
      const { error: updateError } = await supabase
        .from('pendingequipment')
        .update({
          status,
          analyst_notes: notas
        })
        .eq('id', equipamentoSelecionado.id);

      if (updateError) throw updateError;

      // Se aprovado, inserir na tabela contrato_equipamentos
      if (status === 'Aprovado') {
        const { error: insertError } = await supabase
          .from('contrato_equipamentos')
          .insert([{
            contrato_id: parseInt(contratoSelecionado),
            numero_serie: equipamentoSelecionado.numero_serie,
            modelo,
            sku
          }]);

        if (insertError) throw insertError;
      }

      alert(`Equipamento ${status.toLowerCase()} com sucesso!`);
      setEquipamentoSelecionado(null);
      setModoAprovacao(null);
      setNotas('');
      setModelo('');
      setSku('');
      setContratoSelecionado('');
      await carregarEquipamentosPendentes();
    } catch (error) {
      console.error('Erro ao salvar decisão:', error);
      alert('Erro ao salvar decisão');
    } finally {
      setAtualizando(false);
    }
  };

  const handleGoToClientes = () => navigate('/clientes');
  const handleGoToContratos = () => navigate('/contratos');
  const handleGoToEquipamentos = () => navigate('/equipamentos');
  const handleGoToConfirmacoes = () => navigate('/confirmacoes');
  const handleGoToPhotos = () => navigate('/fotos');

  const filtrarVistorias = () => {
    let filtered = vistorias;

    if (filtroTecnico) {
      filtered = filtered.filter(v => v.tecnico === filtroTecnico);
    }
    if (filtroCliente) {
      filtered = filtered.filter(v => v.cliente === filtroCliente);
    }
    if (filtroStatus) {
      filtered = filtered.filter(v => v.status === filtroStatus);
    }

    return filtered;
  };

  const limparFiltros = () => {
    setFiltroTecnico('');
    setFiltroCliente('');
    setFiltroStatus('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between">
          <h2 className={`font-bold ${sidebarOpen ? 'text-lg' : 'text-xs'}`}>Menu</h2>
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
                setActiveTab('pendentes');
                carregarEquipamentosPendentes();
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
            <button
              onClick={() => setActiveTab('importacao')}
              className={`px-4 py-3 font-semibold border-b-2 transition ${
                activeTab === 'importacao'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📥 Importar Informações
            </button>
          </div>
        </div>

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        value={filtroStatus}
                        onChange={(e) => setFiltroStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os Status</option>
                        <option value="Com Avaria">Com Avaria</option>
                        <option value="Sem Avaria">Sem Avaria</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* TABELA DE VISTORIAS */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-900 border-b-4 border-gray-800">
                    <h3 className="text-lg font-bold text-white">Vistorias Realizadas</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Técnico</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filtrarVistorias().map((vistoria) => (
                          <tr key={vistoria.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{vistoria.tecnico}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{vistoria.cliente}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{new Date(vistoria.data).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                vistoria.status === 'Com Avaria' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {vistoria.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : activeTab === 'importacao' ? (
              <>
                {/* INSTRUÇÕES */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-bold text-blue-900 mb-4">📥 Importar Informações de Equipamentos</h3>
                  <div className="space-y-2 text-blue-800 text-sm">
                    <p><strong>Instruções:</strong></p>
                    <p>1. Prepare um arquivo Excel com as colunas: <code className="bg-white px-2 py-1 rounded font-mono">Nº Série</code>, <code className="bg-white px-2 py-1 rounded font-mono">Nota Fiscal</code>, <code className="bg-white px-2 py-1 rounded font-mono">Destino</code></p>
                    <p>2. Selecione o arquivo abaixo</p>
                    <p>3. Revise os equipamentos encontrados</p>
                    <p>4. Clique em "Confirmar Importação"</p>
                  </div>
                </div>

                {/* UPLOAD DE ARQUIVO */}
                <div className="bg-white rounded-lg shadow p-8 mb-8">
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
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-gray-700 font-bold mb-2 text-lg">
                        {arquivoSelecionado ? `📄 ${arquivoSelecionado.name}` : 'Clique para selecionar arquivo'}
                      </p>
                      <p className="text-gray-500 text-sm">ou arraste o arquivo aqui</p>
                      <p className="text-gray-400 text-xs mt-3">Formatos suportados: Excel (.xlsx, .xls)</p>
                    </label>
                  </div>

                  {mensagemImportacao && (
                    <div
                      className={`mt-6 p-4 rounded-lg text-sm font-semibold ${
                        tipoMensagemImportacao === 'sucesso'
                          ? 'bg-green-50 text-green-800 border-2 border-green-200'
                          : tipoMensagemImportacao === 'erro'
                          ? 'bg-red-50 text-red-800 border-2 border-red-200'
                          : 'bg-yellow-50 text-yellow-800 border-2 border-yellow-200'
                      }`}
                    >
                      {mensagemImportacao}
                    </div>
                  )}
                </div>

                {/* TABELA DE PREVIEW */}
                {equipamentosImportacao.length > 0 && (
                  <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                    <div className="px-6 py-4 bg-gray-900 border-b-4 border-gray-800">
                      <h3 className="text-lg font-bold text-white">✅ Equipamentos a Importar ({equipamentosImportacao.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Número de Série</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nota Fiscal</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Destino</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {equipamentosImportacao.slice(0, 10).map((eq: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{eq.numero_serie}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.nota_fiscal}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{eq.destino}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {equipamentosImportacao.length > 10 && (
                        <div className="px-6 py-4 bg-gray-50 text-center text-sm text-gray-600 font-semibold">
                          ... e mais {equipamentosImportacao.length - 10} equipamentos
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-4 bg-white border-t border-gray-200 flex gap-3">
                      <button
                        onClick={() => {
                          setEquipamentosImportacao([]);
                          setArquivoSelecionado(null);
                          setMensagemImportacao('');
                        }}
                        disabled={importandoArquivo}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-bold"
                      >
                        ✕ Cancelar
                      </button>
                      <button
                        onClick={confirmarImportacao}
                        disabled={importandoArquivo}
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-bold"
                      >
                        {importandoArquivo ? '⏳ Importando...' : '✅ Confirmar Importação'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* EQUIPAMENTOS PENDENTES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-yellow-100 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Pendentes</p>
                    <p className="text-5xl font-bold text-yellow-900 mt-3">{statsPendentes.pendentes}</p>
                  </div>

                  <div className="bg-green-100 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Aprovados</p>
                    <p className="text-5xl font-bold text-green-900 mt-3">{statsPendentes.aprovados}</p>
                  </div>

                  <div className="bg-red-100 rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Rejeitados</p>
                    <p className="text-5xl font-bold text-red-900 mt-3">{statsPendentes.rejeitados}</p>
                  </div>
                </div>

                {/* FILTRO POR STATUS */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <div className="flex gap-3">
                    {['Pendente', 'Aprovado', 'Rejeitado'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setFiltroStatusPendentes(status)}
                        className={`px-4 py-2 rounded font-semibold transition ${
                          filtroStatusPendentes === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TABELA DE EQUIPAMENTOS PENDENTES */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-900 border-b-4 border-gray-800">
                    <h3 className="text-lg font-bold text-white">Equipamentos para Análise</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Série</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Usuário</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contrato</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {equipamentosPendentes
                          .filter(e => e.status === filtroStatusPendentes)
                          .map((equipamento) => (
                            <tr key={equipamento.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{equipamento.numero_serie}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{equipamento.usuario_email || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{equipamento.cliente_nome || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{equipamento.numero_contrato || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  equipamento.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' :
                                  equipamento.status === 'Aprovado' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {equipamento.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{new Date(equipamento.created_at).toLocaleDateString('pt-BR')}</td>
                              <td className="px-6 py-4 text-sm">
                                {equipamento.status === 'Pendente' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setEquipamentoSelecionado(equipamento);
                                        setModoAprovacao('aprovar');
                                      }}
                                      className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 transition"
                                    >
                                      Aprovar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEquipamentoSelecionado(equipamento);
                                        setModoAprovacao('rejeitar');
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 transition"
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE APROVAÇÃO */}
      {equipamentoSelecionado && modoAprovacao === 'aprovar' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Aprovar Equipamento</h3>

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
              <p className="text-sm text-gray-600">
                <strong>Data:</strong> {new Date(equipamentoSelecionado.created_at).toLocaleDateString('pt-BR')}
              </p>
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
                      {contrato.numero_contrato} - {contrato.nome_cliente || 'Sem cliente'}
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
                  placeholder="Ex: Notebook Dell"
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
                  placeholder="Ex: SKU-12345"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
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
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
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
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {atualizando ? 'Processando...' : 'Rejeitar'}
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
