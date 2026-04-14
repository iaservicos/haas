import React, { useState } from 'react';

interface ChecklistVistoriaProps {
  confirmacaoId: string;
  onChecklistSave?: (checklist: any) => void;
}

export const ChecklistVistoria: React.FC<ChecklistVistoriaProps> = ({ confirmacaoId, onChecklistSave }) => {
  const [fontePresenteValue, setFontePresenteValue] = useState<boolean | null>(null);
  const [tecladoPresenteValue, setTecladoPresenteValue] = useState<boolean | null>(null);
  const [mousePresenteValue, setMousePresenteValue] = useState<boolean | null>(null);
  const [tipoMaterial, setTipoMaterial] = useState('genérico');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [sucesso, setSucesso] = useState(false);

  const handleSalvar = async () => {
    if (fontePresenteValue === null) {
      setErro('Fonte é obrigatória');
      return;
    }

    setLoading(true);
    setErro('');
    setSucesso(false);

    try {
      const response = await fetch(`/api/vistorias/confirmacao/${confirmacaoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fonte_presente: fontePresenteValue,
          teclado_presente: tecladoPresenteValue || false,
          mouse_presente: mousePresenteValue || false,
          tipo_material: tipoMaterial,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar checklist');
      }

      const data = await response.json();
      setSucesso(true);

      if (onChecklistSave) {
        onChecklistSave(data.confirmacao);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '20px' }}>
      <h3>Checklist de Vistoria</h3>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Fonte Presente (Obrigatório)
        </label>
        <div>
          <button
            onClick={() => setFontePresenteValue(true)}
            style={{
              padding: '8px 16px',
              marginRight: '10px',
              backgroundColor: fontePresenteValue === true ? '#4CAF50' : '#ddd',
              color: fontePresenteValue === true ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Sim
          </button>
          <button
            onClick={() => setFontePresenteValue(false)}
            style={{
              padding: '8px 16px',
              backgroundColor: fontePresenteValue === false ? '#f44336' : '#ddd',
              color: fontePresenteValue === false ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Não
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Teclado Presente (Opcional)
        </label>
        <div>
          <button
            onClick={() => setTecladoPresenteValue(true)}
            style={{
              padding: '8px 16px',
              marginRight: '10px',
              backgroundColor: tecladoPresenteValue === true ? '#4CAF50' : '#ddd',
              color: tecladoPresenteValue === true ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Sim
          </button>
          <button
            onClick={() => setTecladoPresenteValue(false)}
            style={{
              padding: '8px 16px',
              backgroundColor: tecladoPresenteValue === false ? '#f44336' : '#ddd',
              color: tecladoPresenteValue === false ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Não
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Mouse Presente (Opcional)
        </label>
        <div>
          <button
            onClick={() => setMousePresenteValue(true)}
            style={{
              padding: '8px 16px',
              marginRight: '10px',
              backgroundColor: mousePresenteValue === true ? '#4CAF50' : '#ddd',
              color: mousePresenteValue === true ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Sim
          </button>
          <button
            onClick={() => setMousePresenteValue(false)}
            style={{
              padding: '8px 16px',
              backgroundColor: mousePresenteValue === false ? '#f44336' : '#ddd',
              color: mousePresenteValue === false ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Não
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Tipo de Material
        </label>
        <select
          value={tipoMaterial}
          onChange={(e) => setTipoMaterial(e.target.value)}
          style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="genérico">Genérico</option>
          <option value="notebook">Notebook</option>
          <option value="desktop">Desktop</option>
          <option value="monitor">Monitor</option>
          <option value="impressora">Impressora</option>
        </select>
      </div>

      <button
        onClick={handleSalvar}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Salvando...' : 'Salvar Checklist'}
      </button>

      {erro && <p style={{ color: 'red', marginTop: '10px' }}>{erro}</p>}
      {sucesso && <p style={{ color: 'green', marginTop: '10px' }}>Checklist salvo com sucesso!</p>}
    </div>
  );
};
