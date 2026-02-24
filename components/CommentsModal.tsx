import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, X } from "lucide-react";
import { CommentList, Comment } from "@/components/comment/Comment";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCommentsStore } from "@/stores/useCommentsStore";

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number | null;
  currentUserId?: number | null;
  isDesktop?: boolean;
  variant?: "default" | "admin";
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  requestId,
  currentUserId = null,
  isDesktop = false,
  variant = "default",
}) => {
  const { user } = useAuthStore();
  const {
    comments,
    loading,
    initialized,
    fetchComments,
    addComment,
    updateComment,
    deleteComment,
    resetComments
  } = useCommentsStore();

  const [comment, setComment] = useState("");
  const [editCommentId, setEditCommentId] = useState<number | null>(null);

  // Загрузка комментариев только при первом открытии модального окна
  useEffect(() => {
    if (isOpen && requestId && !initialized[requestId]) {
      fetchComments(requestId);
    }
  }, [isOpen, requestId, initialized, fetchComments]);

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!isOpen) {
      setComment("");
      setEditCommentId(null);
    }
  }, [isOpen]);

  const handleDelete = async (id: number) => {
    if (!requestId) return;
    
    try {
      await deleteComment(requestId, id);
    } catch (err) {
      console.error("Ошибка при удалении комментария:", err);
    }
  };

  const handleSend = async (subRequestId: number) => {
    if (comment.trim() === "") return;

    if (editCommentId) {
      // Редактирование комментария
      try {
        await updateComment(subRequestId, editCommentId, comment.trim());
        setComment("");
        setEditCommentId(null);
      } catch (error) {
        console.error("Ошибка при редактировании комментария:", error);
      }
    } else {
      // Создание нового комментария
      try {
        await addComment(subRequestId, comment.trim(), user);
        setComment("");
      } catch (error) {
        console.error("Ошибка при отправке комментария:", error);
      }
    }
  };

  const handleEdit = (id: number, oldComment: string) => {
    setComment(oldComment);
    setEditCommentId(id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && requestId) {
      e.preventDefault();
      handleSend(requestId);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
  };

  if (!isOpen || !requestId) return null;

  // Админ мобилка: full-screen тёмный дизайн, навбар скрыт под модалкой (z-[60])
  if (variant === "admin" && !isDesktop) {
    return (
      <div className="fixed inset-0 z-[110] flex flex-col bg-black">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
          <h3 className="font-semibold text-lg text-white">Комментарии</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 text-white"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Список комментариев */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading[requestId || 0] ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Загрузка комментариев...</p>
            </div>
          ) : (comments[requestId || 0] || []).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Комментариев пока нет</p>
            </div>
          ) : (
            <CommentList
              comments={comments[requestId || 0] || []}
              currentUserId={currentUserId}
              onEdit={handleEdit}
              onDelete={handleDelete}
              variant="dark"
            />
          )}
        </div>

        {/* Поле ввода — с отступом под safe-area, навбар не виден */}
        <div className="p-4 pt-3 border-t border-gray-800 bg-[#1C1C1E] pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyPress={handleKeyPress}
                onInput={handleInput}
                placeholder="Написать комментарий..."
                className="w-full min-h-[44px] max-h-[120px] p-3 rounded-lg text-sm bg-[#262626] border border-gray-600 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F35713] focus:border-transparent resize-none"
                style={{
                  height: "auto",
                  minHeight: "44px",
                  maxHeight: "120px",
                }}
              />
            </div>
            <button
              onClick={() => handleSend(requestId)}
              disabled={!comment.trim()}
              className="flex-shrink-0 p-3 rounded-lg bg-[#F35713] hover:bg-[#E04A0A] disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Мобильная версия (default) */}
      {!isDesktop && (
        <div className="fixed inset-0 z-50 flex items-end safe-area-bottom">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Панель комментариев */}
          <div className="relative bg-white w-full max-h-[85vh] min-h-[50vh] rounded-t-3xl flex flex-col transform translate-y-0 transition-all duration-300 ease-out shadow-2xl animate-in slide-in-from-bottom-8">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">Комментарии</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Список комментариев */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {loading[requestId || 0] ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Загрузка комментариев...</p>
                </div>
              ) : (comments[requestId || 0] || []).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Комментариев пока нет</p>
                </div>
              ) : (
                <CommentList
                  comments={comments[requestId || 0] || []}
                  currentUserId={currentUserId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </div>

            {/* Поле ввода */}
            <div className="p-4 border-t bg-gray-50 safe-area-bottom">
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onInput={handleInput}
                    placeholder="Написать комментарий..."
                    className="w-full min-h-[40px] max-h-[120px] p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#114A65] focus:border-transparent resize-none"
                    style={{
                      height: 'auto',
                      minHeight: '40px',
                      maxHeight: '120px'
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSend(requestId)}
                  className="bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] p-3 rounded-lg flex-shrink-0 text-white"
                  disabled={!comment.trim()}
                >
                  <Send className="w-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Десктопная версия - правая панель */}
      {isDesktop && (
        <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
          {/* Заголовок */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-lg">Комментарии</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Список комментариев */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading[requestId || 0] ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Загрузка комментариев...</p>
              </div>
            ) : (comments[requestId || 0] || []).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Комментариев пока нет</p>
              </div>
            ) : (
              <CommentList
                comments={comments[requestId || 0] || []}
                currentUserId={currentUserId}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </div>

          {/* Поле ввода */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onInput={handleInput}
                  placeholder="Написать комментарий..."
                  className="w-full min-h-[40px] max-h-[120px] p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#114A65] focus:border-transparent resize-none"
                  style={{
                    height: 'auto',
                    minHeight: '40px',
                    maxHeight: '120px'
                  }}
                />
              </div>
              <Button
                size="sm"
                onClick={() => handleSend(requestId)}
                className="bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] p-3 rounded-lg flex-shrink-0 text-white"
                disabled={!comment.trim()}
              >
                <Send className="w-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
