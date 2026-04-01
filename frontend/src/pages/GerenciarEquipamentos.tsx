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

    if (!selectedImportContrato) {
      alert('Selecione um contrato antes de importar');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Carregar XLSX do CDN
      await loadXLSXLibrary();

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const XLSX = (window as any).XLSX;

          if (!XLSX) {
            alert('Biblioteca XLSX não carregou. Tente novamente.');
            setIsImporting(false);
            return;
          }

          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets['Equipamentos'];

          if (!worksheet) {
            alert('Aba "Equipamentos" não encontrada no arquivo');
            setIsImporting(false);
            return;
          }

          const rows = XLSX.utils.sheet_to_json(worksheet);
          let inserted = 0;
          let skipped = 0;
          const contratoId = parseInt(selectedImportContrato);

          for (let i = 0; i < rows.length; i++) {
            const row: any = rows[i];

            // Tentar diferentes nomes de coluna
            const numeroSerie = String(
              row['Nº Série'] || 
              row['No Serie'] || 
              row['numero_serie'] || 
              row['N° Série'] ||
              ''
            ).trim();
            
            const modelo = String(
              row['Modelo'] || 
              row['modelo'] || 
              ''
            ).trim();
            
            const sku = String(
              row['SKU'] || 
              row['sku'] || 
              ''
            ).trim();

            // Validar campos obrigatórios
            if (!numeroSerie || !modelo || !sku) {
              skipped++;
              continue;
            }

            try {
              // Verificar se já existe
              const { data: existing, error: checkError } = await supabase
                .from('contrato_equipamentos')
                .select('id')
                .eq('numero_serie', numeroSerie)
                .single();

              if (existing) {
                skipped++;
              } else if (checkError && checkError.code !== 'PGRST116') {
                // PGRST116 = no rows found (esperado)
                skipped++;
              } else {
                // Inserir novo equipamento
                const { error: insertError } = await supabase
                  .from('contrato_equipamentos')
                  .insert([{
                    contrato_id: contratoId,
                    numero_serie: numeroSerie,
                    modelo: modelo,
                    sku: sku,
                  }]);

                if (insertError) {
                  console.error('Erro ao inserir:', insertError);
                  skipped++;
                } else {
                  inserted++;
                }
              }
            } catch (err) {
              console.error('Erro no loop:', err);
              skipped++;
            }

            // Atualizar progresso
            setImportProgress(Math.round(((i + 1) / rows.length) * 100));
          }

          alert(`✅ Importação concluída!\n\nInseridos: ${inserted}\nIgnorados: ${skipped}`);
          setShowImportModal(false);
          setImportFile(null);
          setSelectedImportContrato('');
          setIsImporting(false);
          carregarEquipamentos();
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          alert('Erro ao processar arquivo Excel');
          setIsImporting(false);
        }
      };

      reader.onerror = () => {
        alert('Erro ao ler arquivo');
        setIsImporting(false);
      };

      reader.readAsArrayBuffer(importFile);
    } catch (error) {
      console.error('Erro geral:', error);
      alert('Erro ao importar equipamentos');
      setIsImporting(false);
    }
  };

  // Função auxiliar para carregar XLSX
  const loadXLSXLibrary = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Se já está carregado, resolver imediatamente
      if ((window as any).XLSX) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        setTimeout(() => {
          if ((window as any).XLSX) {
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

  // Obter clientes únicos
  const clientesUnicos = Array.from(
    new Set(contratos.map((c) => c.nome_cliente).filter(Boolean))
  ) as string[];

  // Filtrar contratos por cliente selecionado
  const contratosDoCliente = selectedCliente
    ? contratos.filter((c) => c.nome_cliente === selectedCliente)
    : contratos;

  const totalPages = Math.ceil(totalEquipamentos / itemsPerPage);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
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

          <a href="/clientes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Clientes</span>}
          </a>

          <a href="/contratos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Contratos</span>}
          </a>

          <a href="/equipamentos" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
            {sidebarOpen && <span>Equipamentos</span>}
          </a>

          <a href="/confirmacoes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Confirmações</span>}
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
            {/* FILTROS */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Filtros</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedContrato('');
                      setSelectedCliente('');
                      setSearchTerm('');
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gray-600 rounded hover:bg-gray-700 transition"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-700 transition"
                  >
                    Novo Equipamento
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition"
                  >
                    Importar em Massa
                  </button>
                  <button
                    onClick={() => gerarTemplateExcel()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded hover:bg-purple-700 transition"
                  >
                    Baixar Template
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
                  <select
                    value={selectedCliente}
                    onChange={(e) => {
                      setSelectedCliente(e.target.value);
                      setSelectedContrato('');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos os Clientes</option>
                    {clientesUnicos.map((cliente) => (
                      <option key={cliente} value={cliente}>
                        {cliente}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contrato</label>
                  <select
                    value={selectedContrato}
                    onChange={(e) => setSelectedContrato(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos os Contratos</option>
                    {contratosDoCliente.map((contrato) => (
                      <option key={contrato.id} value={contrato.id}>
                        {contrato.numero_contrato}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar por Série</label>
                  <input
                    type="text"
                    placeholder="Digite o número de série..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-end">
                  <div className="text-sm text-gray-600">
                    Total: <span className="font-semibold">{totalEquipamentos}</span> equipamentos
                  </div>
                </div>
              </div>
            </div>

            {/* TABELA */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nº Série</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Modelo</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">SKU</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contrato</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cliente</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Data Criação</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {equipamentos.map((equip) => (
                    <tr key={equip.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-900">{equip.numero_serie}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{equip.modelo}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{equip.sku}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{equip.contratos?.numero_contrato}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{equip.contratos?.nome_cliente}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(equip.data_criacao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <button
                          onClick={() => handleOpenModal(equip)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(equip.id)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition"
                        >
                          Deletar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {equipamentos.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600 font-semibold">Nenhum equipamento encontrado</p>
                </div>
              )}
            </div>

            {/* PAGINAÇÃO */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-between items-center">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gray-600 rounded hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gray-600 rounded hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE NOVO/EDITAR EQUIPAMENTO */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contrato *</label>
                <select
                  value={formData.contrato_id}
                  onChange={(e) => setFormData({ ...formData, contrato_id: e.target.value })}
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nº Série *</label>
                <input
                  type="text"
                  value={formData.numero_serie}
                  onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o número de série"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Modelo *</label>
                <input
                  type="text"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o modelo"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">SKU *</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o SKU"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {isEditing ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Importar Equipamentos em Massa</h2>

            {!isImporting ? (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Selecione o Contrato *</label>
                    <select
                      value={selectedImportContrato}
                      onChange={(e) => setSelectedImportContrato(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um contrato</option>
                      {contratosDoCliente.map((contrato) => (
                        <option key={contrato.id} value={contrato.id}>
                          {contrato.numero_contrato} - {contrato.nome_cliente}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Selecione o Arquivo *</label>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {importFile && (
                      <p className="text-sm text-green-600 mt-2">{importFile.name}</p>
                    )}
                  </div>
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
                    Importar em Massa
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 font-semibold mb-4">Importando... {importProgress}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
