import { useEffect, useState, useCallback, useRef } from 'react';
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
  const notifiedIdsRef = useRef<Set<number>>(new Set());

  // Função para buscar equipamentos com status atualizado
  const checkForUpdates = useCallback(async () => {
    if (!userId) return;

    try {
      // Buscar equipamentos que não estão mais pendentes
      const { data, error } = await supabase
        .from('pendingequipment')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'Pendente')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao buscar notificações:', error);
        return;
      }

      if (data && data.length > 0) {
        // Encontrar o primeiro equipamento que ainda não foi notificado
        const unnotifiedEquipment = data.find(
          (equipment) => !notifiedIdsRef.current.has(equipment.id)
        );

        if (unnotifiedEquipment) {
          // Marcar como notificado
          notifiedIdsRef.current.add(unnotifiedEquipment.id);

          // Criar mensagem baseada no status
          let message = '';
          let type: 'sucesso' | 'erro' | 'aviso' = 'aviso';

          if (unnotifiedEquipment.status === 'Aprovado') {
            message = `✅ Equipamento ${unnotifiedEquipment.numero_serie} foi APROVADO! Ele será adicionado ao seu contrato em breve.`;
            type = 'sucesso';
          } else if (unnotifiedEquipment.status === 'Rejeitado') {
            message = `❌ Equipamento ${unnotifiedEquipment.numero_serie} foi REJEITADO.${
              unnotifiedEquipment.analyst_notes ? ` Motivo: ${unnotifiedEquipment.analyst_notes}` : ''
            }`;
            type = 'erro';
          }

          // Mostrar notificação
          setNotification({
            id: unnotifiedEquipment.id,
            numero_serie: unnotifiedEquipment.numero_serie,
            status: unnotifiedEquipment.status,
            analyst_notes: unnotifiedEquipment.analyst_notes,
            message,
            type,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
    }
  }, [userId]);

  // Verificar atualizações ao montar e a cada 30 segundos
  useEffect(() => {
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 30000); // Verificar a cada 30 segundos

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  // Limpar notificação
  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return { notification, clearNotification };
}
