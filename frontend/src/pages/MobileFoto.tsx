import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/api';

export const MobileFoto: React.FC = () => {
  const [searchParams] = useSearchParams();
  const vistoriaId = searchParams.get('vistoria_id') || '';
  const numeroSerie = searchParams.get('numero_serie') || '';

  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string>('');

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setErro('');
    setSucesso(false);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleEnviar = async () => {
    if (!foto) {
      setErro('Selecione ou tire uma foto primeiro.');
      return;
    }
    if (!vistoriaId || !numeroSerie) {
      setErro('Link inválido. Use o QR Code gerado na tela de vistoria.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      const formData = new FormData();
      formData.append('file', foto);
      formData.append('vistoria_id', vistoriaId);
      formData.append('foto_nome', foto.name);
      formData.append('foto_tipo', 'equipamento');
      formData.append('numero_serie', numeroSerie);

      await apiClient.post('/inspecao/upload-foto', formData);

      setSucesso(true);
      setFoto(null);
      setPreview('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar foto.');
    } finally {
      setLoading(false);
    }
  };

  if (!vistoriaId || !numeroSerie) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-2xl font-bold text-gray-900 mb-2">Link inválido</p>
          <p className="text-gray-600">Use o QR Code gerado na tela de vistoria.</p>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-4xl font-bold">✓</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-2">Foto enviada!</p>
          <p className="text-gray-600">A foto foi enviada com sucesso para análise. Você pode fechar esta janela.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-5">
        <h1 className="text-xl font-bold">Foto do Equipamento</h1>
        <p className="text-gray-400 text-sm mt-1">Série: <span className="text-white font-semibold">{numeroSerie}</span></p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col gap-6">
        <p className="text-gray-700 text-base leading-relaxed">
          Tire uma foto nítida do equipamento, incluindo cabos, fontes e periféricos. Certifique-se de que a imagem esteja bem iluminada.
        </p>

        {/* Botão de captura — abre câmera no celular */}
        <label className="block">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFotoChange}
            disabled={loading}
            className="sr-only"
          />
          <div className="w-full border-2 border-dashed border-gray-300 rounded-none p-8 text-center cursor-pointer hover:border-gray-900 transition-colors">
            {preview ? (
              <img src={preview} alt="Prévia" className="max-h-64 mx-auto rounded-none" />
            ) : (
              <>
                <div className="text-5xl mb-3">📷</div>
                <p className="font-bold text-gray-900 text-lg">Tocar para tirar foto</p>
                <p className="text-gray-500 text-sm mt-1">ou selecionar da galeria</p>
              </>
            )}
          </div>
        </label>

        {preview && (
          <label className="text-sm text-blue-600 underline cursor-pointer text-center">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFotoChange}
              disabled={loading}
              className="sr-only"
            />
            Trocar foto
          </label>
        )}

        {erro && (
          <div className="p-4 bg-red-50 border-l-4 border-red-600">
            <p className="text-red-700 font-semibold text-sm">{erro}</p>
          </div>
        )}

        <button
          onClick={handleEnviar}
          disabled={!foto || loading}
          className="w-full py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg uppercase tracking-wide transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block animate-spin">⟳</span>
              Enviando...
            </span>
          ) : (
            'Enviar Foto'
          )}
        </button>
      </div>
    </div>
  );
};
