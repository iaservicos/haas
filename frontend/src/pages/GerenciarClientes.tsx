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
  const [showEditPanel, setShowEditPanel] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    contratos_ids: [] as number[],
    senha_hash: '',
    role: 'VIEWER',
  });

  const [editFormData, setEditFormData] = useState({
    email: '',
    nome: '',
    contratos_ids: [] as number[],
    nova_senha: '',
  });

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    carregarUsuarios();
  }, [filtroNome]);

  useEffect(() => {
    carregarUsuarios();
  }, [currentPage]); // Não adicione contratos aqui para evitar loop infinito

  const carregarDados = async () => {
    try {
      setLoading(true);

      const { data: contratosData, error: contratosError } = await supabase
        .from('contratos')
        .select('id, numero_contrato, nome_cliente')
        .order('numero_contrato', { ascending: true });

      if (contratosError) throw contratosError;
      setContratos(contratosData || []);

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

      let countQuery = supabase
        .from('usuarios')
        .select('id', { count: 'exact', head: true })
        .eq('user_type', 'client');

      if (filtroNome) {
        countQuery = countQuery.ilike('nome', `%${filtroNome}%`);
      }

      const { count } = await countQuery;
      setTotalUsuarios(count || 0);

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

      // ⚡ OTIMIZAÇÃO: Carregar TODOS os contratos de uma vez
      if (!usuariosData || usuariosData.length === 0) {
        setUsuarios([]);
        return;
      }

      const usuarioIds = usuariosData.map(u => u.id);
      
      const { data: todosUsuarioContratos } = await supabase
        .from('usuario_contratos')
        .select('usuario_id, contrato_id')
        .in('usuario_id', usuarioIds);

      const contratosPorUsuario = new Map<string, number[]>();
      
      (todosUsuarioContratos || []).forEach(uc => {
        if (!contratosPorUsuario.has(uc.usuario_id)) {
          contratosPorUsuario.set(uc.usuario_id, []);
        }
        contratosPorUsuario.get(uc.usuario_id)!.push(uc.contrato_id);
      });

      const usuariosComContratos: UsuarioComContratos[] = usuariosData.map(usr => {
        const contratoIds = contratosPorUsuario.get(usr.id) || [];
        const contratosDoUsuario = contratos.filter(c => contratoIds.includes(c.id));

        return {
          ...usr,
          contratos: contratosDoUsuario,
        };
      });

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

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
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

  const handleEditContratoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
    setEditFormData(prev => ({
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
    setEditFormData({
      email: usr.email,
      nome: usr.nome,
      contratos_ids: usr.contratos.map(c => c.id),
      nova_senha: '',
    });
    setShowEditPanel(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editFormData.email || !editFormData.nome || editFormData.contratos_ids.length === 0) {
      alert('Preencha todos os campos e selecione pelo menos um contrato');
      return;
    }

    try {
      setEnviando(true);

      // Atualizar dados do usuário
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          nome: editFormData.nome,
          email: editFormData.email,
          ...(editFormData.nova_senha && { senha_hash: editFormData.nova_senha }),
        })
        .eq('id', editingId);

      if (updateError) throw updateError;

      // Atualizar contratos
      await supabase
        .from('usuario_contratos')
        .delete()
        .eq('usuario_id', editingId);

      const novasVinculacoes = editFormData.contratos_ids.map(contratoId => ({
        usuario_id: editingId,
        contrato_id: contratoId,
      }));

      const { error: insertError } = await supabase
        .from('usuario_contratos')
        .insert(novasVinculacoes);

      if (insertError) throw insertError;

      alert('Usuário atualizado com sucesso!');
      setShowEditPanel(false);
      setEditingId(null);
      carregarDados();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      alert('Erro ao atualizar usuário');
    } finally {
      setEnviando(false);
    }
  };

  const handleCancelarEdit = () => {
    setShowEditPanel(false);
    setEditingId(null);
    setEditFormData({ email: '', nome: '', contratos_ids: [], nova_senha: '' });
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
            <div className="grid grid-cols-3 gap-8 mb-8">
              {/* COLUNA ESQUERDA - FORMULÁRIO NOVO */}
              <div className="col-span-1">
                <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Criar Novo Cliente</h2>

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

                    <button
                      type="submit"
                      disabled={enviando}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
                    >
                      {enviando ? 'Salvando...' : 'Criar Cliente'}
                    </button>
                  </form>
                </div>
              </div>

              {/* COLUNA DIREITA - LISTAGEM */}
              <div className="col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Clientes Cadastrados</h2>

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
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Nome</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Email</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Contratos</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-900">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {usuarios.map((usr) => (
                              <tr key={usr.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{usr.nome}</td>
                                <td className="px-4 py-3 text-gray-600">{usr.email}</td>
                                <td className="px-4 py-3 text-gray-600">{getNomesContratos(usr.contratos)}</td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => handleEditarUsuario(usr)}
                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-xs font-medium"
                                  >
                                    Editar
                                  </button>
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

            {/* PAINEL DE EDIÇÃO - EMBAIXO */}
            {showEditPanel && (
              <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Editar Cliente</h2>
                  <button
                    onClick={handleCancelarEdit}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmitEdit}>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="email@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                      <input
                        type="text"
                        name="nome"
                        value={editFormData.nome}
                        onChange={handleEditInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome do cliente"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contratos * (Selecione um ou mais)</label>
                      <select
                        multiple
                        value={editFormData.contratos_ids.map(String)}
                        onChange={handleEditContratoChange}
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

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha (deixe em branco para não alterar)</label>
                      <input
                        type="password"
                        name="nova_senha"
                        value={editFormData.nova_senha}
                        onChange={handleEditInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Digite a nova senha (opcional)"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="submit"
                      disabled={enviando}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
                    >
                      {enviando ? 'Salvando...' : 'Atualizar Cliente'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelarEdit}
                      className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
