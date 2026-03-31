// frontend/src/components/PortalCliente.tsx - NOVO

import React, { useState, useEffect } from 'react';
import './PortalCliente.css';

interface Contrato {
  id: string;
  numero_contrato: string;
  nome_cliente: string;
  status: string;
  data_criacao: string;
}

interface Equipamento {
  id: string;
  numero_serie: string;
  modelo: string;
  material?: string;
  meses_garantia: number;
}

interface EquipamentoStatus {
  equipamento_id: string;
  status: 'ok' | 'problema';
  descricao?: string;
}

export const PortalCliente: React.FC = () => {
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [statusEquipamentos, setStatusEquipamentos] = useState<EquipamentoStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    carregarContrato();
  }, []);

  const carregarContrato = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clientes/meu-contrato', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setContrato(data.data);
        setEquipamentos(data.data.equipamentos || []);
        // Inicializar status de equipamentos
        setStatusEquipamentos(
          (data.data.equipamentos || []).map((eq: Equipamento) => ({
            equipamento_id: eq.id,
            status: 'ok',
            descricao: '',
          }))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar contrato:', error);
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatusEquipamento = (equipamentoId: string, status: 'ok' | 'problema', descricao?: string) => {
    setStatusEquipamentos(
      statusEquipamentos.map((s) =>
        s.equipamento_id === equipamentoId
          ? { ...s, status, descricao: descricao || '' }
          : s
      )
    );
  };

  const enviarRelatorio = async () => {
    try {
      const response = await fetch('/api/clientes/enviar-relatorio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          contrato_id: contrato?.id,
          equipamentos_status: statusEquipamentos,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setEnviado(true);
        alert('Relatório enviado com sucesso!');
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao enviar relatório:', error);
      alert('Erro ao enviar relatório');
    }
  };

  if (loading) {
    return <div className="portal-cliente"><p>Carregando...</p></div>;
  }

  if (!contrato) {
    return <div className="portal-cliente"><p>Contrato não encontrado</p></div>;
  }

  return (
    <div className="portal-cliente">
      <header className="portal-header">
        <h1>Portal Cliente - HaaS</h1>
        <p>Confirme o status dos seus equipamentos</p>
      </header>

      <div className="contrato-info">
        <div className="info-card">
          <h2>Contrato: {contrato.numero_contrato}</h2>
          <p><strong>Cliente:</strong> {contrato.nome_cliente}</p>
          <p><strong>Status:</strong> <span className={`status ${contrato.status}`}>{contrato.status}</span></p>
        </div>
      </div>

      {enviado ? (
        <div className="success-message">
          <h2>✅ Relatório Enviado!</h2>
          <p>Seu relatório foi enviado com sucesso. Você será contatado em breve.</p>
        </div>
      ) : (
        <>
          <div className="equipamentos-section">
            <h2>Equipamentos ({equipamentos.length})</h2>
            <p className="instructions">
              Para cada equipamento, indique se está funcionando corretamente (OK) ou se há algum problema.
            </p>

            <div className="equipamentos-grid">
              {equipamentos.map((equipamento) => {
                const status = statusEquipamentos.find((s) => s.equipamento_id === equipamento.id);
                return (
                  <div key={equipamento.id} className="equipamento-card">
                    <div className="equipamento-header">
                      <h3>{equipamento.modelo}</h3>
                      <p className="serie">Série: {equipamento.numero_serie}</p>
                    </div>

                    <div className="equipamento-details">
                      <p><strong>Material:</strong> {equipamento.material || 'N/A'}</p>
                      <p><strong>Garantia:</strong> {equipamento.meses_garantia} meses</p>
                    </div>

                    <div className="equipamento-status">
                      <label className="status-option">
                        <input
                          type="radio"
                          name={`status-${equipamento.id}`}
                          value="ok"
                          checked={status?.status === 'ok'}
                          onChange={() => atualizarStatusEquipamento(equipamento.id, 'ok')}
                        />
                        <span className="radio-label">✅ Funcionando</span>
                      </label>

                      <label className="status-option">
                        <input
                          type="radio"
                          name={`status-${equipamento.id}`}
                          value="problema"
                          checked={status?.status === 'problema'}
                          onChange={() => atualizarStatusEquipamento(equipamento.id, 'problema')}
                        />
                        <span className="radio-label">⚠️ Há Problema</span>
                      </label>
                    </div>

                    {status?.status === 'problema' && (
                      <textarea
                        className="problema-descricao"
                        placeholder="Descreva o problema..."
                        value={status.descricao}
                        onChange={(e) =>
                          atualizarStatusEquipamento(equipamento.id, 'problema', e.target.value)
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn-enviar" onClick={enviarRelatorio}>
              📤 Enviar Relatório
            </button>
            <button className="btn-cancelar" onClick={() => window.location.reload()}>
              🔄 Limpar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PortalCliente;
