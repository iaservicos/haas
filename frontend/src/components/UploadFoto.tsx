import React, { useState } from 'react';
import { API_BASE_URL } from '../services/api';

interface UploadFotoProps {
  confirmacaoId: string;
  onUploadSuccess?: (fotoId: string) => void;
}

export const UploadFoto: React.FC<UploadFotoProps> = ({ confirmacaoId, onUploadSuccess }) => {
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!foto) {
      setMensagem({ tipo: 'erro', texto: 'Selecione uma foto' });
      return;
    }

    setLoading(true);
    setMensagem(null);

    try {
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
        throw new Error(`Erro ${response.status}`);
      }

      const data = await response.json();
      
      setMensagem({ 
        tipo: 'sucesso', 
        texto: '✅ Foto enviada com sucesso!' 
      });
      
      setFoto(null);
      setPreview('');
      
      if (onUploadSuccess) {
        onUploadSuccess(data.id);
      }

      // Limpar mensagem após 3 segundos
      setTimeout(() => {
        setMensagem(null);
      }, 3000);

    } catch (error) {
      console.error('[UploadFoto] Erro:', error);
      setMensagem({ 
        tipo: 'erro', 
        texto: '❌ Erro ao enviar foto. Tente novamente.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Upload de Foto</h3>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        {preview ? (
          <div className="flex flex-col items-center gap-4">
            <img src={preview} alt="Preview" className="w-40 h-40 object-cover rounded" />
            <p className="text-sm text-gray-600">{foto?.name}</p>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-2 cursor-pointer">
            <span className="text-gray-600">Clique para selecionar uma foto</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {mensagem && (
        <div className={`p-4 rounded-lg ${
          mensagem.tipo === 'sucesso' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {mensagem.texto}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleUpload}
          disabled={!foto || loading}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? 'Enviando...' : 'Enviar Foto'}
        </button>
        
        {preview && (
          <button
            onClick={() => {
              setFoto(null);
              setPreview('');
            }}
            className="px-4 py-2 border border-gray-300 rounded"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
};

export default UploadFoto;
