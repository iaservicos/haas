import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

export interface PendingEquipmentNotification {
  id: number;
  numero_serie: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  analyst_notes?: string;
  message: string;
  type: 'sucesso' | 'erro' | 'aviso';
}

export function usePendingEquipmentNotifications(userId: string | undefined) {
  const [notification, setNotification] = useState<PendingEquipmentNotification | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date());

  // Função para buscar equipamentos com status atualizado
  const checkForUpdates = useCallback(async () => {
    if (!userId) return;

    try {
      // Buscar equipamentos pendentes que foram atualizados depois da última verificação
      const { data, error } = await supabase
        .from('pendingequipment')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'Pendente')
        .gt('updated_at', lastCheckedAt.toISOString())
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar notificações:', error);
        return;
      }

      if (data && data.length > 0) {
        const equipment = data[0];

        // Criar mensagem baseada no status
        let message = '';
        let type: 'sucesso' | 'erro' | 'aviso' = 'aviso';

        if (equipment.status === 'Aprovado') {
          message = `✅ Equipamento ${equipment.numero_serie} foi APROVADO! Ele será adicionado ao seu contrato em breve.`;
          type = 'sucesso';
        } else if (equipment.status === 'Rejeitado') {
          message = `❌ Equipamento ${equipment.numero_serie} foi REJEITADO.${
            equipment.analyst_notes ? ` Motivo: ${equipment.analyst_notes}` : ''
          }`;
          type = 'erro';
        }

        // Mostrar notificação
        setNotification({
          id: equipment.id,
          numero_serie: equipment.numero_serie,
          status: equipment.status,
          analyst_notes: equipment.analyst_notes,
          message,
          type,
        });

        // Atualizar último tempo de verificação
        setLastCheckedAt(new Date(equipment.updated_at));
      }
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
    }
  }, [userId, lastCheckedAt]);

  // Verificar atualizações ao montar e a cada 10 segundos
  useEffect(() => {
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 10000); // Verificar a cada 10 segundos

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  // Limpar notificação
  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return { notification, clearNotification };
}