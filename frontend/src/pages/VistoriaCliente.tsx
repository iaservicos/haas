import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UploadFoto } from '../components/UploadFoto';
import { ChecklistVistoria } from '../components/ChecklistVistoria';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Função para gerar UUID v4
function generateUUID( ): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const VistoriaCliente: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const numeroSerie = searchParams.get('numero_serie');
  const equipamentoId = searchParams.get('equipamento_id');

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [vistoriaId, setVistoriaId] = useState<string>('');
  const [checklistSalvo, setChecklistSalvo] = useState(false);
  const [confirmacaoData, setConfirmacaoData] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [equipmentType, setEquipmentType] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fotoUploadada, setFotoUploadada] = useState(false);

  useEffect(() => {
    if (numeroSerie && equipamentoId) {
      criarConfirmacao();
      buscarTipoEquipamento();
    }
  }, [numeroSerie, equipamentoId]);

  // Auto-redirect após sucesso
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        navigate('/dashboard-cliente');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal, navigate]);

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

  const criarConfirmacao = () => {
    const novoVistoriaId = generateUUID();
    setVistoriaId(novoVistoriaId);
    
    setConfirmacaoData({
      id: equipamentoId,
      numero_serie: numeroSerie,
      status_analise: 'Pendente',
      resultado_analise: null,
    });
    setFotos([]);
    setChecklistSalvo(false);
  };

  const handleUploadSuccess = (fotoId: string, analise: any) => {
    setFotos([...fotos, { id: fotoId, foto_nome: `Foto ${fotos.length + 1}` }]);
    setFotoUploadada(true);
    // Mostrar modal de sucesso após 2 segundos
    setTimeout(() => {
      setShowSuccessModal(true);
    }, 2000);
  };

  const handleChecklistSave = (confirmacao: any) => {
    console.log('[VistoriaCliente] Checklist salvo com sucesso:', confirmacao);
    setConfirmacaoData(confirmacao);
    setChecklistSalvo(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCancelar = () => {
    navigate('/dashboard-cliente');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* SIDEBAR - MANTÉM O PADRÃO */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col shadow-2xl`}>
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white text-xl"
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
        {/* HEADER - MANTÉM O PADRÃO */}
        <div className="bg-white border-b border-gray-300 px-6 py-4 flex justify-between items-center shadow-lg">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vistoria de Equipamento</h1>
            <p className="text-sm text-gray-600 mt-1">Série: <strong className="text-blue-600">{numeroSerie}</strong></p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* CONTENT - FULL WIDTH */}
        <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-slate-50 to-slate-100">
          {confirmacaoData && equipmentType && vistoriaId ? (
            <div className="w-full space-y-6">
              {/* STEP 1: CHECKLIST */}
              <div className={`w-full rounded-2xl shadow-xl border-l-8 transition-all duration-300 ${
                checklistSalvo 
                  ? 'border-l-green-500 bg-gradient-to-r from-green-50 to-white' 
                  : 'border-l-blue-500 bg-gradient-to-r from-blue-50 to-white'
              }`}>
                <div className="p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-6">
                      <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg ${
                        checklistSalvo 
                          ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' 
                          : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white'
                      }`}>
                        1
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Checklist de Vistoria</h2>
                        <p className="text-gray-600 mt-2">Preencha as informações do equipamento</p>
                      </div>
                    </div>
                    {checklistSalvo && (
                      <div className="flex items-center gap-3 px-6 py-3 bg-green-100 rounded-xl border-2 border-green-300">
                        <span className="text-2xl font-bold text-green-600">✓</span>
                        <span className="font-semibold text-green-700">Concluído</span>
                      </div>
                    )}
                  </div>

                  <ChecklistVistoria
                    confirmacaoId={vistoriaId}
                    equipmentType={equipmentType}
                    equipamentoId={parseInt(equipamentoId || '0')}
                    onChecklistSave={handleChecklistSave}
                  />
                </div>
              </div>

              {/* STEP 2: UPLOAD DE FOTO */}
              <div className={`w-full rounded-2xl shadow-xl border-l-8 transition-all duration-300 ${
                !checklistSalvo
                  ? 'border-l-gray-400 bg-gradient-to-r from-gray-100 to-gray-50 opacity-60'
                  : fotoUploadada
                  ? 'border-l-green-500 bg-gradient-to-r from-green-50 to-white'
                  : 'border-l-amber-500 bg-gradient-to-r from-amber-50 to-white'
              }`}>
                <div className="p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-6">
                      <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg ${
                        !checklistSalvo
                          ? 'bg-gray-300 text-gray-600'
                          : fotoUploadada
                          ? 'bg-gradient-to-br from-green-400 to-green-600 text-white'
                          : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                      }`}>
                        2
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Upload de Foto</h2>
                        <p className="text-gray-600 mt-2">Tire uma foto clara do equipamento para análise IA</p>
                      </div>
                    </div>
                    {fotoUploadada && (
                      <div className="flex items-center gap-3 px-6 py-3 bg-green-100 rounded-xl border-2 border-green-300">
                        <span className="text-2xl font-bold text-green-600">✓</span>
                        <span className="font-semibold text-green-700">Concluído</span>
                      </div>
                    )}
                  </div>

                  {!checklistSalvo ? (
                    <div className="flex items-start gap-4 p-6 bg-amber-100 border-2 border-amber-400 rounded-xl">
                      <span className="text-3xl font-bold text-amber-700 flex-shrink-0">⚠</span>
                      <div>
                        <p className="font-bold text-amber-900 text-lg">Passo anterior necessário</p>
                        <p className="text-amber-800 mt-2">Complete o checklist de vistoria antes de fazer upload de fotos.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-700 mb-6 text-lg">Tire uma foto clara do equipamento. A análise será feita automaticamente.</p>
                      
                      <UploadFoto
                        confirmacaoId={vistoriaId}
                        numeroSerie={numeroSerie || ''}
                        onUploadSuccess={handleUploadSuccess}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex gap-4 justify-end pt-6">
                <button
                  onClick={handleCancelar}
                  className="px-8 py-4 bg-gray-400 hover:bg-gray-500 text-white rounded-xl font-bold text-lg transition-colors shadow-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-300 border-t-blue-600 mx-auto"></div>
                <p className="mt-8 text-gray-700 font-semibold text-lg">Carregando informações do equipamento...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE SUCESSO */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-10 text-center">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-green-300 rounded-full animate-pulse"></div>
                <div className="relative w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-6xl font-bold text-green-600">✓</span>
                </div>
              </div>
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900 mb-3">Importação Resolvida!</h3>
            <p className="text-gray-700 mb-8 text-lg">
              A vistoria foi processada com sucesso. Você será redirecionado em breve.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/dashboard-cliente')}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-xl font-bold text-lg transition-all shadow-lg"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
