import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";
import { supabase } from '../services/supabase';
import { gerarTemplateExcel } from '../utils/gerarTemplateExcel';

interface Equipamento {
  id: number;
  contrato_id: number;
  numero_serie: string;
  modelo: string;
  sku: string | null;
  data_criacao: string;
  contratos?: {
    id: number;
    numero_contrato: string;
    nome_cliente: string;
  };
}

interface Contrato {
  id: number;
  numero_contrato: string;
  nome_cliente?: string;
}

export function GerenciarEquipamentos() {
  const { usuario, logout } = useAuth();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContrato, setSelectedContrato] = useState<string>('');
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(1000);
  const [totalEquipamentos, setTotalEquipamentos] = useState(0);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedImportContrato, setSelectedImportContrato] = useState<string>('');
  
  // Form states
  const [formData, setFormData] = useState({
    contrato_id: '',
    numero_serie: '',
    modelo: '',
    sku: '',
  });

  useEffect(() => {
    carregarDados();
  }, []);

  // Recarregar equipamentos quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
    carregarEquipamentos();
  }, [selectedContrato, selectedCliente, searchTerm]);

  // Recarregar quando página muda
  useEffect(() => {
    carregarEquipamentos();
  }, [currentPage]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar contratos com clientes
      const { data: contratosData, error: contratosError } = await supabase
        .from('contratos')
        .select('id, numero_contrato, nome_cliente')
        .order('numero_contrato', { ascending: true });

      if (contratosError) throw contratosError;
      setContratos(contratosData || []);

      // Carregar equipamentos
      carregarEquipamentos();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const carregarEquipamentos = async () => {
    try {
      // Calcular offset para paginação
      const offset = (currentPage - 1) * itemsPerPage;

      // Contar total de equipamentos
      let countQuery = supabase
        .from('contrato_equipamentos')
        .select('id', { count: 'exact', head: true });

      if (selectedContrato) {
        countQuery = countQuery.eq('contrato_id', parseInt(selectedContrato));
      }

      if (searchTerm) {
        countQuery = countQuery.ilike('numero_serie', `%${searchTerm}%`);
      }

      const { count } = await countQuery;
      setTotalEquipamentos(count || 0);

      // Carregar equipamentos COM PAGINAÇÃO
      let query = supabase
        .from('contrato_equipamentos')
        .select(`
          id,
          contrato_id,
          numero_serie,
          modelo,
          sku,
          data_criacao,
          contratos:contrato_id(
            id,
            numero_contrato,
            nome_cliente
          )
        `)
        .order('data_criacao', { ascending: false })
        .range(offset, offset + itemsPerPage - 1);

      if (selectedContrato) {
        query = query.eq('contrato_id', parseInt(selectedContrato));
      }

      if (searchTerm) {
        query = query.ilike('numero_serie', `%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Normalizar dados: converter contratos array em objeto se necessario
      let normalizedData = (data || []).map((equip: any) => ({
        ...equip,
        contratos: Array.isArray(equip.contratos) ? equip.contratos[0] : equip.contratos
      }));
      
      // Filtrar por cliente no lado do cliente (JavaScript)
      let filteredData = normalizedData;
      if (selectedCliente) {
        filteredData = filteredData.filter(
          (equip) => equip.contratos?.nome_cliente?.trim() === selectedCliente?.trim()
        );
      }
      
      setEquipamentos(filteredData as Equipamento[]);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    }
  };

  const handleOpenModal = (equipamento?: Equipamento) => {
    if (equipamento) {
      setIsEditing(true);
      setEditingId(equipamento.id);
      setFormData({
        contrato_id: equipamento.contrato_id.toString(),
        numero_serie: equipamento.numero_serie,
        modelo: equipamento.modelo,
        sku: equipamento.sku || '',
      });
    } else {
      setIsEditing(false);
      setEditingId(null);
      setFormData({
        contrato_id: '',
        numero_serie: '',
        modelo: '',
        sku: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      contrato_id: '',
      numero_serie: '',
      modelo: '',
      sku: '',
    });
  };

  const handleSave = async () => {
    if (!formData.contrato_id || !formData.numero_serie || !formData.modelo || !formData.sku) {
      alert('Preencha todos os campos obrigatórios: Contrato, Série, Modelo e SKU');
      return;
    }

    try {
      if (isEditing && editingId) {
        // Atualizar
        const { error } = await supabase
          .from('contrato_equipamentos')
          .update({
            contrato_id: parseInt(formData.contrato_id),
            numero_serie: formData.numero_serie,
            modelo: formData.modelo,
            sku: formData.sku,
          })
          .eq('id', editingId);

        if (error) throw error;
        alert('Equipamento atualizado com sucesso!');
      } else {
        // Inserir novo
        const { error } = await supabase
          .from('contrato_equipamentos')
          .insert([{
            contrato_id: parseInt(formData.contrato_id),
            numero_serie: formData.numero_serie,
            modelo: formData.modelo,
            sku: formData.sku,
          }]);

        if (error) throw error;
        alert('Equipamento adicionado com sucesso!');
      }

      handleCloseModal();
      carregarEquipamentos();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar equipamento');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este equipamento?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contrato_equipamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Equipamento deletado com sucesso!');
      carregarEquipamentos();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar equipamento');
    }
  };

  const handleImportarEquipamentos = async () => {
    if (!importFile) {
      alert('Selecione um arquivo para importar');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js';
      script.onload = async () => {
        try {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const data = e.target?.result as ArrayBuffer;
              const XLSX = (window as any).XLSX;

              const workbook = XLSX.read(data, { type: 'array' });
              const worksheet = workbook.Sheets['Equipamentos'];

              if (!worksheet) {
                alert('Aba "Equipamentos" nao encontrada no arquivo');
                setIsImporting(false);
                return;
              }

              const rows = XLSX.utils.sheet_to_json(worksheet);
              let inserted = 0;
              let skipped = 0;
              const contratoId = parseInt(selectedImportContrato);

              if (!contratoId) {
                alert('Selecione um contrato antes de importar');
                setIsImporting(false);
                return;
              }

              for (let i = 0; i < rows.length; i++) {
                const row: any = rows[i];

                const numeroSerie = String(row['No Serie'] || row['numero_serie'] || '').trim();
                const modelo = String(row['Modelo'] || row['modelo'] || '').trim();
                const sku = String(row['SKU'] || row['sku'] || '').trim() || null;

                if (!numeroSerie || !modelo) {
                  skipped++;
                  continue;
                }

                try {
                  const { data: existing } = await supabase
                    .from('contrato_equipamentos')
                    .select('id')
                    .eq('numero_serie', numeroSerie)
                    .single();

                  if (existing) {
                    skipped++;
                  } else {
                    const { error } = await supabase
                      .from('contrato_equipamentos')
                      .insert([{
                        contrato_id: contratoId,
                        numero_serie: numeroSerie,
                        modelo: modelo,
                        sku: sku,
                      }]);

                    if (error) {
                      skipped++;
                    } else {
                      inserted++;
                    }
                  }
                } catch (err) {
                  skipped++;
                }

                setImportProgress(Math.round(((i + 1) / rows.length) * 100));
              }

              alert(`Importacao concluida!\nInseridos: ${inserted}\nIgnorados: ${skipped}`);
              setShowImportModal(false);
              setImportFile(null);
              setImportProgress(0);
              setSelectedImportContrato('');
              setIsImporting(false);
              carregarEquipamentos();
            } catch (error) {
              console.error('Erro ao processar arquivo:', error);
              alert('Erro ao processar arquivo');
            } finally {
              setIsImporting(false);
            }
          };
          reader.readAsArrayBuffer(importFile);
        } catch (error) {
          console.error('Erro:', error);
          alert('Erro ao importar equipamentos');
          setIsImporting(false);
        }
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Erro na importacao:', error);
      alert('Erro ao importar equipamentos');
      setIsImporting(false);
    }
  };

  const totalPages = Math.ceil(totalEquipamentos / itemsPerPage);
  const uniqueClientes = Array.from(
    new Set(contratos.map((c) => c.nome_cliente).filter(Boolean))
  ).sort();

  // Filtrar contratos baseado no cliente selecionado
  const contratosDoCliente = selectedCliente
    ? contratos.filter((c) => c.nome_cliente === selectedCliente)
    : contratos;

  // Função para baixar template
  const handleBaixarTemplate = () => {
    try {
      gerarTemplateExcel();
    } catch (error) {
      console.error('Erro ao gerar template:', error);
      alert('Erro ao gerar template');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

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
          <a href="/" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Dashboard</span>}
          </a>

          <a href="/contratos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Contratos</span>}
          </a>

          <a href="/clientes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Clientes</span>}
          </a>

          <a href="/equipamentos" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
            {sidebarOpen && <span>Equipamentos</span>}
          </a>

          <a href="/confirmacoes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Confirmacoes</span>}
          </a>

          <a href="/fotos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Fotos</span>}
          </a>

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
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Equipamentos</h1>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Bem-vindo, <span className="font-semibold text-gray-900">{usuario?.nome || 'Carregando...'}</span></p>
            </div>
          </div>
        </div>

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Equipamentos</h2>
              <div className="flex gap-3">
                {(selectedContrato || selectedCliente || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedContrato('');
                      setSelectedCliente('');
                      setSearchTerm('');
                    }}
                    className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-medium"
                  >
                    Limpar Filtros
                  </button>
                )}
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Importar em Massa
                </button>
                <button
                  onClick={() => handleOpenModal()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Novo Equipamento
                </button>
              </div>
            </div>

            {/* FILTROS */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Contrato</label>
                <select
                  value={selectedContrato}
                  onChange={(e) => setSelectedContrato(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={selectedCliente ? false : false}
                >
                  <option value="">Todos os contratos</option>
                  {contratosDoCliente.map((contrato) => (
                    <option key={contrato.id} value={contrato.id}>
                      {contrato.numero_contrato}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Cliente</label>
                <select
                  value={selectedCliente}
                  onChange={(e) => setSelectedCliente(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os clientes</option>
                  {uniqueClientes.map((cliente) => (
                    <option key={cliente} value={cliente}>
                      {cliente}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por Serie</label>
                <input
                  type="text"
                  placeholder="Digite a serie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* TABELA */}
            {equipamentos.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">Nenhum equipamento encontrado</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Contrato</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">No Serie</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Modelo</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Acoes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {equipamentos.map((equip) => (
                        <tr key={equip.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {equip.contratos?.numero_contrato}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {equip.contratos?.nome_cliente}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {equip.numero_serie}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {equip.modelo}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {equip.sku || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm space-x-2">
                            <button
                              onClick={() => handleOpenModal(equip)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(equip.id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Deletar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* PAGINACAO */}
                {totalPages > 1 && (
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Pagina {currentPage} de {totalPages} (Total: {totalEquipamentos} equipamentos)
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          Proxima
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL NOVO/EDITAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contrato
                </label>
                <select
                  value={formData.contrato_id}
                  onChange={(e) =>
                    setFormData({ ...formData, contrato_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um contrato</option>
                  {contratos.map((contrato) => (
                    <option key={contrato.id} value={contrato.id}>
                      {contrato.numero_contrato} - {contrato.nome_cliente}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  No de Serie
                </label>
                <input
                  type="text"
                  value={formData.numero_serie}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_serie: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo
                </label>
                <input
                  type="text"
                  value={formData.modelo}
                  onChange={(e) =>
                    setFormData({ ...formData, modelo: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isEditing ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTACAO */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Importar Equipamentos</h2>
            </div>
            <div className="p-6 space-y-4">
              {isImporting ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Importando...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">{importProgress}%</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-600 mb-3 font-medium">
                      Passo 1: Baixe o template
                    </p>
                    <button
                      onClick={handleBaixarTemplate}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Baixar Template Excel
                    </button>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-3 font-medium">
                      Passo 2: Selecione o contrato
                    </p>
                    <select
                      value={selectedImportContrato}
                      onChange={(e) => setSelectedImportContrato(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isImporting}
                    >
                      <option value="">Selecione um contrato</option>
                      {contratosDoCliente.length > 0 ? (
                        contratosDoCliente.map((contrato) => (
                          <option key={contrato.id} value={contrato.id}>
                            {contrato.numero_contrato} - {contrato.nome_cliente}
                          </option>
                        ))
                      ) : (
                        contratos.map((contrato) => (
                          <option key={contrato.id} value={contrato.id}>
                            {contrato.numero_contrato} - {contrato.nome_cliente}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-3 font-medium">
                      Passo 3: Selecione o arquivo
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isImporting}
                    />
                    {importFile && (
                      <p className="text-xs text-green-600 mt-2">{importFile.name}</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowImportModal(false);
                        setImportFile(null);
                        setSelectedImportContrato('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      disabled={isImporting}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleImportarEquipamentos}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
                      disabled={!importFile || !selectedImportContrato || isImporting}
                    >
                      {isImporting ? 'Importando...' : 'Importar em Massa'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
