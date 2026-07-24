import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/database.js';

const router = Router();

// ============================================================================
// HELPER: Verificar se usuário é admin
// ============================================================================
async function verificarAdmin(req: any): Promise<boolean> {
  const usuarioId = req.user?.id;
  if (!usuarioId) return false;

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('user_type')
    .eq('id', usuarioId)
    .single();

  return usuario?.user_type === 'admin';
}

// ============================================================================
// POST /api/usuario/criar - Admin cria novo analista
// ============================================================================
router.post('/criar', async (req: any, res: Response) => {
  try {
    // Verificar se é admin
    const ehAdmin = await verificarAdmin(req);
    if (!ehAdmin) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Apenas admin pode criar usuários'
      });
    }

    const { email, nome, user_type } = req.body;

    // Validações
    if (!email || !nome || !user_type) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email, nome e tipo de usuário são obrigatórios'
      });
    }

    if (!['analyst', 'client', 'admin'].includes(user_type)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Tipo de usuário inválido'
      });
    }

    // Verificar se email já existe
    const { data: usuarioExistente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    if (usuarioExistente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email já cadastrado'
      });
    }

    // Gerar senha temporária
    const senhaPorPadrao = `${Math.random().toString(36).substring(2, 10)}`;

    // Criar usuário
    const { data: novoUsuario, error: erro } = await supabase
      .from('usuarios')
      .insert([
        {
          email,
          nome,
          user_type,
          senha_hash: senhaPorPadrao, // TODO: Hashear com bcrypt em produção
          ativo: true,
          data_criacao: new Date().toISOString(),
        }
      ])
      .select();

    if (erro) {
      console.error('Erro ao criar usuário:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao criar usuário'
      });
    }

    console.log(`✅ Usuário criado: ${email}`);

    return res.json({
      sucesso: true,
      mensagem: 'Usuário criado com sucesso',
      dados: {
        id: novoUsuario[0].id,
        email,
        nome,
        user_type,
        senha_temporaria: senhaPorPadrao
      }
    });

  } catch (erro) {
    console.error('❌ Erro ao criar usuário:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno do servidor'
    });
  }
});

// ============================================================================
// GET /api/usuario/listar - Admin lista todos os usuários
// ============================================================================
router.get('/listar', async (req: any, res: Response) => {
  try {
    const ehAdmin = await verificarAdmin(req);
    if (!ehAdmin) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Apenas admin pode listar usuários'
      });
    }

    const { data: usuarios, error: erro } = await supabase
      .from('usuarios')
      .select('id, email, nome, user_type, ativo, data_criacao')
      .order('data_criacao', { ascending: false });

    if (erro) {
      console.error('Erro ao listar usuários:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao listar usuários'
      });
    }

    return res.json({
      sucesso: true,
      dados: usuarios,
      total: usuarios?.length || 0
    });

  } catch (erro) {
    console.error('❌ Erro ao listar usuários:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno do servidor'
    });
  }
});

// ============================================================================
// PUT /api/usuario/:id - Admin edita usuário
// ============================================================================
router.put('/:id', async (req: any, res: Response) => {
  try {
    const ehAdmin = await verificarAdmin(req);
    if (!ehAdmin) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Apenas admin pode editar usuários'
      });
    }

    const { id } = req.params;
    const { email, nome, user_type, ativo } = req.body;

    // Validações
    if (!email || !nome || user_type === undefined || ativo === undefined) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email, nome, tipo de usuário e status são obrigatórios'
      });
    }

    // Atualizar usuário
    const { error: erro } = await supabase
      .from('usuarios')
      .update({
        email,
        nome,
        user_type,
        ativo,
        data_atualizacao: new Date().toISOString()
      })
      .eq('id', id);

    if (erro) {
      console.error('Erro ao editar usuário:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao editar usuário'
      });
    }

    console.log(`✅ Usuário ${id} editado com sucesso`);

    return res.json({
      sucesso: true,
      mensagem: 'Usuário editado com sucesso'
    });

  } catch (erro) {
    console.error('❌ Erro ao editar usuário:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno do servidor'
    });
  }
});

// ============================================================================
// DELETE /api/usuario/:id - Admin deleta usuário
// ============================================================================
router.delete('/:id', async (req: any, res: Response) => {
  try {
    const ehAdmin = await verificarAdmin(req);
    if (!ehAdmin) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Apenas admin pode deletar usuários'
      });
    }

    const { id } = req.params;

    // Não permitir deletar a si mesmo
    if (req.user?.id === id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Você não pode deletar a sua própria conta'
      });
    }

    // Deletar usuário
    const { error: erro } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (erro) {
      console.error('Erro ao deletar usuário:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao deletar usuário'
      });
    }

    console.log(`✅ Usuário ${id} deletado com sucesso`);

    return res.json({
      sucesso: true,
      mensagem: 'Usuário deletado com sucesso'
    });

  } catch (erro) {
    console.error('❌ Erro ao deletar usuário:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno do servidor'
    });
  }
});

// ============================================================================
// POST /api/usuario/alterar-senha - Altera a senha do usuário
// ============================================================================
router.post('/alterar-senha', async (req: Request, res: Response) => {
  try {
    const { usuarioId, senhaAtual, senhaNova } = req.body;

    // Validações
    if (!usuarioId || !senhaAtual || !senhaNova) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Todos os campos são obrigatórios'
      });
    }

    if (senhaNova.length < 6) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'A nova senha deve ter no mínimo 6 caracteres'
      });
    }

    // Buscar usuário
    const { data: usuario, error: erroUsuario } = await supabase
      .from('usuarios')
      .select('id, senha_hash, email')
      .eq('id', usuarioId)
      .single();

    if (erroUsuario || !usuario) {
      console.error('Erro ao buscar usuário:', erroUsuario);
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado'
      });
    }

    // Verificar senha atual
    const senhaCorreta = senhaAtual === usuario.senha_hash;
    if (!senhaCorreta) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Senha atual incorreta'
      });
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
      console.error('Erro ao atualizar senha:', erroAtualizar);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao atualizar senha'
      });
    }

    console.log(`✅ Senha alterada com sucesso para usuário: ${usuario.email}`);

    return res.json({
      sucesso: true,
      mensagem: 'Senha alterada com sucesso'
    });

  } catch (erro) {
    console.error('❌ Erro ao alterar senha:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno do servidor',
      detalhes: (erro as Error).message
    });
  }
});

export default router;
