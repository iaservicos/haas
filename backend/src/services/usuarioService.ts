import { supabase } from '../config/database.js';

export interface CriarUsuarioDTO {
  email: string;
  nome: string;
  user_type: 'analyst' | 'client' | 'admin';
}

export interface EditarUsuarioDTO {
  email: string;
  nome: string;
  user_type: 'analyst' | 'client' | 'admin';
  ativo: boolean;
}

export class UsuarioService {
  /**
   * Verifica se usuário é admin
   * Primeiro tenta o token, depois cai no banco como fallback
   */
  async verificarAdmin(req: any): Promise<boolean> {
    console.log('[UsuarioService] verificarAdmin iniciando...');

    const userType = req.user?.user_type;
    console.log('[UsuarioService] userType do token:', userType);

    if (userType === 'admin') {
      console.log('[UsuarioService] ✅ É admin (do token)');
      return true;
    }

    const usuarioId = req.user?.userId;
    console.log('[UsuarioService] usuarioId:', usuarioId);

    if (!usuarioId) {
      console.log('[UsuarioService] ❌ usuarioId não encontrado');
      return false;
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('user_type')
      .eq('id', usuarioId)
      .single();

    console.log('[UsuarioService] usuário do banco:', usuario);
    const isAdmin = usuario?.user_type === 'admin';
    console.log('[UsuarioService] isAdmin:', isAdmin);

    return isAdmin;
  }

  /**
   * Valida tipo de usuário
   */
  validarTipoUsuario(userType: any): boolean {
    return ['analyst', 'client', 'admin'].includes(userType);
  }

  /**
   * Gera senha temporária aleatória
   */
  gerarSenhaTemporaria(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Verifica se email já existe
   */
  async emailJaExiste(email: string): Promise<boolean> {
    const { data: usuarioExistente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    return !!usuarioExistente;
  }

  /**
   * Cria novo usuário
   */
  async criar(dto: CriarUsuarioDTO) {
    const senhaPorPadrao = this.gerarSenhaTemporaria();

    const { data: novoUsuario, error: erro } = await supabase
      .from('usuarios')
      .insert([
        {
          email: dto.email,
          nome: dto.nome,
          user_type: dto.user_type,
          role: 'VIEWER',
          senha_hash: senhaPorPadrao,
          ativo: true,
          data_criacao: new Date().toISOString(),
        }
      ])
      .select();

    if (erro) {
      console.error('[UsuarioService] Erro ao criar usuário:', erro);
      throw new Error('Erro ao criar usuário');
    }

    console.log(`[UsuarioService] ✅ Usuário criado: ${dto.email}`);

    return {
      id: novoUsuario[0].id,
      email: dto.email,
      nome: dto.nome,
      user_type: dto.user_type,
      senha_temporaria: senhaPorPadrao
    };
  }

  /**
   * Lista todos os usuários
   */
  async listar() {
    const { data: usuarios, error: erro } = await supabase
      .from('usuarios')
      .select('id, email, nome, user_type, ativo, data_criacao')
      .order('data_criacao', { ascending: false });

    if (erro) {
      console.error('[UsuarioService] Erro ao listar usuários:', erro);
      throw new Error('Erro ao listar usuários');
    }

    return usuarios || [];
  }

  /**
   * Edita usuário existente
   */
  async editar(id: string, dto: EditarUsuarioDTO) {
    const { error: erro } = await supabase
      .from('usuarios')
      .update({
        email: dto.email,
        nome: dto.nome,
        user_type: dto.user_type,
        ativo: dto.ativo,
        data_atualizacao: new Date().toISOString()
      })
      .eq('id', id);

    if (erro) {
      console.error('[UsuarioService] Erro ao editar usuário:', erro);
      throw new Error('Erro ao editar usuário');
    }

    console.log(`[UsuarioService] ✅ Usuário ${id} editado com sucesso`);
  }

  /**
   * Deleta usuário
   */
  async deletar(id: string, usuarioAtualId?: string) {
    if (usuarioAtualId && usuarioAtualId === id) {
      throw new Error('Você não pode deletar a sua própria conta');
    }

    const { error: erro } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (erro) {
      console.error('[UsuarioService] Erro ao deletar usuário:', erro);
      throw new Error('Erro ao deletar usuário');
    }

    console.log(`[UsuarioService] ✅ Usuário ${id} deletado com sucesso`);
  }

  /**
   * Busca usuário por ID
   */
  async buscarPorId(id: string) {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, senha_hash, email')
      .eq('id', id)
      .single();

    if (error || !usuario) {
      console.error('[UsuarioService] Erro ao buscar usuário:', error);
      throw new Error('Usuário não encontrado');
    }

    return usuario;
  }

  /**
   * Altera senha do usuário
   */
  async alterarSenha(usuarioId: string, senhaAtual: string, senhaNova: string) {
    const usuario = await this.buscarPorId(usuarioId);

    // Verificar senha atual
    const senhaCorreta = senhaAtual === usuario.senha_hash;
    if (!senhaCorreta) {
      throw new Error('Senha atual incorreta');
    }

    // Atualizar senha
    const { error: erroAtualizar } = await supabase
      .from('usuarios')
      .update({
        senha_hash: senhaNova,
        data_atualizacao: new Date().toISOString(),
      })
      .eq('id', usuarioId);

    if (erroAtualizar) {
      console.error('[UsuarioService] Erro ao atualizar senha:', erroAtualizar);
      throw new Error('Erro ao atualizar senha');
    }

    console.log(`[UsuarioService] ✅ Senha alterada com sucesso para usuário: ${usuario.email}`);
  }
}

export default new UsuarioService();
