import { create } from 'zustand';
import { Comment } from '@/components/comment/Comment';
import { api } from '@/lib/api';

interface CommentsState {
  comments: Record<number, Comment[]>; // requestId -> comments
  loading: Record<number, boolean>;
  initialized: Record<number, boolean>;
  
  // Actions
  fetchComments: (requestId: number) => Promise<void>;
  addComment: (requestId: number, commentText: string, user: any) => Promise<void>;
  updateComment: (requestId: number, commentId: number, newText: string) => Promise<void>;
  deleteComment: (requestId: number, commentId: number) => Promise<void>;
  resetComments: (requestId: number) => void;
  clearAllComments: () => void;
}

export const useCommentsStore = create<CommentsState>((set, get) => ({
  comments: {},
  loading: {},
  initialized: {},

  fetchComments: async (requestId: number) => {
    const { comments, loading, initialized } = get();
    
    // Если уже загружены, не делаем повторный запрос
    if (initialized[requestId]) return;

    set(state => ({
      loading: { ...state.loading, [requestId]: true }
    }));

    try {
      const res = await api.get(`/comments/request/${requestId}`);
      set(state => ({
        comments: { ...state.comments, [requestId]: res.data },
        loading: { ...state.loading, [requestId]: false },
        initialized: { ...state.initialized, [requestId]: true }
      }));
    } catch (error) {
      console.error("Ошибка при загрузке комментариев:", error);
      set(state => ({
        loading: { ...state.loading, [requestId]: false }
      }));
    }
  },

  addComment: async (requestId: number, commentText: string, user: any) => {
    if (!commentText.trim()) return;

    const tempId = -(Date.now());
    const newComment: Comment = {
      id: tempId,
      comment: commentText.trim(),
      user_id: user?.id || 0,
      request_id: requestId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: { 
        id: user?.id || 0, 
        full_name: user?.full_name || 'Вы', 
        role: user?.role || '' 
      },
      sender_id: user?.id || 0,
      timestamp: new Date().toISOString(),
    };

    // Оптимистичное обновление
    set(state => ({
      comments: {
        ...state.comments,
        [requestId]: [...(state.comments[requestId] || []), newComment]
      }
    }));

    try {
      const response = await api.post(`/comments`, {
        comment: commentText.trim(),
        request_id: requestId,
      });
      
      // Заменяем временный комментарий на реальный с сервера
      set(state => ({
        comments: {
          ...state.comments,
          [requestId]: (state.comments[requestId] || []).map(c => 
            c.id === tempId ? { ...c, ...response.data, id: response.data.id } : c
          )
        }
      }));
    } catch (error) {
      console.error("Ошибка при отправке комментария:", error);
      // Удаляем временный комментарий при ошибке
      set(state => ({
        comments: {
          ...state.comments,
          [requestId]: (state.comments[requestId] || []).filter(c => c.id !== tempId)
        }
      }));
      throw error;
    }
  },

  updateComment: async (requestId: number, commentId: number, newText: string) => {
    const { comments } = get();
    const currentComments = comments[requestId] || [];
    const oldComments = [...currentComments];
    
    // Оптимистичное обновление
    const updatedComments = currentComments.map(c => 
      c.id === commentId ? { ...c, comment: newText.trim() } : c
    );
    
    set(state => ({
      comments: {
        ...state.comments,
        [requestId]: updatedComments
      }
    }));

    try {
      const response = await api.put(`/comments/${commentId}`, {
        comment: newText.trim(),
        request_id: requestId
      });
      
      // Обновляем комментарий с данными с сервера
      set(state => ({
        comments: {
          ...state.comments,
          [requestId]: (state.comments[requestId] || []).map(c => 
            c.id === commentId ? { ...c, ...response.data } : c
          )
        }
      }));
    } catch (error) {
      console.error("Ошибка при редактировании комментария:", error);
      // Откатываем при ошибке
      set(state => ({
        comments: {
          ...state.comments,
          [requestId]: oldComments
        }
      }));
      throw error;
    }
  },

  deleteComment: async (requestId: number, commentId: number) => {
    const { comments } = get();
    const currentComments = comments[requestId] || [];
    const oldComments = [...currentComments];
    
    // Оптимистичное обновление
    set(state => ({
      comments: {
        ...state.comments,
        [requestId]: currentComments.filter(c => c.id !== commentId)
      }
    }));
    
    try {
      await api.delete(`/comments/${commentId}`);
      // Не делаем повторный запрос - используем оптимистичное обновление
    } catch (error) {
      console.error("Ошибка при удалении комментария:", error);
      // Восстанавливаем при ошибке
      set(state => ({
        comments: {
          ...state.comments,
          [requestId]: oldComments
        }
      }));
      throw error;
    }
  },

  resetComments: (requestId: number) => {
    set(state => ({
      comments: { ...state.comments, [requestId]: [] },
      initialized: { ...state.initialized, [requestId]: false }
    }));
  },

  clearAllComments: () => {
    set({
      comments: {},
      loading: {},
      initialized: {}
    });
  }
}));
