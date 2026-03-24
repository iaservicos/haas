/**
 * Rotas para sincronização de fotos do GPTMaker
 * 
 * POST /api/gptmaker/sync-photos - Sincroniza fotos manualmente
 */

import { Router, Request, Response } from 'express';
import { syncPhotosFromGPTMaker } from '../services/gptmakerSync.js';

const router = Router();

/**
 * POST /api/gptmaker/sync-photos
 * Sincroniza as fotos do GPTMaker para o Power Automate
 */
router.post('/sync-photos', async (req: Request, res: Response) => {
  try {
    console.log('[API] Requisição de sincronização manual de fotos');

    const result = await syncPhotosFromGPTMaker();

    if (result.success) {
      return res.status(200).json({
        sucesso: true,
        mensagem: result.message,
        fotosCount: result.photosCount,
      });
    } else {
      return res.status(500).json({
        sucesso: false,
        mensagem: result.message,
        fotosCount: result.photosCount,
      });
    }
  } catch (error) {
    console.error('[API] Erro ao sincronizar fotos:', error);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao sincronizar fotos',
      detalhes: error instanceof Error ? error.message : 'Desconhecido',
    });
  }
});

export default router;
