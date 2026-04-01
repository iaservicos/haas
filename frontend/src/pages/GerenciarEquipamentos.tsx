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

// ========== FUNÇÃO PARA GERAR TEMPLATE EXCEL ==========
const gerarTemplateExcel = () => {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js';
  
  script.onload = () => {
    const XLSX = (window as any).XLSX;
    const workbook = XLSX.utils.book_new();
    
    // ========== ABA 1: EQUIPAMENTOS ==========
    const equipamentosData: any[] = [
      {
        'Contrato ID': 1,
        'Número Contrato': '2000264954',
        'Cliente': 'CLARO SA',
        'Nº Série': 'SN001',
        'Modelo': 'Modelo A',
        'SKU': 'SKU001'
      },
      {
        'Contrato ID': 1,
        'Número Contrato': '2000264954',
        'Cliente': 'CLARO SA',
        'Nº Série': 'SN002',
        'Modelo': 'Modelo B',
        'SKU': 'SKU002'
      },
      {
        'Contrato ID': 2,
        'Número Contrato': '2000420465',
        'Cliente': 'TECCHAPECO SISTEMAS LTDA',
        'Nº Série': 'SN003',
        'Modelo': 'Modelo C',
        'SKU': ''
      }
    ];
    
    // Adicionar 100 linhas vazias
    for (let i = 0; i < 100; i++) {
      equipamentosData.push({
        'Contrato ID': '',
        'Número Contrato': '',
        'Cliente': '',
        'Nº Série': '',
        'Modelo': '',
        'SKU': ''
      });
    }
    
    const equipamentosSheet = XLSX.utils.json_to_sheet(equipamentosData);
    equipamentosSheet['!cols'] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 }
    ];
    
    // Formatar cabeçalho
    const headerRange = XLSX.utils.decode_range(equipamentosSheet['!ref'] || 'A1');
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!equipamentosSheet[address]) continue;
      
      equipamentosSheet[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '3B82F6' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
    
    XLSX.utils.book_append_sheet(workbook, equipamentosSheet, 'Equipamentos');
    
    // ========== ABA 2: INSTRUÇÕES ==========
    const instrucoesData = [
      ['INSTRUÇÕES DE PREENCHIMENTO'],
      [''],
      ['COLUNAS OBRIGATÓRIAS:'],
      ['• Contrato ID: ID numérico do contrato (obrigatório)'],
      ['• Nº Série: Número de série do equipamento (obrigatório)'],
      ['• Modelo: Modelo do equipamento (obrigatório)'],
      [''],
      ['COLUNAS OPCIONAIS:'],
      ['• Número Contrato: Número do contrato (informativo)'],
      ['• Cliente: Nome do cliente (informativo)'],
      ['• SKU: Código SKU do equipamento (opcional)'],
      [''],
      ['REGRAS:'],
      ['1. Não deixe campos obrigatórios em branco'],
      ['2. Não modifique o nome das colunas'],
      ['3. Não adicione novas colunas'],
      ['4. Use apenas a aba "Equipamentos"'],
      ['5. Equipamentos duplicados (mesma série) serão ignorados'],
      [''],
      ['EXEMPLO:'],
      ['Contrato ID | Nº Série | Modelo | SKU'],
      ['1 | SN001 | Modelo A | SKU001'],
      ['1 | SN002 | Modelo B | SKU002'],
      ['2 | SN003 | Modelo C | (deixar em branco)'],
    ];
    
    const instrucoesSheet = XLSX.utils.aoa_to_sheet(instrucoesData);
    instrucoesSheet['!cols'] = [{ wch: 80 }];
    
    instrucoesSheet['A1'].s = {
      font: { bold: true, size: 14, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F2937' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
    
    XLSX.utils.book_append_sheet(workbook, instrucoesSheet, 'Instruções');
    
    // Gerar arquivo
    const nomeArquivo = `Template_Importar_Equipamentos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);
  };
  
  document.head.appendChild(script);
};

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

  useEffect(() => {
    carregarEquipamentos();
  }, [selectedContrato, selectedCliente]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      const { data: contratosData, error: contratosError } = await supabase
        .from('contratos')
        .select('id, numero_contrato, nome_cliente')
        .order('numero_contrato', { ascending: true });

      if (contratosError) throw contratosError;
      setContratos(contratosData || []);

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
      
      let normalizedData = (data || []).map((equip: any) => ({
        ...equip,
        contratos: Array.isArray(equip.contratos) ? equip.contratos[0] : equip.contratos
      }));
      
      let filteredData = normalizedData;
      if (selectedCliente) {
        filteredData = filteredData.filter(
          (equip) => equip.contratos?.nome_cliente?.trim() === selectedCliente?.trim()
        );
      }
      
      setEquipamentos(filteredData as Equipamento[]);
      setCurrentPage(1);
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
                alert('Aba "Equipamentos" não encontrada no arquivo');
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

              alert(`Importação concluída!\nInseridos: ${inserted}\nIgnorados: ${skipped}`);
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
      console.error('Erro na importação:', error);
      alert('Erro ao importar equipamentos');
      setIsImporting(false);
    }
  };

  // Calcular paginação
  const filteredEquipamentos = equipamentos;
  const totalPages = Math.ceil(filteredEquipamentos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEquipamentos = filteredEquipamentos.slice(startIndex, startIndex + itemsPerPage);

  // Obter clientes únicos
  const clientesUnicos = Array.from(
    new Set(equipamentos.map((e) => e.contratos?.nome_cliente).filter(Boolean))
  ).sort() as string[];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-blue-600 text-white transition-all duration-300`}>
        <div className="p-4">
          <h1 className={`font-bold ${sidebarOpen ? 'text-xl' : 'text-xs'}`}>HaaS Portal</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Equipamentos</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Importar
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              + Novo Equipamento
            </button>
            {(selectedContrato || selectedCliente || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedContrato('');
                  setSelectedCliente('');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow p-4 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Filtrar por Contrato</label>
            <select
              value={selectedContrato}
              onChange={(e) => {
                setSelectedContrato(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todos os contratos</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero_contrato}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Filtrar por Cliente</label>
            <select
              value={selectedCliente}
              onChange={(e) => {
                setSelectedCliente(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todos os clientes</option>
              {clientesUnicos.map((cliente) => (
                <option key={cliente} value={cliente}>
                  {cliente}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Buscar por série ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full bg-white shadow rounded">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">Contrato</th>
                <th className="px-4 py-2 text-left">Cliente</th>
                <th className="px-4 py-2 text-left">Nº Série</th>
                <th className="px-4 py-2 text-left">SKU</th>
                <th className="px-4 py-2 text-left">Modelo</th>
                <th className="px-4 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEquipamentos.map((equip) => (
                <tr key={equip.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{equip.contratos?.numero_contrato}</td>
                  <td className="px-4 py-2">{equip.contratos?.nome_cliente}</td>
                  <td className="px-4 py-2">{equip.numero_serie}</td>
                  <td className="px-4 py-2">{equip.sku || '-'}</td>
                  <td className="px-4 py-2">{equip.modelo}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button
                      onClick={() => handleOpenModal(equip)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(equip.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredEquipamentos.length > 0 && (
          <div className="bg-white shadow p-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredEquipamentos.length)} de {filteredEquipamentos.length} equipamentos
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages)
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-2">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded ${
                        currentPage === page ? 'bg-blue-500 text-white' : ''
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal - Novo/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-xl font-bold mb-4">
              {isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Contrato *</label>
                <select
                  value={formData.contrato_id}
                  onChange={(e) => setFormData({ ...formData, contrato_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
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
                <label className="block text-sm font-medium mb-1">Nº de Série *</label>
                <input
                  type="text"
                  value={formData.numero_serie}
                  onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Modelo *</label>
                <input
                  type="text"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Importar */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-xl font-bold mb-4">Importar Equipamentos</h3>

            {/* NOVO: Seção para baixar template */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <p className="text-sm font-medium mb-3">📥 <strong>Passo 1:</strong> Baixe o template</p>
              <button
                onClick={gerarTemplateExcel}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium"
              >
                📥 Baixar Template Excel
              </button>
            </div>

            <hr className="my-4" />

            {/* Seção de arquivo */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-3">📋 <strong>Passo 2:</strong> Preencha e selecione o arquivo</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full border rounded px-3 py-2"
              />
              {importFile && <p className="text-sm text-green-600 mt-2">✓ {importFile.name}</p>}
            </div>

            {/* Barra de progresso */}
            {isImporting && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Importando... {importProgress}%</p>
                <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                disabled={isImporting}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportarEquipamentos}
                disabled={isImporting || !importFile}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {isImporting ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
