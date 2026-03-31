// frontend/src/components/PortalCliente.tsx - VERSÃO V2 COM CHECKLIST E FOTO

import React, { useState, useEffect } from 'react';
import './PortalCliente.css';

interface Equipamento {
  id: string;
  numero_serie: string;
  modelo: string;
  sku?: string;
  tipo_equipamento: 'notebook' | 'desktop';
  data_fim_contrato?: string;
  informacoes_destino?: string;
  nota_fiscal?: string;
  meses_garantia: number;
}

interface Contrato {
  id: string;
  numero_contrato: string;
  nome_cliente: string;
  status: string;
}

interface Confirmacao {
  id: string;
  equipamento_id: string;
  equipamento_ligado: boolean;
  sem_problemas_visuais: boolean;
  funcionando_normalmente: boolean;
  fonte_presente?: boolean;
  teclado_presente?: boolean;
  mouse_presente?: boolean;
  url_foto?: string;
  status_analise: 'pendente' | 'analisando' | 'concluido' | 'erro';
  resultado_analise?: 'ok' | 'problema';
  analise_gptmaker?: string;
}

export const PortalCliente: React.FC = () => {
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [confirmacoes, setConfirmacoes] = useState<Map<string, Confirmacao>>(new Map());
  const [loading, setLoading] = useState(true);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<Equipamento | null>(null);
  const [fotoSelecionada, setFotoSelecionada] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

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
        carregarConfirmacoes(data.data.equipamentos || []);
      }
    } catch (error) {
      console.error('Erro ao carregar contrato:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarConfirmacoes = async (equips: Equipamento[]) => {
    try {
      const response = await fetch('/api/clientes/minhas-confirmacoes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        const mapa = new Map();
        data.data.forEach((conf: Confirmacao) => {
          mapa.set(conf.equipamento_id, conf);
        });
        setConfirmacoes(mapa);
      }
    } catch (error) {
      console.error('Erro ao carregar confirmações:', error);
    }
  };

  const atualizarChecklist = (equipamentoId: string, campo: string, valor: boolean) => {
    const confirmacao = confirmacoes.get(equipamentoId) || {
      id: '',
      equipamento_id: equipamentoId,
      equipamento_ligado: false,
      sem_problemas_visuais: false,
      funcionando_normalmente: false,
      status_analise: 'pendente',
    };

    const atualizada = { ...confirmacao, [campo]: valor };
    const novasMapa = new Map(confirmacoes);
    novasMapa.set(equipamentoId, atualizada);
    setConfirmacoes(novasMapa);
  };

  const enviarConfirmacao = async (equipamento: Equipamento) => {
    const confirmacao = confirmacoes.get(equipamento.id);
    if (!confirmacao) {
      alert('Preencha o checklist primeiro');
      return;
    }

    if (!fotoSelecionada) {
      alert('Selecione uma foto do equipamento ligado');
      return;
    }

    setEnviando(true);
    try {
      // 1. Upload da foto
      const formData = new FormData();
      formData.append('file', fotoSelecionada);
      formData.append('equipamento_id', equipamento.id);

      const uploadResponse = await fetch('/api/clientes/upload-foto', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      if (!uploadData.success) {
        alert('Erro ao fazer upload da foto');
        return;
      }

      // 2. Enviar confirmação com foto
      const response = await fetch('/api/clientes/enviar-confirmacao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          equipamento_id: equipamento.id,
          equipamento_ligado: confirmacao.equipamento_ligado,
          sem_problemas_visuais: confirmacao.sem_problemas_visuais,
          funcionando_normalmente: confirmacao.funcionando_normalmente,
          fonte_presente: equipamento.tipo_equipamento === 'notebook' ? confirmacao.fonte_presente : undefined,
          teclado_presente: equipamento.tipo_equipamento === 'desktop' ? confirmacao.teclado_presente : undefined,
          mouse_presente: equipamento.tipo_equipamento === 'desktop' ? confirmacao.mouse_presente : undefined,
          url_foto: uploadData.data.url,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Confirmação enviada! Aguardando análise...');
        setFotoSelecionada(null);
        setEquipamentoSelecionado(null);
        carregarConfirmacoes(equipamentos);
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao enviar confirmação:', error);
      alert('Erro ao enviar confirmação');
    } finally {
      setEnviando(false);
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
        </div>
      </div>

      <div className="equipamentos-section">
        <h2>Equipamentos ({equipamentos.length})</h2>
        
        <div className="equipamentos-table-wrapper">
          <table className="equipamentos-table">
            <thead>
              <tr>
                <th>Nº Série</th>
                <th>SKU</th>
                <th>Modelo</th>
                <th>Tipo</th>
                <th>Fim do Contrato</th>
                <th>Destino</th>
                <th>Nota Fiscal</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {equipamentos.map((equipamento) => {
                const confirmacao = confirmacoes.get(equipamento.id);
                const statusClass = confirmacao?.resultado_analise === 'ok' ? 'ok' : 
                                   confirmacao?.resultado_analise === 'problema' ? 'problema' : 
                                   confirmacao?.status_analise === 'analisando' ? 'analisando' : 'pendente';

                return (
                  <tr key={equipamento.id}>
                    <td><strong>{equipamento.numero_serie}</strong></td>
                    <td>{equipamento.sku || '-'}</td>
                    <td>{equipamento.modelo}</td>
                    <td><span className="tipo-badge">{equipamento.tipo_equipamento}</span></td>
                    <td>{equipamento.data_fim_contrato || '-'}</td>
                    <td>{equipamento.informacoes_destino || '-'}</td>
                    <td>{equipamento.nota_fiscal || '-'}</td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>
                        {confirmacao?.resultado_analise === 'ok' ? '✅ OK' :
                         confirmacao?.resultado_analise === 'problema' ? '⚠️ Problema' :
                         confirmacao?.status_analise === 'analisando' ? '⏳ Analisando' :
                         '⭕ Pendente'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-confirmar"
                        onClick={() => setEquipamentoSelecionado(equipamento)}
                        disabled={confirmacao?.status_analise === 'analisando'}
                      >
                        Confirmar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {equipamentoSelecionado && (
        <div className="modal-overlay" onClick={() => setEquipamentoSelecionado(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEquipamentoSelecionado(null)}>✕</button>

            <h2>Confirmar Equipamento</h2>
            <p className="modal-subtitle">{equipamentoSelecionado.numero_serie} - {equipamentoSelecionado.modelo}</p>

            <div className="checklist-section">
              <h3>Checklist</h3>

              {/* Checklist Comum */}
              <div className="checklist-item">
                <label>
                  <input
                    type="checkbox"
                    checked={confirmacoes.get(equipamentoSelecionado.id)?.equipamento_ligado || false}
                    onChange={(e) => atualizarChecklist(equipamentoSelecionado.id, 'equipamento_ligado', e.target.checked)}
                  />
                  <span>Equipamento ligado</span>
                </label>
              </div>

              <div className="checklist-item">
                <label>
                  <input
                    type="checkbox"
                    checked={confirmacoes.get(equipamentoSelecionado.id)?.sem_problemas_visuais || false}
                    onChange={(e) => atualizarChecklist(equipamentoSelecionado.id, 'sem_problemas_visuais', e.target.checked)}
                  />
                  <span>Sem problemas visuais</span>
                </label>
              </div>

              <div className="checklist-item">
                <label>
                  <input
                    type="checkbox"
                    checked={confirmacoes.get(equipamentoSelecionado.id)?.funcionando_normalmente || false}
                    onChange={(e) => atualizarChecklist(equipamentoSelecionado.id, 'funcionando_normalmente', e.target.checked)}
                  />
                  <span>Funcionando normalmente</span>
                </label>
              </div>

              {/* Checklist Específico - Notebook */}
              {equipamentoSelecionado.tipo_equipamento === 'notebook' && (
                <div className="checklist-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={confirmacoes.get(equipamentoSelecionado.id)?.fonte_presente || false}
                      onChange={(e) => atualizarChecklist(equipamentoSelecionado.id, 'fonte_presente', e.target.checked)}
                    />
                    <span>Fonte está junto ao equipamento</span>
                  </label>
                </div>
              )}

              {/* Checklist Específico - Desktop */}
              {equipamentoSelecionado.tipo_equipamento === 'desktop' && (
                <>
                  <div className="checklist-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={confirmacoes.get(equipamentoSelecionado.id)?.teclado_presente || false}
                        onChange={(e) => atualizarChecklist(equipamentoSelecionado.id, 'teclado_presente', e.target.checked)}
                      />
                      <span>Teclado presente</span>
                    </label>
                  </div>

                  <div className="checklist-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={confirmacoes.get(equipamentoSelecionado.id)?.mouse_presente || false}
                        onChange={(e) => atualizarChecklist(equipamentoSelecionado.id, 'mouse_presente', e.target.checked)}
                      />
                      <span>Mouse presente</span>
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="foto-section">
              <h3>Foto do Equipamento Ligado</h3>
              <div className="foto-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFotoSelecionada(e.target.files?.[0] || null)}
                  className="foto-input"
                />
                {fotoSelecionada && (
                  <p className="foto-selecionada">✅ {fotoSelecionada.name}</p>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancelar"
                onClick={() => setEquipamentoSelecionado(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-enviar"
                onClick={() => enviarConfirmacao(equipamentoSelecionado)}
                disabled={enviando}
              >
                {enviando ? 'Enviando...' : '📤 Enviar Confirmação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalCliente;
