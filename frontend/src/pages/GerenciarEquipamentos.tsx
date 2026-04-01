import { useState } from "react";
import { toast } from "sonner";

interface Equipment {
  id: number;
  contractId: number;
  serialNumber: string;
  model: string;
  sku: string | null;
  status: string;
  createdAt: string | Date;
  contractNumber: string;
  clientName: string;
}

interface PaginatedResponse {
  items: Equipment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function GerenciarEquipamentos() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContrato, setSelectedContrato] = useState<string>("");
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedImportContrato, setSelectedImportContrato] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const [formData, setFormData] = useState({
    contractId: "",
    serialNumber: "",
    model: "",
    sku: "",
  });

  // TODO: Integrar com sua API/tRPC
  const [equipmentData, setEquipmentData] = useState<PaginatedResponse>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 1000,
    totalPages: 0,
  });
  const [contracts, setContracts] = useState<any[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      contractId: "",
      serialNumber: "",
      model: "",
      sku: "",
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleOpenModal = (equipment?: Equipment) => {
    if (equipment) {
      setIsEditing(true);
      setEditingId(equipment.id);
      setFormData({
        contractId: equipment.contractId.toString(),
        serialNumber: equipment.serialNumber,
        model: equipment.model,
        sku: equipment.sku || "",
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.contractId || !formData.serialNumber || !formData.model) {
      toast.error("Preencha os campos obrigatorios");
      return;
    }

    try {
      // TODO: Chamar sua API/tRPC para criar ou atualizar
      if (isEditing && editingId) {
        // await updateMutation.mutateAsync({...})
        toast.success("Equipamento atualizado com sucesso!");
      } else {
        // await createMutation.mutateAsync({...})
        toast.success("Equipamento criado com sucesso!");
      }
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este equipamento?")) {
      return;
    }
    try {
      // TODO: Chamar sua API/tRPC para deletar
      toast.success("Equipamento deletado com sucesso!");
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const gerarTemplateExcel = () => {
    try {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js";

      script.onload = ( ) => {
        setTimeout(() => {
          const XLSX = (window as any).XLSX;
          if (!XLSX) {
            toast.error("Erro ao carregar biblioteca");
            return;
          }

          const workbook = XLSX.utils.book_new();

          const equipamentosData: any[] = [
            {
              "No Serie": "SN001",
              "Modelo": "Modelo A",
              "SKU": "SKU001",
            },
            {
              "No Serie": "SN002",
              "Modelo": "Modelo B",
              "SKU": "SKU002",
            },
          ];

          for (let i = 0; i < 100; i++) {
            equipamentosData.push({
              "No Serie": "",
              "Modelo": "",
              "SKU": "",
            });
          }

          const equipamentosSheet = XLSX.utils.json_to_sheet(equipamentosData);
          equipamentosSheet["!cols"] = [
            { wch: 20 },
            { wch: 20 },
            { wch: 15 },
          ];

          const headerRange = XLSX.utils.decode_range(equipamentosSheet["!ref"] || "A1");
          for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
            const address = XLSX.utils.encode_col(C) + "1";
            if (!equipamentosSheet[address]) continue;

            equipamentosSheet[address].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "3B82F6" } },
              alignment: { horizontal: "center", vertical: "center" },
            };
          }

          XLSX.utils.book_append_sheet(workbook, equipamentosSheet, "Equipamentos");

          const instrucoesData = [
            ["INSTRUCOES DE PREENCHIMENTO"],
            [""],
            ["COLUNAS OBRIGATORIAS:"],
            ["- No Serie: Numero de serie do equipamento (obrigatorio)"],
            ["- Modelo: Modelo do equipamento (obrigatorio)"],
            [""],
            ["COLUNAS OPCIONAIS:"],
            ["- SKU: Codigo SKU do equipamento (opcional)"],
            [""],
            ["FLUXO:"],
            ["1. Preencha as colunas: No Serie, Modelo e SKU (opcional)"],
            ["2. Nao deixe campos obrigatorios em branco"],
            ["3. Nao modifique o nome das colunas"],
            ["4. Nao adicione novas colunas"],
            ["5. Use apenas a aba Equipamentos"],
            ["6. Ao importar, selecione o contrato para vincular todos os equipamentos"],
            ["7. Equipamentos duplicados (mesma serie) serao ignorados"],
          ];

          const instrucoesSheet = XLSX.utils.aoa_to_sheet(instrucoesData);
          instrucoesSheet["!cols"] = [{ wch: 80 }];

          instrucoesSheet["A1"].s = {
            font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "1F2937" } },
            alignment: { horizontal: "left", vertical: "center" },
          };

          XLSX.utils.book_append_sheet(workbook, instrucoesSheet, "Instrucoes");

          const nomeArquivo = `Template_Importar_Equipamentos_${new Date().toISOString().split("T")[0]}.xlsx`;
          XLSX.writeFile(workbook, nomeArquivo);
          toast.success("Template baixado com sucesso!");
        }, 100);
      };

      script.onerror = () => {
        toast.error("Erro ao carregar biblioteca");
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error("Erro ao gerar template:", error);
      toast.error("Erro ao gerar template");
    }
  };

  const handleImportarEquipamentos = async () => {
    if (!importFile) {
      toast.error("Selecione um arquivo para importar");
      return;
    }

    if (!selectedImportContrato) {
      toast.error("Selecione um contrato antes de importar");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js";
      script.onload = async ( ) => {
        try {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const data = e.target?.result as ArrayBuffer;
              const XLSX = (window as any).XLSX;

              const workbook = XLSX.read(data, { type: "array" });
              const worksheet = workbook.Sheets["Equipamentos"];

              if (!worksheet) {
                toast.error('Aba "Equipamentos" nao encontrada no arquivo');
                setIsImporting(false);
                return;
              }

              const rows = XLSX.utils.sheet_to_json(worksheet);
              const equipments: any[] = [];

              for (let i = 0; i < rows.length; i++) {
                const row: any = rows[i];
                const numeroSerie = String(row["No Serie"] || row["numero_serie"] || "").trim();
                const modelo = String(row["Modelo"] || row["modelo"] || "").trim();
                const sku = String(row["SKU"] || row["sku"] || "").trim() || undefined;

                if (numeroSerie && modelo) {
                  equipments.push({
                    serialNumber: numeroSerie,
                    model: modelo,
                    sku: sku,
                  });
                }

                setImportProgress(Math.round(((i + 1) / rows.length) * 100));
              }

              if (equipments.length === 0) {
                toast.error("Nenhum equipamento valido encontrado no arquivo");
                setIsImporting(false);
                return;
              }

              // TODO: Chamar sua API/tRPC para importar em massa
              // await bulkImportMutation.mutateAsync({
              //   contractId: parseInt(selectedImportContrato),
              //   equipments,
              // });

              toast.success(`Importacao concluida! ${equipments.length} equipamentos processados`);
              setShowImportModal(false);
              setImportFile(null);
              setSelectedImportContrato("");
              setIsImporting(false);
              setImportProgress(0);
            } catch (error) {
              console.error("Erro ao processar arquivo:", error);
              toast.error("Erro ao processar arquivo");
              setIsImporting(false);
            }
          };
          reader.readAsArrayBuffer(importFile);
        } catch (error) {
          console.error("Erro:", error);
          toast.error("Erro ao importar equipamentos");
          setIsImporting(false);
        }
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error("Erro na importacao:", error);
      toast.error("Erro ao importar equipamentos");
      setIsImporting(false);
    }
  };

  const uniqueClientes = Array.from(
    new Set(contracts.map((c) => c.clientName))
  ).sort();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Equipamentos</h1>
            <p className="text-gray-600 mt-2">Gerenciar equipamentos por contrato</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium"
            >
              Importar em Massa
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Novo Equipamento
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Contrato
            </label>
            <select
              value={selectedContrato}
              onChange={(e) => {
                setSelectedContrato(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os contratos</option>
              {contracts.map((contrato) => (
                <option key={contrato.id} value={contrato.id}>
                  {contrato.contractNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Cliente
            </label>
            <select
              value={selectedCliente}
              onChange={(e) => {
                setSelectedCliente(e.target.value);
                setCurrentPage(1);
              }}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Buscar por serie..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tabela */}
        {equipmentLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Carregando equipamentos...</p>
          </div>
        ) : equipmentData.items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Nenhum equipamento encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Contrato
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      No Serie
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Modelo
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {equipmentData.items.map((equip) => (
                    <tr key={equip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {equip.contractNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {equip.clientName}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {equip.serialNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {equip.model}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {equip.sku || "-"}
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

            {/* Paginacao */}
            {equipmentData.totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Pagina {equipmentData.page} de {equipmentData.totalPages} (Total: {equipmentData.total} equipamentos)
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
                      onClick={() => setCurrentPage(Math.min(equipmentData.totalPages, currentPage + 1))}
                      disabled={currentPage === equipmentData.totalPages}
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

      {/* Modal Novo/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? "Editar Equipamento" : "Novo Equipamento"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contrato
                </label>
                <select
                  value={formData.contractId}
                  onChange={(e) =>
                    setFormData({ ...formData, contractId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um contrato</option>
                  {contracts.map((contrato) => (
                    <option key={contrato.id} value={contrato.id}>
                      {contrato.contractNumber}
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
                  value={formData.serialNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, serialNumber: e.target.value })
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
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
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
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isEditing ? "Atualizar" : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importacao */}
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
                      onClick={gerarTemplateExcel}
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
                      {contracts.map((contrato) => (
                        <option key={contrato.id} value={contrato.id}>
                          {contrato.contractNumber} - {contrato.clientName}
                        </option>
                      ))}
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
                        setSelectedImportContrato("");
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
                      {isImporting ? "Importando..." : "Importar em Massa"}
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
