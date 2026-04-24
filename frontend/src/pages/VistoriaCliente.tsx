import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { UploadFoto } from '../components/UploadFoto';
import { ChecklistVistoria } from '../components/ChecklistVistoria';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const VistoriaCliente: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const numeroSerie = searchParams.get('numero_serie');
  const equipamentoId = searchParams.get('equipamento_id');

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [vistoriaId, setVistoriaId] = useState<string>('');
  const [equipmentType, setEquipmentType] = useState<string>('');
  const [fotos, setFotos] = useState<any[]>([]);
  const [analiseResultado, setAnaliseResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');
  
  // Estados para controlar o fluxo
  const [checklistSalvo, setChecklistSalvo] = useState(false);
  const [fotoObrigatoria, setFotoObrigatoria] = useState(false);

  useEffect(() => {
    if (numeroSerie && equipamentoId) {
      buscarTipoEquipamento();
    }
  }, [numeroSerie, equipamentoId]);

  const buscarTipoEquipamento = async () => {
    try {
      console.log('[VistoriaCliente] Buscando tipo de equipamento para ID:', equipamentoId);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inspecao/equipamento/${equipamentoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const tipoEquipamento = result.data?.tipo_material;
        
        console.log('[VistoriaCliente] Tipo de equipamento encontrado:', tipoEquipamento);
        
        if (tipoEquipamento) {
          setEquipmentType(tipoEquipamento);
        }
      } else {
        console.error('[VistoriaCliente] Erro ao buscar tipo de equipamento:', response.status);
      }
    } catch (error) {
      console.error('[VistoriaCliente] Erro ao buscar tipo de equipamento:', error);
    }
  };

  /**
   * Chamado quando o checklist é salvo
   * Cria o registro em inspecao_respostas e obtém o vistoria_id
   */
  const handleChecklistSave = async (checklistData: any) => {
    try {
      setLoading(true);
      console.log('[VistoriaCliente] Salvando checklist...', checklistData);

      // Gerar UUID para vistoria_id
      const novoVistoriaId = generateUUID();
      console.log('[VistoriaCliente] vistoria_id gerado:', novoVistoriaId);

      // Criar registro em inspecao_respostas
      const { data, error } = await supabase
        .from('inspecao_respostas')
        .insert({
          vistoria_id: novoVistoriaId,
          equipment_type: equipmentType,
          respostas: checklistData.answers || {},
          observacoes: checklistData.observacoes || null,
          equipamento_id: parseInt(equipamentoId || '0'),
          data_inspecao: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error('[VistoriaCliente] Erro ao salvar checklist:', error);
        throw error;
      }

      console.log('[VistoriaCliente] Checklist salvo com sucesso:', data);

      // Salvar vistoria_id para uso no upload de fotos
      setVistoriaId(novoVistoriaId);
      setChecklistSalvo(true);
      setFotoObrigatoria(true);
      setErro('');

      // Mostrar mensagem de sucesso
      alert('✅ Checklist salvo com sucesso! Agora faça upload das fotos.');
    } catch (error) {
      console.error('[VistoriaCliente] Erro ao salvar checklist:', error);
      setErro('Erro ao salvar checklist. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Chamado quando uma foto é enviada com sucesso
   */
  const handleUploadSuccess = (fotoId: string, analise: any) => {
    console.log('[VistoriaCliente] Upload bem-sucedido. Foto ID:', fotoId);
    setAnaliseResultado(analise);
    setFotos([...fotos, { id: fotoId, foto_nome: `Foto ${fotos.length + 1}` }]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCancelar = () => {
    navigate('/dashboard-cliente');
  };

  /**
   * Finalizar vistoria (após fotos obrigatórias)
   */
  const handleFinalizarVistoria = () => {
    if (fotos.length === 0) {
      setErro('⚠️ Você precisa fazer upload de pelo menos uma foto!');
      return;
    }

    alert('✅ Vistoria finalizada com sucesso!');
    navigate('/dashboard-cliente');
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
            onClick={() => navigate('/dashboard-cliente')}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-blue-600 rounded transition"
          >
            {sidebarOpen && <span>Dashboard</span>}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-red-600 rounded transition"
          >
            {sidebarOpen && <span>Sair</span>}
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vistoria de Equipamento</h1>
            <p className="text-sm text-gray-600">Número de Série: <strong>{numeroSerie}</strong></p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          {erro && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {erro}
            </div>
          )}

          {equipmentType ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* STEP 1: CHECKLIST (OBRIGATÓRIO PRIMEIRO) */}
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    1️⃣ Checklist de Vistoria {checklistSalvo && '✅'}
                  </h2>
                  {checklistSalvo && (
                    <span className="text-green-600 font-semibold">Concluído</span>
                  )}
                </div>

                {!checklistSalvo ? (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Preencha o checklist abaixo. Este é o primeiro passo obrigatório.
                    </p>
                    <ChecklistVistoria
                      confirmacaoId=""  // Não precisa de ID ainda
                      equipmentType={equipmentType}
                      equipamentoId={parseInt(equipamentoId || '0')}
                      onChecklistSave={handleChecklistSave}
                    />
                  </>
                ) : (
                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <p className="text-green-700">
                      ✅ Checklist salvo com sucesso! Você pode agora fazer upload das fotos.
                    </p>
                  </div>
                )}
              </div>

              {/* STEP 2: UPLOAD DE FOTOS (HABILITADO APÓS CHECKLIST) */}
              {checklistSalvo && (
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-600">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      2️⃣ Upload de Fotos {fotos.length > 0 && '✅'}
                    </h2>
                    {fotos.length > 0 && (
                      <span className="text-green-600 font-semibold">{fotos.length} foto(s)</span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    📸 Tire fotos claras do equipamento. <strong>Mínimo 1 foto obrigatória.</strong>
                  </p>
                  
                  <UploadFoto
                    confirmacaoId={vistoriaId}
                    numeroSerie={numeroSerie || ''}
                    equipmentType={equipmentType}
                    nomeCliente="Cliente"
                    onUploadSuccess={handleUploadSuccess}
                  />

                  {/* RESULTADO DA ANÁLISE */}
                  {analiseResultado && (
                    <div className="mt-6 bg-blue-50 p-4 rounded border border-blue-200">
                      <h3 className="text-sm font-semibold text-blue-900 mb-2">Resultado da Análise:</h3>
                      <p className="text-sm text-blue-700">
                        <strong>Status:</strong> {analiseResultado.status}
                      </p>
                      <p className="text-sm text-blue-700">
                        <strong>Resultado:</strong> {analiseResultado.resultado === 'ok' ? '✓ OK' : '✗ Problema'}
                      </p>
                      <p className="text-sm text-blue-700">
                        <strong>Descrição:</strong> {analiseResultado.descricao}
                      </p>
                    </div>
                  )}

                  {/* FOTOS ENVIADAS */}
                  {fotos.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Fotos Enviadas:</h3>
                      <div className="grid grid-cols-4 gap-4">
                        {fotos.map((foto, idx) => (
                          <div key={idx} className="bg-gray-100 rounded-lg p-4 text-center">
                            <div className="w-full h-24 bg-gray-300 rounded mb-2 flex items-center justify-center">
                              <span className="text-gray-600 text-sm">Foto {idx + 1}</span>
                            </div>
                            <p className="text-xs text-gray-600">{foto.foto_nome}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: BOTÕES DE AÇÃO */}
              {checklistSalvo && (
                <div className="flex gap-4 justify-end">
                  <button
                    onClick={handleCancelar}
                    className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleFinalizarVistoria}
                    disabled={fotos.length === 0}
                    className={`px-6 py-2 rounded-lg font-semibold transition ${
                      fotos.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    ✅ Finalizar Vistoria
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando informações do equipamento...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Função para gerar UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
