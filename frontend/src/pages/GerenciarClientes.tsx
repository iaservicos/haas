import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";

interface Contrato {
  id: string;
  numero_contrato: string;
  nome_cliente: string;
}

interface Cliente {
  id: string;
  email: string;
  nome: string;
  contrato_id: string;
  ativo: boolean;
}

export function GerenciarClientes() {
  const { usuario, logout } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [credenciais, setCredenciais] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    contrato_id: '',
    senha: '',
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [clientesRes, contratosRes] = await Promise.all([
        fetch('/api/clientes/clientes', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/clientes/contratos', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      const clientesData = await clientesRes.json();
      const contratosData = await contratosRes.json();

      if (clientesData.success) setClientes(clientesData.data);
      if (contratosData.success) setContratos(contratosData.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/clientes/criar-cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setCredenciais(data.credenciais);
        setFormData({ email: '', nome: '', contrato_id: '', senha: '' });
        setShowForm(false);
        carregarDados();
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      alert('Erro ao criar cliente');
    }
  };

  const gerarSenhaAleatoria = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let senha = '';
    for (let i = 0; i < 8; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, senha });
  };

  const getNomeContrato = (contratoId: string) => {
    const contrato = contratos.find((c) => c.id === contratoId);
    return contrato ? `${contrato.numero_contrato} - ${contrato.nome_cliente}` : '-';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white"
          >
            ☰
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase">Menu</div>
          
          <a href="/" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Dashboard</span>}
          </a>

          <a href="/contratos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Contratos</span>}
          </a>

          <a href="/clientes" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
            {sidebarOpen && <span>Clientes</span>}
          </a>

          <a href="/equipamentos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Equipamentos</span>}
          </a>

          <a href="/confirmacoes" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Confirmações</span>}
          </a>

          <a href="/fotos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Fotos</span>}
          </a>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-red-600 rounded transition"
          >
            {sidebarOpen && <span>Sair</span>}
          </button>
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="https://raw.githubusercontent.com/iaservicos/IMAGENS/refs/heads/main/Logo_Positivo_Tecnologia_Prote%C3%A7%C3%A3o_Preto-3-(1)%20(1).png"
                alt="Logo Positivo"
                className="h-10 w-auto"
              />
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Clientes</h1>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Bem-vindo, <span className="font-semibold text-gray-900">{usuario?.nome || 'Carregando...'}</span></p>
            </div>
          </div>
        </div>

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Gerenciar Clientes</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {showForm ? 'Cancelar' : '+ Novo Cliente'}
              </button>
            </div>

            {credenciais && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
                <h3 className="text-lg font-semibold text-green-900 mb-2">✅ Cliente Criado com Sucesso!</h3>
                <div className="bg-white p-4 rounded border border-green-200 space-y-2">
                  <p><strong>Email:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{credenciais.email}</code></p>
                  <p><strong>Senha:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{credenciais.senha}</code></p>
                  <p className="text-sm text-gray-600">Compartilhe essas credenciais com o cliente.</p>
                </div>
                <button
                  onClick={() => setCredenciais(null)}
                  className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                >
                  Fechar
                </button>
              </div>
            )}

            {showForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Criar Novo Cliente</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contrato *
                      </label>
                      <select
                        value={formData.contrato_id}
                        onChange={(e) => setFormData({ ...formData, contrato_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione um contrato</option>
                        {contratos.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.numero_contrato} - {c.nome_cliente}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Senha *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.senha}
                          onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={gerarSenhaAleatoria}
                          className="bg-gray-300 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                        >
                          Gerar
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Criar Cliente
                  </button>
                </form>
              </div>
            )}

            {loading ? (
              <p className="text-center text-gray-600">Carregando clientes...</p>
            ) : clientes.length === 0 ? (
              <p className="text-center text-gray-600">Nenhum cliente encontrado</p>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Contrato</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {clientes.map((cliente) => (
                      <tr key={cliente.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{cliente.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{cliente.nome}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{getNomeContrato(cliente.contrato_id)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cliente.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {cliente.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
