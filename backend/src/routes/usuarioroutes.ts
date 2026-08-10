import { Router, Request, Response } from 'express';
import usuarioService from '../services/usuarioService.js';

const router = Router();

router.post('/criar', async (req: any, res: Response) => {
  try {
    const ehAdmin = await usuarioService.verificarAdmin(req);
    if (!ehAdmin) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Apenas admin pode criar usuários'
      });
    }

    const { email, nome, user_type } = req.body;

    if (!email || !nome || !user_type) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email, nome e tipo de usuário são obrigatórios'
      });
    }

    if (!usuarioService.validarTipoUsuario(user_type)) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Tipo de usuário inválido'
      });
    }

    const emailExiste = await usuarioService.emailJaExiste(email);
    if (emailExiste) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email já cadastrado'
      });
    }

    const dados = await usuarioService.criar({ email, nome, user_type });

    return res.json({
      sucesso: true,
      mensagem: 'Usuário criado com sucesso',
      dados
    });

  } catch (erro: any) {
    console.error('❌ Erro ao criar usuário:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: erro.message || 'Erro interno do servidor'
    });
  }
});

router.get('/listar', async (req: any, res: Response) => {
  try {
    const ehAdmin = await usuarioService.verificarAdmin(req);
    if (!ehAdmin) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Apenas admin pode listar usuários'
      });
    }

    const usuarios = await usuarioService.listar();

    return res.json({
      sucesso: true,
      dados: usuarios,
      total: usuarios.length
    });

  } catch (erro: any) {
    console.error('❌ Erro ao listar usuários:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: erro.message || 'Erro interno do servidor'
    });
  }
});

router.put('/:id', async (req: any, res: Response) => {
  try {
    const ehAdmin = await usuarioService.verificarAdmin(req);
    if (!ehAdmin) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Apenas admin pode editar usuários'
      });
    }

    const { id } = req.params;
    const { email, nome, user_type, ativo } = req.body;

    if (!email || !nome || user_type === undefined || ativo === undefined) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Email, nome, tipo de usuário e status são obrigatórios'
      });
    }

    await usuarioService.editar(id, { email, nome, user_type, ativo });

    return res.json({
      sucesso: true,
      mensagem: 'Usuário editado com sucesso'
    });

  } catch (erro: any) {
    console.error('❌ Erro ao editar usuário:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: erro.message || 'Erro interno do servidor'
    });
  }
});

router.delete('/:id', async (req: any, res: Response) => {
  try {
    const ehAdmin = await usuarioService.verificarAdmin(req);
    if (!ehAdmin) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Apenas admin pode deletar usuários'
      });
    }

    const { id } = req.params;

    await usuarioService.deletar(id, req.user?.id);

    return res.json({
      sucesso: true,
      mensagem: 'Usuário deletado com sucesso'
    });

  } catch (erro: any) {
    console.error('❌ Erro ao deletar usuário:', erro);
    return res.status(500).json({
      sucesso: false,
      mensagem: erro.message || 'Erro interno do servidor'
    });
  }
});

router.post('/alterar-senha', async (req: Request, res: Response) => {
  try {
    const { usuarioId, senhaAtual, senhaNova } = req.body;

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

    await usuarioService.alterarSenha(usuarioId, senhaAtual, senhaNova);

    return res.json({
      sucesso: true,
      mensagem: 'Senha alterada com sucesso'
    });

  } catch (erro: any) {
    console.error('❌ Erro ao alterar senha:', erro);
    const status = erro.message === 'Usuário não encontrado' ? 404 :
                   erro.message === 'Senha atual incorreta' ? 401 : 500;
    return res.status(status).json({
      sucesso: false,
      mensagem: erro.message || 'Erro interno do servidor'
    });
  }
});

export default router;
