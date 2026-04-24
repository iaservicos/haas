import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UploadFoto } from '../components/UploadFoto';
import { ChecklistVistoria } from '../components/ChecklistVistoria';
import { supabase } from '../services/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Função para gerar UUID v4
function generateUUID(): string {
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
  const [confirmacaoId, setConfirmacaoId] = useState<string>(''); // ✅ NOVO: ID real da confirmacao
  const [confirmacaoData, setConfirmacaoData] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [analiseResultado, setAnaliseResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [equipmentType, setEquipmentType] = useState<string>('');

  useEffect(() => {
    if (numeroSerie && equipamentoId) {
      criarConfirmacao();
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

  // ✅ NOVO: Criar confirmacao no banco de dados
  const criarConfirmacao = async () => {
    try {
      setLoading(true);
      console.log('[VistoriaCliente] Criando confirmacao...');

      // Gerar um UUID único para esta vistoria
      const novoVistoriaId = generateUUID();
      setVistoriaId(novoVistoriaId);

      // ✅ NOVO: Criar registro na tabela cliente_confirmacoes
      const { data, error } = await supabase
        .from('cliente_confirmacoes')
        .insert([
          {
            id: novoVistoriaId, // Usar o UUID gerado como ID
            equipamento_id: parseInt(equipamentoId || '0'),
            numero_serie: numeroSerie,
            status: 'Pendente',
            data_criacao: new Date().toISOString(),
          }
        ])
        .select();

      if (error) {
        console.error('[VistoriaCliente] Erro ao criar confirmacao:', error);
        setErro('Erro ao iniciar a vistoria. Tente novamente.');
        throw error;
      }

      console.log('[VistoriaCliente] Confirmacao criada com sucesso:', data);

      // ✅ NOVO: Usar o ID real da confirmacao
      setConfirmacaoId(novoVistoriaId);

      setConfirmacaoData({
        id: equipamentoId,
        numero_serie: numeroSerie,
        status_analise: 'Pendente',
        resultado_analise: null,
      });
      setFotos([]);
      setLoading(false);
    } catch (error) {
      console.error('[VistoriaCliente] Erro ao criar confirmacao:', error);
      setErro('Erro ao iniciar a vistoria. Tente novamente.');
      setLoading(false);
    }
  };

  const handleUploadSuccess = (fotoId: string, analise: any) => {
    setAnaliseResultado(analise);
    setFotos([...fotos, { id: fotoId, foto_nome: `Foto ${fotos.length + 1}` }]);
  };

  const handleChecklistSave = (confirmacao: any) => {
    setConfirmacaoData(confirmacao);
    alert('Vistoria salva com sucesso!');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCancelar = () => {
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">{erro}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Iniciando vistoria...</p>
              </div>
            </div>
          ) : confirmacaoData && equipmentType && confirmacaoId ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* CARD: UPLOAD DE FOTO */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload de Foto</h2>
                <p className="text-sm text-gray-600 mb-4">Tire uma foto clara do equipamento. A análise será feita automaticamente.</p>
                
                <UploadFoto
                  confirmacaoId={confirmacaoId} {/* ✅ NOVO: Usar ID real */}
                  numeroSerie={numeroSerie || ''}
                  equipmentType={equipmentType}
                  nomeCliente="Cliente"
                  onUploadSuccess={handleUploadSuccess}
                />
              </div>

              {/* CARD: RESULTADO DA ANÁLISE */}
              {analiseResultado && (
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultado da Análise IA</h2>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600 uppercase">Status</p>
                      <p className="text-lg font-semibold text-gray-900">{analiseResultado.status}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600 uppercase">Resultado</p>
                      <p className={`text-lg font-semibold ${analiseResultado.resultado === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                        {analiseResultado.resultado === 'ok' ? '✓ OK' : '✗ Problema'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <p className="text-xs text-gray-600 uppercase">Timestamp</p>
                      <p className="text-sm text-gray-900">{new Date(analiseResultado.timestamp).toLocaleTimeString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <p className="text-sm text-gray-700"><strong>Análise:</strong> {analiseResultado.descricao}</p>
                  </div>
                </div>
              )}

              {/* CARD: FOTOS ENVIADAS */}
              {fotos.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Fotos Enviadas ({fotos.length})</h2>
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

              {/* CARD: CHECKLIST */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Checklist de Vistoria</h2>
                <ChecklistVistoria
                  confirmacaoId={confirmacaoId} {/* ✅ NOVO: Usar ID real */}
                  equipmentType={equipmentType}
                  equipamentoId={parseInt(equipamentoId || '0')}
                  onChecklistSave={handleChecklistSave}
                />
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex gap-4 justify-end">
                <button
                  onClick={handleCancelar}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
                >
                  Cancelar
                </button>
              </div>
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
