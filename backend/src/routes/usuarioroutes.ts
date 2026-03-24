import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/database.js';


const router = Router();


/**
 * POST /api/usuario/alterar-senha
 * Altera a senha do usuário
 * 
 * Body:
 * {
 *   usuarioId: string (uuid do usuário)
 *   senhaAtual: string (senha atual)
 *   senhaNova: string (nova senha)
 * }
 */
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

    // 1. Buscar usuário no Supabase
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

    // 2. Verificar se a senha atual está correta
    const senhaCorreta = senhaAtual === usuario.senha_hash;
    if (!senhaCorreta) {
      return res.status(401).json({ 
        sucesso: false,
        mensagem: 'Senha atual incorreta' 
      });
    }

    // 3. Sem hash, texto puro
    const novaSenhaHash = senhaNova;  

    // 4. Atualizar no Supabase
    const { error: erroAtualizar } = await supabase
      .from('usuarios')
      .update({
        senha_hash: novaSenhaHash,
        data_atualizacao: new Date().toISOString(),
      })
      .eq('id', usuarioId);

    if (erroAtualizar) {
      console.error('Erro ao atualizar senha:', erroAtualizar);
      return res.status(500).json({ 
        sucesso: false,
        mensagem: 'Erro ao atualizar senha no banco de dados' 
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
