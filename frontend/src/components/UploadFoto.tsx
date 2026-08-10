import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../services/api';

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
  onUploadSuccess,
}) => {
  const [modo, setModo] = useState<'desktop' | 'qrcode'>('desktop');

  // --- modo desktop ---
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [erro, setErro] = useState<string>('');

  // --- modo qrcode ---
  const [aguardando, setAguardando] = useState(false);
  const [fotoDetectada, setFotoDetectada] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mobileUrl = `${window.location.origin}/foto-mobile?vistoria_id=${confirmacaoId}&numero_serie=${encodeURIComponent(numeroSerie || '')}`;

  // Inicia polling quando entra no modo QR
  useEffect(() => {
    if (modo !== 'qrcode' || fotoDetectada) return;

    setAguardando(true);

    pollingRef.current = setInterval(async () => {
      try {
        const response = await apiClient.get(`/inspecao/fotos/${confirmacaoId}`);
        const fotos = response.data?.data || response.data;

        if (fotos && fotos.length > 0) {
          console.log('[UploadFoto] Foto detectada! ID:', fotos[0].id);
          clearInterval(pollingRef.current!);
          setAguardando(false);
          setFotoDetectada(true);
          if (onUploadSuccess) {
            onUploadSuccess(fotos[0].id, null);
          }
        }
      } catch (error) {
        // ignora erros de rede durante polling
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [modo, confirmacaoId, fotoDetectada]);

  // Para polling ao sair do modo QR
  const handleSetModo = (novoModo: 'desktop' | 'qrcode') => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setAguardando(false);
    setModo(novoModo);
    setErro('');
  };

  // --- handlers desktop ---
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target?.result as string);
      reader.readAsDataURL(file);
      setErro('');
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!foto) {
      setErro('Selecione uma foto');
      return;
    }

    setLoading(true);
    setErro('');
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', foto);
      formData.append('vistoria_id', confirmacaoId);
      formData.append('foto_nome', foto.name);
      formData.append('foto_tipo', 'equipamento');
      formData.append('numero_serie', numeroSerie || 'Desconhecido');

      console.log('[UploadFoto] Enviando upload:', {
        confirmacaoId,
        fotoNome: foto.name,
        fotoSize: foto.size,
        numeroSerie: numeroSerie || 'Desconhecido'
      });

      const response = await apiClient.post('/inspecao/upload-foto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('[UploadFoto] Resposta do upload:', response.data);
      setUploadSuccess(true);
      setFoto(null);
      setPreview('');

      if (onUploadSuccess) {
        onUploadSuccess(response.data.data?.id || response.data.id || '', response.data.data?.analise || response.data.analise);
      }
    } catch (err: any) {
      console.error('[UploadFoto] Erro no upload:', err);

      // Verificar se é erro de foto duplicada (409)
      if (err.response?.status === 409) {
        const mensagem = err.response?.data?.message || 'Foto duplicada';
        const fotoAnterior = err.response?.data?.detalhes?.foto_anterior || 'desconhecida';
        setErro(`${mensagem}. A foto "${fotoAnterior}" já foi enviada anteriormente.`);
      } else {
        setErro(err instanceof Error ? err.message : 'Erro desconhecido');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SELETOR DE MODO */}
      <div className="flex gap-0 border border-gray-300">
        <button
          onClick={() => handleSetModo('desktop')}
          className={`flex-1 py-3 px-4 text-sm font-bold uppercase tracking-wide transition-colors ${
            modo === 'desktop'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Enviar do computador
        </button>
        <button
          onClick={() => handleSetModo('qrcode')}
          className={`flex-1 py-3 px-4 text-sm font-bold uppercase tracking-wide transition-colors border-l border-gray-300 ${
            modo === 'qrcode'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Usar câmera do celular
        </button>
      </div>

      {/* MODO DESKTOP */}
      {modo === 'desktop' && (
        <div className="space-y-6">
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

          {preview && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-900">Prévia da foto:</p>
              <div className="border-2 border-gray-300 rounded-none p-4 bg-gray-50 inline-block">
                <img src={preview} alt="Preview" className="max-w-xs max-h-64 rounded-none" />
              </div>
            </div>
          )}

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

          {erro && (
            <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-none">
              <p className="text-red-700 font-semibold text-sm">{erro}</p>
              {erro.includes('Foto duplicada') && (
                <p className="text-red-600 text-xs mt-2">Tente enviar uma foto diferente do equipamento.</p>
              )}
            </div>
          )}

          {uploadSuccess && (
            <div className="p-4 bg-green-50 border-l-4 border-green-600 rounded-none">
              <p className="text-green-700 font-semibold">✓ Importação realizada com sucesso!</p>
            </div>
          )}
        </div>
      )}

      {/* MODO QR CODE */}
      {modo === 'qrcode' && (
        <div className="space-y-6">
          {!fotoDetectada ? (
            <>
              <p className="text-gray-700">
                Escaneie o QR Code abaixo com o celular para abrir a câmera e enviar a foto do equipamento diretamente.
              </p>

              <div className="flex flex-col items-center gap-6 py-6">
                <div className="p-4 border-2 border-gray-900 inline-block bg-white">
                  <QRCodeSVG
                    value={mobileUrl}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#111827"
                    level="M"
                  />
                </div>

                {aguardando && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <span className="inline-block animate-spin text-xl">⟳</span>
                    <span className="text-sm font-medium">Aguardando foto do celular...</span>
                  </div>
                )}

                <p className="text-xs text-gray-400 text-center max-w-xs break-all">
                  {mobileUrl}
                </p>
              </div>
            </>
          ) : (
            <div className="p-6 bg-green-50 border-l-4 border-green-600 rounded-none">
              <p className="text-green-700 font-bold text-lg">✓ Foto recebida do celular!</p>
              <p className="text-green-600 text-sm mt-1">A foto foi enviada com sucesso e está em análise.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
