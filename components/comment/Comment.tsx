"use client";

import {useState} from "react";
import {useMediaQuery} from "@/hooks/use-media-query";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface Comment {
    id: number;
    request_id: number;
    user: {
        id: number;
        full_name: string;
        role?: string;
    };
    comment: string;
    timestamp: string | Date;
    sender_id: number;
    user_id: number;
    created_at: string;
    updated_at: string;
}

interface CommentListProps {
    comments: Comment[];
    currentUserId: number | string | null;
    onEdit: (id: number, comment: string) => void;
    onDelete: (id: number) => void;
    variant?: "default" | "dark";
}

const roleTranslations: Record<string, string> = {
    client: "Клиент",
    "admin-worker": "Администратор офиса",
    "department-head": "Офис менеджер",
    executor: "Исполнитель",
    manager: "Руководитель",
};

export function CommentList({
                                comments,
                                currentUserId,
                                onEdit,
                                onDelete,
                                variant = "default",
                            }: CommentListProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const [showActions, setShowActions] = useState<{
        visible: boolean;
        comment: Comment | null;
    }>({ visible: false, comment: null });
    const [activeCommentId, setActiveCommentId] = useState<number | null>(null); // Для подсветки

    const [visibleCount, setVisibleCount] = useState(6);

    const openActions = (comment: Comment) => {
        if (comment.user.id !== currentUserId) return;

        setActiveCommentId(comment.id);
        setShowActions({ visible: true, comment });
    };

    const closeActions = () => {
        setShowActions({ visible: false, comment: null });
        setActiveCommentId(null);
    };

    const showAllComments = () => setVisibleCount(comments.length);
    const collapseComments = () => setVisibleCount(6);
    const displayedComments = comments.slice(0, visibleCount);

    const isDark = variant === "dark";

    return (
        <div className="space-y-3">
            {!isDark && <h4 className="font-semibold mb-3 text-gray-800">Комментарии</h4>}

            {comments.length === 0 ? (
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Комментариев пока нет</p>
            ) : (
                <>
                    <div className="space-y-3">
                        {displayedComments.map((c) => {
                            const isOwnComment = c.user.id === currentUserId;
                            const formattedTime = new Date(c.timestamp).toLocaleString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                            });

                            return (
                                <div
                                    key={c.id}
                                    className={`flex items-start gap-2.5 group relative transition-colors duration-150 ${
                                        activeCommentId === c.id
                                            ? isDark ? "bg-[#114A65]/20" : "bg-[#114A65]/10"
                                            : isDark ? "hover:bg-gray-800/50" : "hover:bg-gray-50"
                                    }`}
                                    style={{ WebkitUserSelect: "none", userSelect: "none", position: 'relative', borderRadius: '0.5rem', padding: '0.5rem' }}
                                    onContextMenu={(e) => {
                                        if (!isDesktop || !isOwnComment) return;
                                        e.preventDefault();
                                        openActions(c);
                                    }}
                                    onTouchStart={(e) => {
                                        if (isDesktop || !isOwnComment) return;
                                        const timer = setTimeout(() => {
                                            e.preventDefault(); // только при долгом нажатии
                                            openActions(c);
                                        }, 500);
                                        const clearTimer = () => clearTimeout(timer);
                                        document.addEventListener("touchend", clearTimer, { once: true });
                                        document.addEventListener("touchmove", clearTimer, { once: true });
                                    }}
                                >
                                    {/* Аватарка */}
                                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#114A65] to-[#B8400E] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {c.user.full_name?.charAt(0).toUpperCase() || "U"}
                    </span>
                                    </div>

                                    {/* Основной блок */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                      <span className={`font-medium text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                        {c.user.full_name}
                      </span>
                                            {c.user.role && (
                                                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          ({roleTranslations[c.user.role] || c.user.role})
                        </span>
                                            )}
                                        </div>
                                        <div className={`rounded-lg p-3 mb-1 ${isDark ? "bg-[#262626]" : "bg-gray-50"}`}>
                                            <p className={`text-sm leading-relaxed break-words ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                                                {c.comment}
                                            </p>
                                        </div>
                                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>{formattedTime}</p>
                                    </div>

                                    {/* Иконка действий (десктоп) */}
                                    {isOwnComment && isDesktop && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openActions(c);
                                            }}
                                            className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 focus:opacity-100 ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
                                            aria-label="Меню действий"
                                        >
                                            <span className="text-lg">⋯</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {comments.length > 6 && (
                        <div className="mt-2">
                            {visibleCount >= comments.length ? (
                                <button
                                    onClick={collapseComments}
                                    className={`text-sm underline ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
                                >
                                    Скрыть комментарии
                                </button>
                            ) : (
                                <button
                                    onClick={showAllComments}
                                    className={`text-sm underline ${isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}
                                >
                                    Показать ещё ({comments.length - visibleCount})
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

                        {/* Десктопное меню действий */}
            {isDesktop && showActions.visible && showActions.comment && (
                <div
                    className="fixed inset-0 z-50"
                    onClick={closeActions}
                >
                    <div
                        className="absolute inset-0 bg-black bg-opacity-20"
                        onClick={closeActions}
                    />
                    <div
                        className="absolute bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px]"
                        style={{
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                onEdit(showActions.comment!.id, showActions.comment!.comment);
                                closeActions();
                            }}
                            className="w-full text-left text-sm text-gray-800 py-2 px-4 hover:bg-gray-100 transition-colors rounded-t-lg"
                        >
                            Изменить
                        </button>
                        <button
                            onClick={() => {
                                onDelete(showActions.comment!.id);
                                closeActions();
                            }}
                            className="w-full text-left text-sm text-red-600 py-2 px-4 hover:bg-red-50 transition-colors rounded-b-lg"
                        >
                            Удалить
                        </button>
                    </div>
                </div>
            )}

            {/* Мобильное bottom sheet (Instagram-style) */}
            {!isDesktop && showActions.visible && showActions.comment && (
                <div
                    className="fixed inset-0 z-[70] flex items-end animate-fade-in"
                    onClick={closeActions}
                >
                    <div
                        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
                        onClick={closeActions}
                    />
                    <div className={`relative w-full rounded-t-2xl shadow-2xl pb-4 animate-slide-up ${isDark ? "bg-[#1C1C1E]" : "bg-white"}`}>
                        <div className="flex flex-col space-y-1 px-4 pt-2">
                            <button
                                onClick={() => {
                                    onEdit(showActions.comment!.id, showActions.comment!.comment);
                                    closeActions();
                                }}
                                className={`text-left text-sm font-medium py-3 px-4 rounded-lg transition-colors ${isDark ? "text-white hover:bg-gray-800" : "text-gray-800 hover:bg-gray-100"}`}
                            >
                                Изменить
                            </button>
                            <button
                                onClick={() => {
                                    onDelete(showActions.comment!.id);
                                    closeActions();
                                }}
                                className={`text-left text-sm font-medium py-3 px-4 rounded-lg transition-colors ${isDark ? "text-red-400 hover:bg-gray-800" : "text-red-600 hover:bg-red-50"}`}
                            >
                                Удалить
                            </button>
                        </div>
                        <button
                            onClick={closeActions}
                            className={`mt-4 w-full text-center text-sm py-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                            Отменить
                        </button>
                    </div>
                </div>
            )}

            {/* CSS для анимаций (можно вынести в CSS файл) */}
            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
      `}</style>
        </div>
    );
}