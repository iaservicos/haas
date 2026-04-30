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
    <div className="flex h-screen bg-white">
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
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vistoria de Equipamento</h1>
            <p className="text-sm text-gray-600 mt-2">Série: <strong className="text-gray-900">{numeroSerie}</strong></p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* CONTENT - FULL WIDTH */}
        <div className="flex-1 overflow-auto p-8 bg-white">
          {confirmacaoData && equipmentType && vistoriaId ? (
            <div className="w-full space-y-8">
              {/* STEP 1: CHECKLIST */}
              <div className={`w-full rounded-none border-t-4 transition-all duration-300 ${
                checklistSalvo 
                  ? 'border-t-green-600 bg-white' 
                  : 'border-t-gray-900 bg-white'
              }`}>
                <div className="p-0 pt-8">
                  <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-200">
                    <div className="flex items-center gap-8">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-none flex items-center justify-center font-bold text-xl ${
                        checklistSalvo 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-900 text-white'
                      }`}>
                        1
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Checklist de Vistoria</h2>
                        <p className="text-gray-600 mt-1">Preencha as informações do equipamento</p>
                      </div>
                    </div>
                    {checklistSalvo && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-600">✓</span>
                        <span className="text-sm font-bold text-green-600 uppercase tracking-wide">Concluído</span>
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
              <div className={`w-full rounded-none border-t-4 transition-all duration-300 ${
                !checklistSalvo
                  ? 'border-t-gray-300 bg-white opacity-50'
                  : fotoUploadada
                  ? 'border-t-green-600 bg-white'
                  : 'border-t-gray-900 bg-white'
              }`}>
                <div className="p-0 pt-8">
                  <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-200">
                    <div className="flex items-center gap-8">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-none flex items-center justify-center font-bold text-xl ${
                        !checklistSalvo
                          ? 'bg-gray-300 text-gray-600'
                          : fotoUploadada
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-900 text-white'
                      }`}>
                        2
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Upload de Foto</h2>
                        <p className="text-gray-600 mt-1">Tire uma foto clara do equipamento para análise IA</p>
                      </div>
                    </div>
                    {fotoUploadada && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-green-600">✓</span>
                        <span className="text-sm font-bold text-green-600 uppercase tracking-wide">Concluído</span>
                      </div>
                    )}
                  </div>

                  {!checklistSalvo ? (
                    <div className="flex items-start gap-4 p-6 bg-gray-100 border border-gray-300 rounded-none">
                      <span className="text-2xl font-bold text-gray-700 flex-shrink-0">⚠</span>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">Passo anterior necessário</p>
                        <p className="text-gray-700 mt-2">Complete o checklist de vistoria antes de fazer upload de fotos.</p>
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
              <div className="flex gap-4 justify-end pt-8 border-t border-gray-200">
                <button
                  onClick={handleCancelar}
                  className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-none font-bold text-lg transition-colors uppercase tracking-wide"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
                <p className="mt-8 text-gray-700 font-semibold text-lg">Carregando informações do equipamento...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE SUCESSO */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-none shadow-2xl max-w-md w-full p-12 text-center border-t-4 border-t-green-600">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-green-600 rounded-none flex items-center justify-center">
                <span className="text-5xl font-bold text-white">✓</span>
              </div>
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900 mb-4 uppercase tracking-wide">Importação Resolvida!</h3>
            <p className="text-gray-700 mb-8 text-lg">
              A vistoria foi processada com sucesso. Você será redirecionado em breve.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/dashboard-cliente')}
                className="flex-1 px-6 py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-none font-bold text-lg transition-colors uppercase tracking-wide"
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
