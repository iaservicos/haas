// frontend/src/components/PortalAnalista.tsx - NOVO

import React, { useState, useEffect } from 'react';
import './PortalAnalista.css';

interface Contrato {
  id: string;
  numero_contrato: string;
  nome_cliente: string;
  cnpj_cliente?: string;
  status: string;
  data_criacao: string;
}

interface Cliente {
  id: string;
  email: string;
  nome: string;
  contrato_id: string;
  ativo: boolean;
}

interface Equipamento {
  id: string;
  numero_serie: string;
  modelo: string;
  material?: string;
  meses_garantia: number;
}

export const PortalAnalista: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contratos' | 'clientes' | 'criar'>('contratos');
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulários
  const [formContrato, setFormContrato] = useState({ numero_contrato: '', nome_cliente: '', cnpj_cliente: '' });
  const [formCliente, setFormCliente] = useState({ email: '', nome: '', contrato_id: '', senha: '' });
  const [formEquipamento, setFormEquipamento] = useState({ numero_serie: '', modelo: '', material: '', meses_garantia: 12 });

  // Carregar contratos
  useEffect(() => {
    if (activeTab === 'contratos') {
      carregarContratos();
    } else if (activeTab === 'clientes') {
      carregarClientes();
    }
  }, [activeTab]);

  const carregarContratos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clientes/contratos', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setContratos(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar contratos:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarClientes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clientes/clientes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setClientes(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/clientes/contratos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formContrato),
      });
      const data = await response.json();
      if (data.success) {
        alert('Contrato criado com sucesso!');
        setFormContrato({ numero_contrato: '', nome_cliente: '', cnpj_cliente: '' });
        carregarContratos();
        setActiveTab('contratos');
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      alert('Erro ao criar contrato');
    }
  };

  const criarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/clientes/criar-cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formCliente),
      });
      const data = await response.json();
      if (data.success) {
        alert(`Cliente criado! Email: ${data.credenciais.email} | Senha: ${data.credenciais.senha}`);
        setFormCliente({ email: '', nome: '', contrato_id: '', senha: '' });
        carregarClientes();
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      alert('Erro ao criar cliente');
    }
  };

  const selecionarContrato = async (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setLoading(true);
    try {
      const response = await fetch(`/api/clientes/contratos/${contrato.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) {
        setEquipamentos(data.data.equipamentos || []);
      }
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const adicionarEquipamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContrato) return;

    try {
      const response = await fetch(`/api/clientes/contratos/${selectedContrato.id}/equipamentos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formEquipamento),
      });
      const data = await response.json();
      if (data.success) {
        alert('Equipamento adicionado!');
        setFormEquipamento({ numero_serie: '', modelo: '', material: '', meses_garantia: 12 });
        selecionarContrato(selectedContrato);
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao adicionar equipamento:', error);
      alert('Erro ao adicionar equipamento');
    }
  };

  return (
    <div className="portal-analista">
      <header className="portal-header">
        <h1>Portal Analista - HaaS</h1>
        <p>Gerenciar contratos, clientes e equipamentos</p>
      </header>

      <nav className="portal-nav">
        <button
          className={`nav-btn ${activeTab === 'contratos' ? 'active' : ''}`}
          onClick={() => setActiveTab('contratos')}
        >
          📋 Contratos
        </button>
        <button
          className={`nav-btn ${activeTab === 'clientes' ? 'active' : ''}`}
          onClick={() => setActiveTab('clientes')}
        >
          👥 Clientes
        </button>
        <button
          className={`nav-btn ${activeTab === 'criar' ? 'active' : ''}`}
          onClick={() => setActiveTab('criar')}
        >
          ➕ Criar
        </button>
      </nav>

      <main className="portal-content">
        {/* ABA: CONTRATOS */}
        {activeTab === 'contratos' && (
          <section className="tab-content">
            <h2>Contratos</h2>
            {loading ? (
              <p>Carregando...</p>
            ) : (
              <div className="contratos-list">
                {contratos.map((contrato) => (
                  <div
                    key={contrato.id}
                    className={`contrato-card ${selectedContrato?.id === contrato.id ? 'selected' : ''}`}
                    onClick={() => selecionarContrato(contrato)}
                  >
                    <h3>{contrato.numero_contrato}</h3>
                    <p><strong>Cliente:</strong> {contrato.nome_cliente}</p>
                    <p><strong>Status:</strong> <span className={`status ${contrato.status}`}>{contrato.status}</span></p>
                    <p><strong>CNPJ:</strong> {contrato.cnpj_cliente || 'N/A'}</p>
                  </div>
                ))}
              </div>
            )}

            {selectedContrato && (
              <div className="contrato-details">
                <h3>Equipamentos do Contrato: {selectedContrato.numero_contrato}</h3>
                <table className="equipamentos-table">
                  <thead>
                    <tr>
                      <th>Nº Série</th>
                      <th>Modelo</th>
                      <th>Material</th>
                      <th>Garantia (meses)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipamentos.map((eq) => (
                      <tr key={eq.id}>
                        <td>{eq.numero_serie}</td>
                        <td>{eq.modelo}</td>
                        <td>{eq.material || '-'}</td>
                        <td>{eq.meses_garantia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <form onSubmit={adicionarEquipamento} className="form-equipamento">
                  <h4>Adicionar Equipamento</h4>
                  <input
                    type="text"
                    placeholder="Nº Série"
                    value={formEquipamento.numero_serie}
                    onChange={(e) => setFormEquipamento({ ...formEquipamento, numero_serie: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Modelo"
                    value={formEquipamento.modelo}
                    onChange={(e) => setFormEquipamento({ ...formEquipamento, modelo: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Material"
                    value={formEquipamento.material}
                    onChange={(e) => setFormEquipamento({ ...formEquipamento, material: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Meses de Garantia"
                    value={formEquipamento.meses_garantia}
                    onChange={(e) => setFormEquipamento({ ...formEquipamento, meses_garantia: parseInt(e.target.value) })}
                  />
                  <button type="submit">Adicionar Equipamento</button>
                </form>
              </div>
            )}
          </section>
        )}

        {/* ABA: CLIENTES */}
        {activeTab === 'clientes' && (
          <section className="tab-content">
            <h2>Clientes</h2>
            {loading ? (
              <p>Carregando...</p>
            ) : (
              <table className="clientes-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Nome</th>
                    <th>Contrato</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr key={cliente.id}>
                      <td>{cliente.email}</td>
                      <td>{cliente.nome}</td>
                      <td>{cliente.contrato_id}</td>
                      <td>{cliente.ativo ? '✅ Ativo' : '❌ Inativo'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {/* ABA: CRIAR */}
        {activeTab === 'criar' && (
          <section className="tab-content">
            <div className="criar-container">
              <div className="form-section">
                <h2>Criar Novo Contrato</h2>
                <form onSubmit={criarContrato}>
                  <input
                    type="text"
                    placeholder="Nº Contrato"
                    value={formContrato.numero_contrato}
                    onChange={(e) => setFormContrato({ ...formContrato, numero_contrato: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Nome do Cliente"
                    value={formContrato.nome_cliente}
                    onChange={(e) => setFormContrato({ ...formContrato, nome_cliente: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="CNPJ (opcional)"
                    value={formContrato.cnpj_cliente}
                    onChange={(e) => setFormContrato({ ...formContrato, cnpj_cliente: e.target.value })}
                  />
                  <button type="submit">Criar Contrato</button>
                </form>
              </div>

              <div className="form-section">
                <h2>Criar Novo Cliente</h2>
                <form onSubmit={criarCliente}>
                  <input
                    type="email"
                    placeholder="Email"
                    value={formCliente.email}
                    onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Nome"
                    value={formCliente.nome}
                    onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })}
                    required
                  />
                  <select
                    value={formCliente.contrato_id}
                    onChange={(e) => setFormCliente({ ...formCliente, contrato_id: e.target.value })}
                    required
                  >
                    <option value="">Selecione um Contrato</option>
                    {contratos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.numero_contrato} - {c.nome_cliente}
                      </option>
                    ))}
                  </select>
                  <input
                    type="password"
                    placeholder="Senha"
                    value={formCliente.senha}
                    onChange={(e) => setFormCliente({ ...formCliente, senha: e.target.value })}
                    required
                  />
                  <button type="submit">Criar Cliente</button>
                </form>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default PortalAnalista;
