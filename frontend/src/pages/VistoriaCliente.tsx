import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UploadFoto } from '../components/UploadFoto';
import { ChecklistVistoria } from '../components/ChecklistVistoria';

export const VistoriaCliente: React.FC = () => {
  const [searchParams] = useSearchParams();
  const numeroSerie = searchParams.get('numero_serie');
  const equipamentoId = searchParams.get('equipamento_id');

  const [confirmacaoId, setConfirmacaoId] = useState<string>('');
  const [confirmacaoData, setConfirmacaoData] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');

  // Carregar confirmação quando a página abrir
  useEffect(() => {
    if (numeroSerie && equipamentoId) {
      buscarOuCriarConfirmacao();
    }
  }, [numeroSerie, equipamentoId]);

  const buscarOuCriarConfirmacao = async () => {
    setLoading(true);
    setErro('');

    try {
      // Primeiro, tenta buscar uma confirmação existente para este equipamento
      const response = await fetch(`/api/vistorias/confirmacao/${equipamentoId}`);

      if (response.ok) {
        const data = await response.json();
        setConfirmacaoId(equipamentoId!);
        setConfirmacaoData(data.confirmacao);
        setFotos(data.fotos || []);
      } else {
        // Se não encontrar, cria uma nova confirmação
        criarNovaConfirmacao();
      }
    } catch (err) {
      console.error('Erro ao buscar confirmação:', err);
      criarNovaConfirmacao();
    } finally {
      setLoading(false);
    }
  };

  const criarNovaConfirmacao = () => {
    // Criar um objeto de confirmação temporário
    setConfirmacaoId(equipamentoId!);
    setConfirmacaoData({
      id: equipamentoId,
      numero_serie: numeroSerie,
      equipamento_id: equipamentoId,
      status_analise: 'Pendente',
      resultado_analise: null,
    });
    setFotos([]);
  };

  const handleUploadSuccess = (fotoId: string, analise: any) => {
    alert(`Foto enviada com sucesso! ID: ${fotoId}`);
    // Recarregar fotos
    buscarOuCriarConfirmacao();
  };

  const handleChecklistSave = (confirmacao: any) => {
    setConfirmacaoData(confirmacao);
    alert('Checklist salvo com sucesso!');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Vistoria de Equipamento</h1>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>Carregando...</div>
        </div>
      ) : confirmacaoData ? (
        <>
          <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <h3>Dados do Equipamento</h3>
            <p><strong>Número de Série:</strong> {confirmacaoData.numero_serie || numeroSerie}</p>
            <p><strong>ID do Equipamento:</strong> {confirmacaoData.id || equipamentoId}</p>
            <p><strong>Status:</strong> {confirmacaoData.status_analise || 'Pendente'}</p>
            <p><strong>Resultado:</strong> {confirmacaoData.resultado_analise || 'Não analisado'}</p>
          </div>

          <UploadFoto
            confirmacaoId={confirmacaoId}
            onUploadSuccess={handleUploadSuccess}
          />

          {fotos.length > 0 && (
            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
              <h3>Fotos Enviadas ({fotos.length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                {fotos.map((foto: any) => (
                  <div key={foto.id} style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', textAlign: 'center' }}>
                    <p><strong>{foto.foto_nome}</strong></p>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(foto.data_upload).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ChecklistVistoria
            confirmacaoId={confirmacaoId}
            onChecklistSave={handleChecklistSave}
          />
        </>
      ) : (
        <div style={{ padding: '20px', color: 'red' }}>
          {erro || 'Nenhum equipamento selecionado'}
        </div>
      )}
    </div>
  );
};
