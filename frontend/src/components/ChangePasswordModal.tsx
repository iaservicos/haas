import React, { useState } from 'react';

const API_BASE_URL = 'https://haas-mu.vercel.app';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioId: string;
  usuarioEmail: string;
}

export function ChangePasswordModal({ isOpen, onClose, usuarioId, usuarioEmail }: ChangePasswordModalProps) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaConfirm, setSenhaConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validações
    if (!senhaAtual || !senhaNova || !senhaConfirm) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    if (senhaNova.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (senhaNova !== senhaConfirm) {
      setError('As senhas não conferem');
      return;
    }

    if (senhaAtual === senhaNova) {
      setError('A nova senha deve ser diferente da atual');
      return;
    }

    try {
      setLoading(true);
      
      // Chamar API para alterar senha
      const response = await fetch(`${API_BASE_URL}/api/usuario/alterar-senha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuarioId,
          senhaAtual,
          senhaNova,
        }),
      });

      const data = await response.json();

      if (data.sucesso) {
        setSuccess('Senha alterada com sucesso!');
        setTimeout(() => {
          setSenhaAtual('');
          setSenhaNova('');
          setSenhaConfirm('');
          onClose();
        }, 2000);
      } else {
        setError(data.mensagem || 'Erro ao alterar senha');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Alterar Senha</h2>
        <p className="text-sm text-gray-600 mb-6">{usuarioEmail}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Senha Atual */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Senha Atual
            </label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Digite sua senha atual"
              disabled={loading}
            />
          </div>

          {/* Senha Nova */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Nova Senha
            </label>
            <input
              type="password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Digite sua nova senha"
              disabled={loading}
            />
          </div>

          {/* Confirmar Senha */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              value={senhaConfirm}
              onChange={(e) => setSenhaConfirm(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Confirme sua nova senha"
              disabled={loading}
            />
          </div>

          {/* Mensagens de Erro */}
          {error && (
            <div className="p-4 bg-red-100 border-l-4 border-red-600 rounded">
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          )}

          {/* Mensagens de Sucesso */}
          {success && (
            <div className="p-4 bg-green-100 border-l-4 border-green-600 rounded">
              <p className="text-green-700 font-semibold">{success}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
