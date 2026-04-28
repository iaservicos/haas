import React, { useState } from 'react';

interface UploadFotoProps {
  confirmacaoId: string;
  numeroSerie?: string;
  equipmentType?: string;
  nomeCliente?: string;
  onUploadSuccess?: (fotoId: string, analise: any) => void;
}

export const UploadFoto: React.FC<UploadFotoProps> = ({ 
  confirmacaoId, 
  numeroSerie,
  equipmentType,
  nomeCliente,
  onUploadSuccess 
}) => {
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

    setLoading(true);
    setErro('');

    // Criar novo FileReader para a leitura da foto
    const reader = new FileReader();
    
    // O try/catch agora está DENTRO do onload
    reader.onload = async (event) => {
      try {
        const fotoBase64 = event.target?.result as string;
        const base64Data = fotoBase64.split(',')[1];

        // ✅ CORRIGIDO: Usar a URL completa do backend em produção
        const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
          ? '/api/inspecao/upload-foto'
          : 'https://haas-mu.vercel.app/api/inspecao/upload-foto';

        console.log('[UploadFoto] Iniciando upload para:', apiUrl);
        console.log('[UploadFoto] confirmacaoId:', confirmacaoId);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fotoBase64: base64Data,
            fotoNome: foto.name,
            confirmacaoId,
            numeroSerie: numeroSerie || 'Desconhecido',
            equipmentType: equipmentType || 'Desconhecido',
            nomeCliente: nomeCliente || 'Desconhecido',
          }),
        });

        console.log('[UploadFoto] Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || 
            `Erro ao fazer upload: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log('[UploadFoto] Upload bem-sucedido:', data);

        setResultado(data.analise);
        setFoto(null);
        setPreview('');

        if (onUploadSuccess) {
          onUploadSuccess(data.foto?.id || '', data.analise);
        }
      } catch (err) {
        console.error('[UploadFoto] Erro:', err);
        setErro(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        // setLoading(false) agora é executado DEPOIS que tudo termina
        setLoading(false);
      }
    };

    // Inicia a leitura do arquivo
    reader.readAsDataURL(foto);
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
