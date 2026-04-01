import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";
import { supabase } from '../services/supabase';

interface Contrato {
  id: number;
  numero_contrato: string;
  nome_cliente: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: string;
  user_type: string;
  ativo: boolean;
  data_criacao: string;
}

interface UsuarioComContratos extends Usuario {
  contratos: Contrato[];
}

export function GerenciarClientes() {
  const { usuario, logout } = useAuth();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioComContratos[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filtroNome, setFiltroNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(1000);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUsuarioId, setResetUsuarioId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    contratos_ids: [] as number[],
    senha_hash: '',
    role: 'VIEWER',
  });

  useEffect(() => {
    carregarDados();
  }, []);

  // Recarregar usuários quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
    carregarUsuarios();
  }, [filtroNome]);

  // Recarregar quando página muda
  useEffect(() => {
    carregarUsuarios();
  }, [currentPage]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carregar contratos
      const { data: contratosData, error: contratosError } = await supabase
        .from('contratos')
        .select('id, numero_contrato, nome_cliente')
        .order('numero_contrato', { ascending: true });

      if (contratosError) throw contratosError;
      setContratos(contratosData || []);

      // Carregar usuários
      carregarUsuarios();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const carregarUsuarios = async () => {
    try {
      const offset = (currentPage - 1) * itemsPerPage;

      // Contar total de usuários (apenas clients)
      let countQuery = supabase
        .from('usuarios')
        .select('id', { count: 'exact', head: true })
        .eq('user_type', 'client');

      if (filtroNome) {
        countQuery = countQuery.ilike('nome', `%${filtroNome}%`);
      }

      const { count } = await countQuery;
      setTotalUsuarios(count || 0);

      // Carregar usuários COM PAGINAÇÃO (apenas clients)
      let query = supabase
        .from('usuarios')
        .select('*')
        .eq('user_type', 'client')
        .order('data_criacao', { ascending: false })
        .range(offset, offset + itemsPerPage - 1);

      if (filtroNome) {
        query = query.ilike('nome', `%${filtroNome}%`);
      }

      const { data: usuariosData, error } = await query;

      if (error) throw error;

      // Carregar contratos de cada usuário
      const usuariosComContratos: UsuarioComContratos[] = [];
      
      for (const usr of usuariosData || []) {
        const { data: usuarioContratos } = await supabase
          .from('usuario_contratos')
          .select('contrato_id')
          .eq('usuario_id', usr.id);

        const contratoIds = usuarioContratos?.map(uc => uc.contrato_id) || [];
        const contratosDoUsuario = contratos.filter(c => contratoIds.includes(c.id));

        usuariosComContratos.push({
          ...usr,
          contratos: contratosDoUsuario,
        });
      }

      setUsuarios(usuariosComContratos);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContratoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
    setFormData(prev => ({
      ...prev,
      contratos_ids: selectedOptions,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.nome || formData.contratos_ids.length === 0 || !formData.senha_hash) {
      alert('Preencha todos os campos e selecione pelo menos um contrato');
      return;
    }

    try {
      setEnviando(true);

      if (editingId) {
        // Atualizar usuário
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({
            nome: formData.nome,
            email: formData.email,
            role: formData.role,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;

        // Remover contratos antigos
        await supabase
          .from('usuario_contratos')
          .delete()
          .eq('usuario_id', editingId);

        // Adicionar novos contratos
        const novasVinculacoes = formData.contratos_ids.map(contratoId => ({
          usuario_id: editingId,
          contrato_id: contratoId,
        }));

        const { error: insertError } = await supabase
          .from('usuario_contratos')
          .insert(novasVinculacoes);

        if (insertError) throw insertError;

        alert('Usuário atualizado com sucesso!');
        setEditingId(null);
      } else {
        // Criar novo usuário
        const { data: novoUsuario, error: createError } = await supabase
          .from('usuarios')
          .insert([{
            nome: formData.nome,
            email: formData.email,
            senha_hash: formData.senha_hash,
            role: formData.role,
            user_type: 'client',
          }])
          .select();

        if (createError) throw createError;

        if (novoUsuario && novoUsuario.length > 0) {
          const usuarioId = novoUsuario[0].id;

          // Vincular contratos
          const vinculacoes = formData.contratos_ids.map(contratoId => ({
            usuario_id: usuarioId,
            contrato_id: contratoId,
          }));

          const { error: vinculError } = await supabase
            .from('usuario_contratos')
            .insert(vinculacoes);

          if (vinculError) throw vinculError;
        }

        alert('Usuário criado com sucesso!');
      }

      setFormData({ email: '', nome: '', contratos_ids: [], senha_hash: '', role: 'VIEWER' });
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário');
    } finally {
      setEnviando(false);
    }
  };

  const handleEditarUsuario = (usr: UsuarioComContratos) => {
    setEditingId(usr.id);
      setFormData({
            email: usr.email,
            nome: usr.nome,
            contratos_ids: usr.contratos.map(c => c.id),
            senha_hash: '',
            role: 'VIEWER',
          });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetSenha = async () => {
    if (!newPassword || !resetUsuarioId) {
      alert('Preencha a nova senha');
      return;
    }

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ senha_hash: newPassword })
        .eq('id', resetUsuarioId);

      if (error) throw error;
      alert('Senha resetada com sucesso!');
      setShowResetModal(false);
      setNewPassword('');
      setResetUsuarioId(null);
      carregarUsuarios();
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      alert('Erro ao resetar senha');
    }
  };

  const handleCancelarEdicao = () => {
    setEditingId(null);
    setFormData({ email: '', nome: '', contratos_ids: [], senha_hash: '', role: 'VIEWER' });
  };

  const getNomesContratos = (contratosDoUsuario: Contrato[]) => {
    if (!contratosDoUsuario || contratosDoUsuario.length === 0) return '-';
    return contratosDoUsuario.map(c => c.numero_contrato).join(', ');
  };

  const totalPages = Math.ceil(totalUsuarios / itemsPerPage);

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
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {editingId ? 'Editar Cliente' : 'Criar Novo Cliente'}
                  </h2>

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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contratos * (Selecione um ou mais)</label>
                      <select
                        multiple
                        value={formData.contratos_ids.map(String)}
                        onChange={handleContratoChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        size={5}
                      >
                        {contratos.map(contrato => (
                          <option key={contrato.id} value={contrato.id}>
                            {contrato.numero_contrato} - {contrato.nome_cliente}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Use Ctrl+Click para selecionar múltiplos</p>
                    </div>

                    {/* Campo Role oculto - sempre VIEWER para clientes */}
                    <input type="hidden" name="role" value="VIEWER" />

                    {!editingId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                        <input
                          type="password"
                          name="senha_hash"
                          value={formData.senha_hash}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Senha de acesso"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={enviando}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {enviando ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar Cliente'}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          onClick={handleCancelarEdicao}
                          className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* LISTA DE CLIENTES */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Clientes Cadastrados</h2>

                  {/* FILTROS */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Nome</label>
                    <input
                      type="text"
                      value={filtroNome}
                      onChange={(e) => setFiltroNome(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome do cliente"
                    />
                  </div>

                  {loading ? (
                    <p className="text-center text-gray-600">Carregando clientes...</p>
                  ) : usuarios.length === 0 ? (
                    <p className="text-center text-gray-600">Nenhum cliente encontrado</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contratos</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {usuarios.map((usr) => (
                              <tr key={usr.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{usr.nome}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{usr.email}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{getNomesContratos(usr.contratos)}</td>
                                <td className="px-4 py-3 text-sm">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEditarUsuario(usr)}
                                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-xs"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setResetUsuarioId(usr.id);
                                        setShowResetModal(true);
                                      }}
                                      className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition text-xs"
                                    >
                                      Reset Senha
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Página {currentPage} de {totalPages} (Total: {totalUsuarios} cliente(s))
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Anterior
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Próxima
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL RESET SENHA */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Resetar Senha</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite a nova senha"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setNewPassword('');
                    setResetUsuarioId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleResetSenha}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
                >
                  Resetar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
