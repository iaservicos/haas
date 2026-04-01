import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";
import { supabase } from '../services/supabase';

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
  const [itemsPerPage] = useState(1000); // 1000 itens por página
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  
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
    carregarEquipamentos();
  }, [selectedContrato, selectedCliente]);

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
        .order('data_criacao', { ascending: false });

      if (selectedContrato) {
        query = query.eq('contrato_id', parseInt(selectedContrato));
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
    if (!formData.contrato_id || !formData.numero_serie || !formData.modelo) {
      alert('Preencha os campos obrigatórios: Contrato, Série e Modelo');
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
            sku: formData.sku || null,
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
            sku: formData.sku || null,
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

              for (let i = 0; i < rows.length; i++) {
                const row: any = rows[i];

                const contratoId = parseInt(row['Contrato ID'] || row['contrato_id'] || 0);
                const numeroSerie = String(row['Nº Série'] || row['numero_serie'] || '').trim();
                const modelo = String(row['Modelo'] || row['modelo'] || '').trim();
                const sku = String(row['SKU'] || row['sku'] || '').trim() || null;

                if (!contratoId || !numeroSerie || !modelo) {
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

  const filteredEquipamentos = equipamentos.filter(
    (equip) =>
      equip.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equip.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginação
  const totalPages = Math.ceil(filteredEquipamentos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEquipamentos = filteredEquipamentos.slice(startIndex, endIndex);

  // Resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredEquipamentos.length]);

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
                  Importar
                </button>
                <button
                  onClick={() => handleOpenModal()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  + Novo Equipamento
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
                >
                  <option value="">Todos os contratos</option>
                  {contratos
                    .filter((contrato) => !selectedCliente || contrato.nome_cliente === selectedCliente)
                    .map((contrato) => (
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
                  {Array.from(new Set(contratos.map(c => c.nome_cliente)))
                    .sort()
                    .map((cliente) => (
                    <option key={cliente} value={cliente}>
                      {cliente}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                <input
                  type="text"
                  placeholder="Buscar por série ou modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>



            {loading ? (
              <p className="text-center text-gray-600">Carregando equipamentos...</p>
            ) : filteredEquipamentos.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600 mb-4">Nenhum equipamento encontrado</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Contrato</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nº Série</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Modelo</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedEquipamentos.map((equipamento) => (
                      <tr key={equipamento.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {equipamento.contratos?.numero_contrato || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {equipamento.contratos?.nome_cliente || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{equipamento.numero_serie}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{equipamento.sku || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{equipamento.modelo}</td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          <button
                            onClick={() => handleOpenModal(equipamento)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(equipamento.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Deletar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* PAGINAÇÃO */}
                {filteredEquipamentos.length > 0 && (
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Mostrando {startIndex + 1} a {Math.min(endIndex, filteredEquipamentos.length)} de {filteredEquipamentos.length} equipamentos
                      </div>
                      <div className="flex gap-2 items-center">
                        {totalPages > 1 && (
                          <>
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          ← Anterior
                        </button>
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-3 py-2 rounded-lg transition ${
                                  currentPage === pageNum
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-gray-300 text-gray-700 hover:bg-white'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          Próxima →
                        </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
              Total: {filteredEquipamentos.length} equipamento(s)
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contrato *
                  </label>
                  <select
                    value={formData.contrato_id}
                    onChange={(e) => setFormData({ ...formData, contrato_id: e.target.value })}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nº de Série *
                  </label>
                  <input
                    type="text"
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Importar Equipamentos</h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportProgress(0);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  disabled={isImporting}
                >
                  ✕
                </button>
              </div>

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
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = '/Template_Importar_Equipamentos.xlsx';
                      link.download = 'Template_Importar_Equipamentos.xlsx';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-medium"
                  >
                    📥 Baixar Template
                  </button>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selecione arquivo Excel
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isImporting}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Use o template fornecido: Template_Importar_Equipamentos.xlsx
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportProgress(0);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={isImporting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportarEquipamentos}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  disabled={!importFile || isImporting}
                >
                  {isImporting ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
