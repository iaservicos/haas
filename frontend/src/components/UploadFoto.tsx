import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface UploadFotoProps {
  confirmacaoId: string;
  onUploadSuccess?: (fotoId: string, analise: any) => void;
}

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
      // Read file as bytes
      const arrayBuffer = await foto.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      console.log('[UploadFoto] Iniciando upload para Supabase...');
      console.log('[UploadFoto] vistoria_id:', confirmacaoId);
      console.log('[UploadFoto] foto_nome:', foto.name);
      console.log('[UploadFoto] tamanho_bytes:', uint8Array.length);

      // ✅ CORREÇÃO: Converter bytes para base64
      const base64String = btoa(String.fromCharCode(...uint8Array));
      console.log('[UploadFoto] Base64 length:', base64String.length);

      // Insert into fotos_vistoria table
      const { data, error } = await supabase
        .from('fotos_vistoria')
        .insert({
          vistoria_id: confirmacaoId,
          foto_data: base64String,  // ✅ Agora é string base64
          foto_nome: foto.name,
          foto_tipo: foto.type,
          tamanho_bytes: uint8Array.length,
        })
        .select();

      if (error) {
        console.error('[UploadFoto] Erro ao salvar foto:', error);
        throw new Error(`Erro ao salvar foto: ${error.message}`);
      }

      console.log('[UploadFoto] Foto salva com sucesso:', data);

      // Simulate analysis result (in real app, this would come from backend)
      const analiseResultado = {
        status: 'Análise Concluída',
        resultado: 'ok',
        descricao: 'Foto salva com sucesso no banco de dados',
        timestamp: new Date().toISOString(),
      };

      setResultado(analiseResultado);
      setFoto(null);
      setPreview('');

      if (onUploadSuccess && data && data[0]) {
        onUploadSuccess(data[0].id, analiseResultado);
      }

      console.log('[UploadFoto] Upload concluído com sucesso');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[UploadFoto] Erro:', errorMsg);
      setErro(errorMsg);
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
