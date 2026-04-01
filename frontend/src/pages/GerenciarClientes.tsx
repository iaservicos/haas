import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";

interface Contrato {
  id: string;
  nome: string;
  cliente: string;
}

interface Cliente {
  id: string;
  nome: string;
  email: string;
  contrato_id: string;
  contrato_nome: string;
  data_criacao: string;
}

export function GerenciarClientes() {
  const { usuario, logout } = useAuth();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroContrato, setFiltroContrato] = useState('');
  const [enviando, setEnviando] = useState(false);

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
      
      // Carregar contratos
      const respContratos = await fetch('/api/contratos/listar', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const dataContratos = await respContratos.json();
      if (dataContratos.success) {
        setContratos(dataContratos.data || []);
      }

      // Carregar clientes
      const respClientes = await fetch('/api/clientes/listar', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const dataClientes = await respClientes.json();
      if (dataClientes.success) {
        setClientes(dataClientes.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.nome || !formData.contrato_id || !formData.senha) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      setEnviando(true);
      const response = await fetch('/api/clientes/criar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        alert('Cliente criado com sucesso!');
        setFormData({ email: '', nome: '', contrato_id: '', senha: '' });
        carregarDados();
      } else {
        alert('Erro ao criar cliente: ' + data.message);
      }
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      alert('Erro ao criar cliente');
    } finally {
      setEnviando(false);
    }
  };

  const clientesFiltrados = clientes.filter(cliente => {
    if (filtroCliente && !cliente.nome.toLowerCase().includes(filtroCliente.toLowerCase())) return false;
    if (filtroContrato && cliente.contrato_id !== filtroContrato) return false;
    return true;
  });

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

          <a href="/clientes" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded text-white">
            {sidebarOpen && <span>Clientes</span>}
          </a>
          
          <a href="/contratos" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition">
            {sidebarOpen && <span>Contratos</span>}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* FORMULÁRIO */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Criar Novo Cliente</h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="email@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                      <input
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome do cliente"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contrato *</label>
                      <select
                        name="contrato_id"
                        value={formData.contrato_id}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione um contrato</option>
                        {contratos.map(contrato => (
                          <option key={contrato.id} value={contrato.id}>
                            {contrato.nome} - {contrato.cliente}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                      <input
                        type="password"
                        name="senha"
                        value={formData.senha}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Senha de acesso"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={enviando}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {enviando ? 'Criando...' : 'Criar Cliente'}
                    </button>
                  </form>
                </div>
              </div>

              {/* LISTA DE CLIENTES */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Clientes Cadastrados</h2>

                  {/* FILTROS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Cliente</label>
                      <input
                        type="text"
                        value={filtroCliente}
                        onChange={(e) => setFiltroCliente(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Contrato</label>
                      <select
                        value={filtroContrato}
                        onChange={(e) => setFiltroContrato(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os contratos</option>
                        {contratos.map(contrato => (
                          <option key={contrato.id} value={contrato.id}>
                            {contrato.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <p className="text-center text-gray-600">Carregando clientes...</p>
                  ) : clientesFiltrados.length === 0 ? (
                    <p className="text-center text-gray-600">Nenhum cliente encontrado</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contrato</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Data Criação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {clientesFiltrados.map((cliente) => (
                            <tr key={cliente.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{cliente.nome}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{cliente.email}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{cliente.contrato_nome}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {new Date(cliente.data_criacao).toLocaleDateString('pt-BR')}
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
        </div>
      </div>
    </div>
  );
}
