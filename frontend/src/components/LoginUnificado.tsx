import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
 
export const LoginUnificado: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
 
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
 
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
 
      const data = await response.json();
 
      if (response.ok) {
        // Salvar token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
 
        // Redirecionar baseado no tipo de usuário
        if (data.usuario.user_type === 'analyst') {
          navigate('/portal-analista');
        } else {
          navigate('/portal-cliente');
        }
      } else {
        setError(data.error || 'Erro ao fazer login');
      }
    } catch (error) {
      setError('Erro ao conectar ao servidor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>HaaS Portal</h1>
        <p>Acesso Analista e Cliente</p>
 
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Conectando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
