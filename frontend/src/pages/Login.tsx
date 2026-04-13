import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, usuario, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // ⚡ FIX: Redirecionar APENAS se está autenticado E tem usuário
  useEffect(() => {
    if (isAuthenticated && usuario) {
      // Pequeno delay para garantir que o estado foi atualizado
      const timer = setTimeout(() => {
        if (usuario.user_type === 'analyst') {
          navigate('/', { replace: true });
        } else if (usuario.user_type === 'client') {
          navigate('/dashboard-cliente', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, usuario, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // O redirecionamento acontece no useEffect acima
    } catch (err) {
      setError('Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* LADO ESQUERDO - BRANDING */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12">
        <div className="text-center">
          <img
            src="https://raw.githubusercontent.com/iaservicos/IMAGENS/refs/heads/main/Logo_Positivo_Tecnologia_Prote%C3%A7%C3%A3o_Preto-3-(1)%20(1).png"
            alt="Logo Positivo"
            className="h-32 w-auto mx-auto mb-8 bg-white p-4 rounded-lg"
          />
          <h1 className="text-4xl font-bold text-white mb-4">Portal HaaS</h1>
          <p className="text-xl text-gray-300 mb-8">Sistema de Vistoria de Equipamentos</p>
          <div className="space-y-4 text-gray-400">
            <p className="flex items-center gap-3">
              <span className="text-blue-400">✓</span> Gerenciamento centralizado
            </p>
            <p className="flex items-center gap-3">
              <span className="text-blue-400">✓</span> Relatórios em tempo real
            </p>
            <p className="flex items-center gap-3">
              <span className="text-blue-400">✓</span> Integração com GPTMaker
            </p>
          </div>
        </div>
      </div>

      {/* LADO DIREITO - FORMULÁRIO */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          {/* Logo Mobile */}
          <div className="lg:hidden text-center mb-8">
            <img
              src="https://raw.githubusercontent.com/iaservicos/IMAGENS/refs/heads/main/Logo_Positivo_Tecnologia_Prote%C3%A7%C3%A3o_Preto-3-(1)%20(1).png"
              alt="Logo Positivo"
              className="h-16 w-auto mx-auto mb-4 bg-white p-2 rounded-lg"
            />
            <h1 className="text-2xl font-bold text-white">Portal HaaS</h1>
          </div>

          {/* Formulário */}
          <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Acesso ao Sistema</h2>

            {/* Mensagem de Erro */}
            {error && (
              <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
                <p className="text-red-200 text-sm font-semibold">{error}</p>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-lg transition duration-200 mt-6"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            {/* Informações Adicionais */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-xs text-gray-400 text-center">
                Sistema seguro desenvolvido por <span className="font-semibold text-gray-300">IA Serviços</span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>© 2026 Portal HaaS. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
