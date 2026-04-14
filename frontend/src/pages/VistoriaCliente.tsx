import React, { useState } from 'react';
import { UploadFoto } from '../components/UploadFoto';
import { ChecklistVistoria } from '../components/ChecklistVistoria';

export const VistoriaCliente: React.FC = () => {
  const [confirmacaoId, setConfirmacaoId] = useState<string>('');
  const [confirmacaoIdInput, setConfirmacaoIdInput] = useState<string>('');
  const [confirmacaoData, setConfirmacaoData] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');

  const handleBuscarConfirmacao = async () => {
    if (!confirmacaoIdInput.trim()) {
      setErro('Digite um ID de confirmação');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      const response = await fetch(`/api/vistorias/confirmacao/${confirmacaoIdInput}`);

      if (!response.ok) {
        throw new Error('Confirmação não encontrada');
      }

      const data = await response.json();
      setConfirmacaoId(confirmacaoIdInput);
      setConfirmacaoData(data.confirmacao);
      setFotos(data.fotos || []);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (fotoId: string, analise: any) => {
    alert(`Foto enviada com sucesso! ID: ${fotoId}`);
    // Recarregar fotos
    handleBuscarConfirmacao();
  };

  const handleChecklistSave = (confirmacao: any) => {
    setConfirmacaoData(confirmacao);
    alert('Checklist salvo com sucesso!');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Vistoria de Equipamento</h1>

      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Buscar Confirmação</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Digite o ID da confirmação"
            value={confirmacaoIdInput}
            onChange={(e) => setConfirmacaoIdInput(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button
            onClick={handleBuscarConfirmacao}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {erro && <p style={{ color: 'red', marginTop: '10px' }}>{erro}</p>}
      </div>

      {confirmacaoData && (
        <>
          <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <h3>Dados da Confirmação</h3>
            <p><strong>ID:</strong> {confirmacaoData.id}</p>
            <p><strong>Equipamento:</strong> {confirmacaoData.equipamento_id}</p>
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
      )}
    </div>
  );
};
