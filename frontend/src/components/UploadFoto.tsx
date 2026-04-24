import React, { useState } from 'react';

interface UploadFotoProps {
  confirmacaoId: string;
  numeroSerie?: string;
  equipmentType?: string;
  nomeCliente?: string;
  onUploadSuccess?: (fotoId: string, analise: any) => void;
}

export const UploadFoto: React.FC<UploadFotoProps> = ({ confirmacaoId, numeroSerie, equipmentType, nomeCliente, onUploadSuccess }) => {
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

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fotoBase64 = event.target?.result as string;
        const base64Data = fotoBase64.split(',')[1];

        const response = await fetch('/api/inspecao/upload-foto', {
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

        if (!response.ok) {
          throw new Error('Erro ao fazer upload');
        }

        const data = await response.json();
        setResultado(data.analise);
        setFoto(null);
        setPreview('');

        if (onUploadSuccess) {
          onUploadSuccess(data.fotoId, data.analise);
        }
      };
      reader.readAsDataURL(foto);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
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
