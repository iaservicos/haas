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

    try {
      // ✅ CORRIGIDO: Usar FormData para enviar o arquivo como multipart
      const formData = new FormData();
      formData.append('file', foto);
      formData.append('vistoria_id', confirmacaoId);
      formData.append('foto_nome', foto.name);
      formData.append('foto_tipo', 'equipamento');
      formData.append('numero_serie', numeroSerie || 'Desconhecido');

      // ✅ CORRIGIDO: Usar a URL completa do backend em produção
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? '/api/inspecao/upload-foto'
        : 'https://haas-mu.vercel.app/api/inspecao/upload-foto';

      console.log('[UploadFoto] Iniciando upload para:', apiUrl);
      console.log('[UploadFoto] vistoria_id:', confirmacaoId);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        // NÃO definir Content-Type - o navegador vai definir automaticamente com boundary
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

      // ✅ Extrair análise da resposta
      setResultado(data.data?.analise || data.analise || {
        status: 'Análise em progresso',
        resultado: 'pendente',
        descricao: 'A análise será feita em background'
      });
      
      setFoto(null);
      setPreview('');

      if (onUploadSuccess) {
        onUploadSuccess(data.data?.id || data.id || '', data.data?.analise || data.analise);
      }
    } catch (err) {
      console.error('[UploadFoto] Erro:', err);
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* INPUT FILE COM LABEL CUSTOMIZADO */}
      <div className="flex flex-col gap-3">
        <label className="block">
          <span className="sr-only">Escolher foto</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFotoChange}
            disabled={loading}
            className="block w-full text-sm text-gray-700
              file:mr-4 file:py-2 file:px-4
              file:rounded-none file:border-0
              file:text-sm file:font-semibold
              file:bg-gray-900 file:text-white
              hover:file:bg-gray-800
              file:cursor-pointer file:transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </label>
      </div>

      {/* PREVIEW DA IMAGEM */}
      {preview && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-900">Prévia da foto:</p>
          <div className="border-2 border-gray-300 rounded-none p-4 bg-gray-50 inline-block">
            <img 
              src={preview} 
              alt="Preview" 
              className="max-w-xs max-h-64 rounded-none"
            />
          </div>
        </div>
      )}

      {/* BOTÃO ENVIAR FOTO - TAMANHO PADRÃO */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleUpload}
          disabled={!foto || loading}
          className="px-6 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-none font-bold text-base transition-colors uppercase tracking-wide"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block animate-spin">⟳</span>
              Enviando...
            </span>
          ) : (
            'Enviar Foto'
          )}
        </button>
      </div>

      {/* MENSAGEM DE ERRO */}
      {erro && (
        <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-none">
          <p className="text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      {/* RESULTADO DA ANÁLISE */}
      {resultado && (
        <div className="p-6 bg-green-50 border-l-4 border-green-600 rounded-none">
          <h4 className="font-bold text-green-900 mb-4 text-lg">Resultado da Análise:</h4>
          <div className="space-y-3 text-green-800">
            <p><strong>Status:</strong> {resultado.status}</p>
            <p><strong>Resultado:</strong> {resultado.resultado}</p>
            <p><strong>Descrição:</strong> {resultado.descricao}</p>
          </div>
        </div>
      )}
    </div>
  );
};

