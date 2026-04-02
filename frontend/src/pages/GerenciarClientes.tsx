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
  }, [currentPage]);

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

  // ⚡ OTIMIZAÇÃO: Carregar TODOS os contratos de uma vez com IN
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

      // ⚡ OTIMIZAÇÃO 1: Se não há usuários, retorna vazio
      if (!usuariosData || usuariosData.length === 0) {
        setUsuarios([]);
        return;
      }

      // ⚡ OTIMIZAÇÃO 2: Carregar TODOS os contratos de uma vez com IN
      const usuarioIds = usuariosData.map(u => u.id);
      
      const { data: todosUsuarioContratos, error: contratoError } = await supabase
        .from('usuario_contratos')
        .select('usuario_id, contrato_id')
        .in('usuario_id', usuarioIds);  // ← Uma única query para TODOS!

      if (contratoError) throw contratoError;

      // ⚡ OTIMIZAÇÃO 3: Mapear em memória (muito mais rápido)
      const contratosPorUsuario = new Map<string, number[]>();
      
      (todosUsuarioContratos || []).forEach(uc => {
        if (!contratosPorUsuario.has(uc.usuario_id)) {
          contratosPorUsuario.set(uc.usuario_id, []);
        }
        contratosPorUsuario.get(uc.usuario_id)!.push(uc.contrato_id);
      });

      // ⚡ OTIMIZAÇÃO 4: Construir resultado em memória (sem loops)
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
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
          >
            {sidebarOpen ? 'Logout' : 'X'}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* LEFT PANEL - CRIAR NOVO CLIENTE */}
        <div className="w-1/3 bg-white rounded-lg shadow-md p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">Criar Novo Cliente</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email do cliente"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Nome do cliente"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contratos * (Selecione um ou mais)</label>
              <select
                name="contratos"
                multiple
                value={formData.contratos_ids.map(String)}
                onChange={handleContratoChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={6}
                required
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
                placeholder="Senha do cliente"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="VIEWER">VIEWER</option>
                <option value="ANALISTA">ANALISTA</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
            >
              {enviando ? 'Criando...' : 'Criar Cliente'}
            </button>
          </form>
        </div>

        {/* RIGHT PANEL - LISTA DE CLIENTES */}
        <div className="flex-1 bg-white rounded-lg shadow-md p-6 flex flex-col overflow-hidden">
          <h2 className="text-2xl font-bold mb-4">Clientes Cadastrados</h2>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Filtrar por Nome"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-gray-500">Carregando...</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Nome</th>
                      <th className="px-4 py-2 text-left font-semibold">Email</th>
                      <th className="px-4 py-2 text-left font-semibold">Contratos</th>
                      <th className="px-4 py-2 text-left font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(usr => (
                      <tr key={usr.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{usr.nome}</td>
                        <td className="px-4 py-2">{usr.email}</td>
                        <td className="px-4 py-2 text-xs">{getNomesContratos(usr.contratos)}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleEditarUsuario(usr)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINAÇÃO */}
              <div className="mt-4 flex items-center justify-between text-sm">
                <span>Página {currentPage} de {totalPages} (Total: {totalUsuarios} cliente(s))</span>
                <div className="space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* PAINEL DE EDIÇÃO (EXPANSÍVEL) */}
      {showEditPanel && (
        <div className="fixed bottom-0 right-0 w-96 bg-white shadow-lg rounded-t-lg p-6 border-t border-gray-300 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Editar Cliente</h3>
            <button
              onClick={handleCancelarEdit}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={editFormData.email}
                onChange={handleEditInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                name="nome"
                value={editFormData.nome}
                onChange={handleEditInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contratos</label>
              <select
                multiple
                value={editFormData.contratos_ids.map(String)}
                onChange={handleEditContratoChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={4}
              >
                {contratos.map(contrato => (
                  <option key={contrato.id} value={contrato.id}>
                    {contrato.numero_contrato}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha (deixe em branco para manter)</label>
              <input
                type="password"
                name="nova_senha"
                value={editFormData.nova_senha}
                onChange={handleEditInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={enviando}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50"
              >
                {enviando ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={handleCancelarEdit}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
