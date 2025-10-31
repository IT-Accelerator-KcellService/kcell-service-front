import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Comment } from '@/components/comment/Comment';

interface UseCommentsProps {
  requestId: number | null;
  currentUserId: number | null;
  user: any;
}

export const useComments = ({ requestId, currentUserId, user }: UseCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchComments = useCallback(async (requestId: number) => {
    try {
      setIsLoading(true);
      const res = await api.get(`/comments/request/${requestId}`);
      setComments(res.data);
    } catch (error) {
      console.error("Ошибка при загрузке комментариев:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addComment = useCallback(async (commentText: string) => {
    if (!requestId || !commentText.trim()) return;

    const tempId = -(Date.now());
    const newComment: Comment = {
      id: tempId,
      comment: commentText.trim(),
      user_id: currentUserId || 0,
      request_id: requestId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: { 
        id: user?.id ? user.id : 0, 
        full_name: user?.full_name ? user.full_name : 'Вы', 
        role: user?.role ? user.role : '' 
      },
      sender_id: user?.id ? user.id : 0,
      timestamp: new Date().toISOString(),
    };

    // Оптимистичное обновление
    setComments(prev => [...prev, newComment]);

    try {
      const response = await api.post(`/comments`, {
        comment: commentText.trim(),
        request_id: requestId,
      });
      
      // Заменяем временный комментарий на реальный с сервера
      setComments(prev => prev.map(c => 
        c.id === tempId ? { ...c, ...response.data, id: response.data.id } : c
      ));
    } catch (error) {
      console.error("Ошибка при отправке комментария:", error);
      // Удаляем временный комментарий при ошибке
      setComments(prev => prev.filter(c => c.id !== tempId));
      throw error;
    }
  }, [requestId, currentUserId, user]);

  const updateComment = useCallback(async (commentId: number, newText: string) => {
    const oldComments = comments;
    const updatedComments = comments.map(c => 
      c.id === commentId ? { ...c, comment: newText.trim() } : c
    );
    
    // Оптимистичное обновление
    setComments(updatedComments);

    try {
      const response = await api.put(`/comments/${commentId}`, {
        comment: newText.trim(),
      });
      
      // Обновляем комментарий с данными с сервера
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, ...response.data } : c
      ));
    } catch (error) {
      console.error("Ошибка при редактировании комментария:", error);
      setComments(oldComments); // Откатываем при ошибке
      throw error;
    }
  }, [comments]);

  const deleteComment = useCallback(async (commentId: number) => {
    const oldComments = comments;
    
    // Оптимистичное обновление
    setComments(prev => prev.filter(c => c.id !== commentId));
    
    try {
      await api.delete(`/comments/${commentId}`);
      // Не делаем повторный запрос - используем оптимистичное обновление
    } catch (error) {
      console.error("Ошибка при удалении комментария:", error);
      setComments(oldComments); // Восстанавливаем при ошибке
      throw error;
    }
  }, [comments]);

  const initializeComments = useCallback((requestId: number) => {
    if (!isInitialized) {
      fetchComments(requestId);
      setIsInitialized(true);
    }
  }, [fetchComments, isInitialized]);

  const resetComments = useCallback(() => {
    setComments([]);
    setIsInitialized(false);
  }, []);

  return {
    comments,
    isLoading,
    isInitialized,
    addComment,
    updateComment,
    deleteComment,
    initializeComments,
    resetComments,
    fetchComments, // Для принудительного обновления
  };
};
