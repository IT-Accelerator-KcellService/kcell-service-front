import { useCallback } from 'react';
import { useRequestStore, RequestGroup } from '@/stores/useRequestStore';

/**
 * Хук для работы с заявками из уведомлений
 */
export function useRequestFromNotification() {
  const { 
    requests, 
    incomingRequests, 
    myRequests, 
    assignedRequests, 
    completedRequests
  } = useRequestStore();

  /**
   * Ищет заявку в локальном store по ID
   */
  const findRequestInStore = useCallback((requestId: string): RequestGroup | null => {
    const allRequests = [
      ...requests,
      ...incomingRequests,
      ...myRequests,
      ...assignedRequests,
      ...completedRequests
    ];

    // Парсим ID заявки
    const parsedId = parseInt(requestId.split('/')[0]);
    
    return allRequests.find(request => request.id === parsedId) || null;
  }, [requests, incomingRequests, myRequests, assignedRequests, completedRequests]);

  /**
   * Получает заявку по ID (только из локального store)
   */
  const getRequestById = useCallback((requestId: string): RequestGroup | null => {
    return findRequestInStore(requestId);
  }, [findRequestInStore]);

  return {
    findRequestInStore,
    getRequestById
  };
}
