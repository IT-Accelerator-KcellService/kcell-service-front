"use client";

import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface Comment {
    id: number;
    request_id: number;
    user: {
        id: number;
        full_name: string;
        role?: string;
    };
    comment: string;
    timestamp: string | Date;
}

interface CommentListProps {
    comments: Comment[];
    currentUserId: number | string | null;
    onEdit: (id: number, comment: string) => void;
    onDelete: (id: number) => void;
}

const roleTranslations: Record<string, string> = {
    client: "Клиент",
    "admin-worker": "Администратор офиса",
    "department-head": "Руководитель направления",
    executor: "Исполнитель",
    manager: "Руководитель",
};

export function CommentList({
                                comments,
                                currentUserId,
                                onEdit,
                                onDelete,
                            }: CommentListProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const [showActions, setShowActions] = useState<{
        visible: boolean;
        comment: Comment | null;
    }>({ visible: false, comment: null });

    // 🔹 Контроль количества видимых комментариев
    const [visibleCount, setVisibleCount] = useState(6);

    const openActions = (comment: Comment) => {
        if (comment.user.id !== currentUserId) return;

        // 🔁 Если уже открыто для этого комментария — закрываем
        if (showActions.visible && showActions.comment?.id === comment.id) {
            setShowActions({ visible: false, comment: null });
        } else {
            setShowActions({ visible: true, comment });
        }
    };

    const closeActions = () => {
        setShowActions({ visible: false, comment: null });
    };

    // Показать все комментарии
    const showAllComments = () => {
        setVisibleCount(comments.length);
    };

    // Показать только первые 6
    const collapseComments = () => {
        setVisibleCount(6);
    };

    // Отображаем только нужное количество
    const displayedComments = comments.slice(0, visibleCount);

    return (
        <div className="space-y-3">
            <h4 className="font-semibold mb-3 text-gray-800">Комментарии</h4>

            {comments.length === 0 ? (
                <p className="text-sm text-gray-500">Комментариев пока нет</p>
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
                                    className="flex items-start gap-2.5 group relative"
                                    style={{ position: 'relative' }}
                                    onContextMenu={(e) => {
                                        if (!isDesktop || !isOwnComment) return;
                                        e.preventDefault();
                                        openActions(c);
                                    }}
                                    onTouchStart={() => {
                                        if (isDesktop || !isOwnComment) return;
                                        const timer = setTimeout(() => openActions(c), 500);
                                        const clearTimer = () => clearTimeout(timer);
                                        document.addEventListener("touchend", clearTimer, { once: true });
                                        document.addEventListener("touchmove", clearTimer, { once: true });
                                    }}
                                >
                                    {/* Аватарка */}
                                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {c.user.full_name?.charAt(0).toUpperCase() || "U"}
                    </span>
                                    </div>

                                    {/* Основной блок */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {c.user.full_name}
                      </span>
                                            {c.user.role && (
                                                <span className="text-xs text-gray-500">
                          ({roleTranslations[c.user.role] || c.user.role})
                        </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-700 mt-0.5 leading-snug whitespace-pre-wrap">
                                            {c.comment}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">{formattedTime}</p>
                                    </div>

                                    {/* Иконка действий (десктоп) */}
                                    {isOwnComment && isDesktop && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openActions(c);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-500 hover:text-gray-700 focus:opacity-100"
                                            aria-label="Меню действий"
                                        >
                                            <span className="text-lg">⋯</span>
                                        </button>
                                    )}

                                    {/* Меню действий (десктоп) */}
                                    {isOwnComment && isDesktop && showActions.visible && showActions.comment?.id === c.id && (
                                        <div
                                            className="absolute right-0 top-full mt-1 w-28 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => {
                                                    onEdit(c.id, c.comment);
                                                    closeActions();
                                                }}
                                                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-50"
                                            >
                                                Изменить
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onDelete(c.id);
                                                    closeActions();
                                                }}
                                                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Кнопка "Показать ещё" или "Скрыть" */}
                    {comments.length > 6 && (
                        <div className="mt-2">
                            {visibleCount >= comments.length ? (
                                <button
                                    onClick={collapseComments}
                                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                                >
                                    Скрыть комментарии
                                </button>
                            ) : (
                                <button
                                    onClick={showAllComments}
                                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                                >
                                    Показать ещё ({comments.length - visibleCount})
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Мобильное bottom sheet */}
            {!isDesktop && showActions.visible && showActions.comment && (
                <div
                    className="fixed inset-0 z-50 flex items-end"
                    onClick={closeActions}
                >
                    <div className="bg-black bg-opacity-50 w-full h-full" />
                    <div className="bg-white w-full rounded-t-2xl p-4 shadow-lg">
                        <div className="flex flex-col space-y-3">
                            <button
                                onClick={() => {
                                    onEdit(showActions.comment!.id, showActions.comment!.comment);
                                    closeActions();
                                }}
                                className="text-left text-sm font-medium text-gray-800 py-3 px-4 hover:bg-gray-100 rounded-lg transition"
                            >
                                Изменить
                            </button>
                            <button
                                onClick={() => {
                                    onDelete(showActions.comment!.id);
                                    closeActions();
                                }}
                                className="text-left text-sm font-medium text-red-600 py-3 px-4 hover:bg-red-50 rounded-lg transition"
                            >
                                Удалить
                            </button>
                        </div>
                        <button
                            onClick={closeActions}
                            className="mt-4 w-full text-center text-sm text-gray-500 py-2"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}