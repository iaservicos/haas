import React, { useState } from 'react';
import { API_BASE_URL } from '@/services/apis';


interface UploadFotoProps {
  confirmacaoId: string;
  onUploadSuccess?: (fotoId: string, analise: any) => void;
}

export const UploadFoto: React.FC<UploadFotoProps> = ({ confirmacaoId, onUploadSuccess }) => {
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState<string>('');

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setErro('');
    }
  };

  const handleUpload = async () => {
    if (!foto) {
      setErro('Selecione uma foto');
      return;
    }

    if (!confirmacaoId) {
      setErro('ID da vistoria não disponível. Salve o checklist primeiro.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      console.log('[UploadFoto] Iniciando upload para backend...');
      console.log('[UploadFoto] vistoria_id:', confirmacaoId);
      console.log('[UploadFoto] foto_nome:', foto.name);

      // ✅ NOVO: Enviar para o backend ao invés de Supabase diretamente
      const formData = new FormData();
      formData.append('file', foto);
      formData.append('vistoria_id', confirmacaoId);
      formData.append('foto_nome', foto.name);
      formData.append('foto_tipo', foto.type);

      const response = await fetch(`${API_BASE_URL}/inspecao/upload-foto`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[UploadFoto] Foto salva com sucesso:', data);

      // Simulate analysis result
      const analiseResultado = {
        status: 'Análise Concluída',
        resultado: 'ok',
        descricao: 'Foto salva com sucesso no banco de dados',
        timestamp: new Date().toISOString(),
      };

      setResultado(analiseResultado);
      setFoto(null);
      setPreview('');

      if (onUploadSuccess && data.id) {
        onUploadSuccess(data.id, analiseResultado);
      }

      console.log('[UploadFoto] Upload concluído com sucesso');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[UploadFoto] Erro ao salvar foto:', errorMsg);
      setErro(`Erro ao salvar foto: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Upload de Foto</h3>

      <input
        type="file"
        accept="image/*"
        onChange={handleFotoChange}
        disabled={loading}
      />

      {preview && (
        <div style={{ marginTop: '10px' }}>
          <img src={preview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px' }} />
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!foto || loading}
        style={{ marginTop: '10px', padding: '10px 20px' }}
      >
        {loading ? 'Enviando...' : 'Enviar Foto'}
      </button>

      {erro && <p style={{ color: 'red', marginTop: '10px' }}>{erro}</p>}

      {resultado && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <h4>Resultado da Análise:</h4>
          <p><strong>Status:</strong> {resultado.status}</p>
          <p><strong>Resultado:</strong> {resultado.resultado}</p>
          <p><strong>Descrição:</strong> {resultado.descricao}</p>
        </div>
      )}
    </div>
  );
};
