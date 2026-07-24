import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient as api } from '../services/api';

interface Usuario {
  id: string;
  email: string;
  nome: string;
  user_type: 'analyst' | 'client' | 'admin';
  ativo: boolean;
  data_criacao: string;
}

interface FormData {
  email: string;
  nome: string;
  user_type: 'analyst' | 'client' | 'admin';
}

export function GerenciarUsuarios() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    nome: '',
    user_type: 'analyst'
  });

  // Carregar usuários
  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      console.log('[GerenciarUsuarios] Carregando usuários...');
      console.log('[GerenciarUsuarios] usuario:', usuario);
      console.log('[GerenciarUsuarios] usuario.user_type:', usuario?.user_type);
      console.log('[GerenciarUsuarios] token no localStorage:', localStorage.getItem('token')?.substring(0, 20) + '...');

      const response = await api.get('/usuario/listar');
      console.log('[GerenciarUsuarios] Resposta:', response);

      if (response.data.sucesso) {
        setUsuarios(response.data.dados);
      }
    } catch (erro: any) {
      console.error('[GerenciarUsuarios] Erro:', erro);
      alert(`Erro ao carregar usuários: ${erro.response?.data?.mensagem || erro.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.nome || !formData.user_type) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);

      if (editandoId) {
        // Editar
        await api.put(`/usuario/${editandoId}`, {
          ...formData,
          ativo: true
        });
        alert('Usuário atualizado com sucesso');
      } else {
        // Criar
        const response = await api.post('/usuario/criar', formData);
        if (response.data.sucesso) {
          alert(`Usuário criado! Senha temporária: ${response.data.dados.senha_temporaria}`);
        }
      }

      setFormData({ email: '', nome: '', user_type: 'analyst' });
      setEditandoId(null);
      setShowModal(false);
      await carregarUsuarios();
    } catch (erro: any) {
      alert(`Erro: ${erro.response?.data?.mensagem || erro.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (usuario: Usuario) => {
    setFormData({
      email: usuario.email,
      nome: usuario.nome,
      user_type: usuario.user_type
    });
    setEditandoId(usuario.id);
    setShowModal(true);
  };

  const handleDeletar = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      setLoading(true);
      await api.delete(`/usuario/${id}`);
      alert('Usuário deletado com sucesso');
      await carregarUsuarios();
    } catch (erro: any) {
      alert(`Erro: ${erro.response?.data?.mensagem || erro.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFecharModal = () => {
    setShowModal(false);
    setEditandoId(null);
    setFormData({ email: '', nome: '', user_type: 'analyst' });
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      analyst: 'Analista',
      client: 'Cliente',
      admin: 'Admin'
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="flex h-screen bg-white">
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

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 rounded transition"
          >
            {sidebarOpen && <span>Voltar</span>}
          </button>

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
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{usuario?.nome}</span>
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="max-w-7xl mx-auto">
              {/* Botão Criar */}
              <div className="mb-6">
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  + Criar Novo Usuário
                </button>
              </div>

              {/* Tabela */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">Carregando...</div>
                ) : usuarios.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Nenhum usuário cadastrado</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nome</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Data Criação</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map((usuario) => (
                        <tr key={usuario.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{usuario.email}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{usuario.nome}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                              {getTipoLabel(usuario.user_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{formatarData(usuario.data_criacao)}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleEditar(usuario)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-4"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeletar(usuario.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Deletar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">
              {editandoId ? 'Editar Usuário' : 'Criar Novo Usuário'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Usuário</label>
                <select
                  value={formData.user_type}
                  onChange={(e) => setFormData({ ...formData, user_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="analyst">Analista</option>
                  <option value="client">Cliente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {!editandoId && (
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                  Uma senha temporária será gerada automaticamente
                </p>
              )}

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={handleFecharModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
