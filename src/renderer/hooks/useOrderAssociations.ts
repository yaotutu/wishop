import { useCallback, useEffect, useState } from 'react';
import type { OrderAssociation } from '../../shared/types';

export function useOrderAssociations(accountId: string) {
  const [associations, setAssociations] = useState<Record<string, OrderAssociation>>({});

  const fetchAssociations = useCallback(async () => {
    if (!accountId) return;
    const result = await window.electronAPI.orderAssociations.list(accountId);
    setAssociations(Object.fromEntries(result.map((association: OrderAssociation) => [association.orderId, association])));
  }, [accountId]);

  const saveAssociation = useCallback(async (orderId: string, input: Pick<OrderAssociation, 'internalRemark' | 'linkedOrders'>) => {
    const association = await window.electronAPI.orderAssociations.set(accountId, orderId, input);
    setAssociations(prev => {
      const next = { ...prev };
      if (association.internalRemark || association.linkedOrders.length > 0) {
        next[association.orderId] = association;
      } else {
        delete next[association.orderId];
      }
      return next;
    });
    return association;
  }, [accountId]);

  useEffect(() => {
    void fetchAssociations();
  }, [fetchAssociations]);

  return { orderAssociations: associations, fetchAssociations, saveAssociation };
}
