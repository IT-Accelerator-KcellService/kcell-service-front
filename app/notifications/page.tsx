"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { createClickableRequestIds } from '@/lib/notificationUtils';
import { useRequestFromNotification } from '@/hooks/useRequestFromNotification';
import { RequestNotFoundModal } from '@/components/RequestNotFoundModal';
import { useAuthStore } from "@/stores/useAuthStore";
import { useMediaQuery } from "@/hooks/use-media-query";

interface Notification {
    id: string;
    title: string;
    content: string;
    created_at: string;
    is_read: boolean;
    user_id: string;
}

interface NotificationsResponse {
    notifications: Notification[];
    totalPages: number;
}

export default function NotificationsPage() {
    const router = useRouter();
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { user } = useAuthStore();
    
    const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { getRequestById } = useRequestFromNotification();
    const [showNotFoundModal, setShowNotFoundModal] = useState(false);
    const [notFoundRequestId, setNotFoundRequestId] = useState<string>('');

    // Основная функция загрузки уведомлений
    const loadNotifications = async (pageNum: number, reset: boolean = false) => {
        if (isLoading) return;

        setIsLoading(true);
        try {
            const res = await api.get<NotificationsResponse>(
                `/notifications/me?page=${pageNum}&pageSize=10`
            );

            setAllNotifications(prev =>
                reset
                    ? res.data.notifications
                    : [...prev, ...res.data.notifications.filter(
                        newNotif => !prev.some(p => p.id === newNotif.id)
                    )]
            );

            setHasMore(pageNum < res.data.totalPages);
            if (reset) setPage(1);
        } catch (err) {
            console.error("Ошибка загрузки уведомлений:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Загрузка при открытии
    useEffect(() => {
        if (user) {
            loadNotifications(1, true);
        }
    }, [user]);

    // Обработчик скролла для подгрузки с throttle
    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el || isLoading || !hasMore) return;

        const {scrollTop, scrollHeight, clientHeight} = el;
        if (scrollHeight - (scrollTop + clientHeight) < 100) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadNotifications(nextPage);
        }
    }, [isLoading, hasMore, page]);

    // Throttle функция с useRef для сохранения состояния между рендерами
    const throttleRef = useRef<NodeJS.Timeout | null>(null);
    const throttledHandleScroll = useCallback(() => {
        if (throttleRef.current) return;
        throttleRef.current = setTimeout(() => {
            handleScroll();
            throttleRef.current = null;
        }, 100);
    }, [handleScroll]);

    // Подписка на скролл
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        el.addEventListener('scroll', throttledHandleScroll, { passive: true });
        return () => el.removeEventListener('scroll', throttledHandleScroll);
    }, [throttledHandleScroll]);

    // Пометить как прочитанное
    const handleNotificationClick = async (notification: Notification) => {
        setAllNotifications(prev =>
            prev.map(n =>
                n.id === notification.id ? {...n, is_read: true} : n
            )
        );
        if (!notification.is_read) {
            try {
                await api.patch(`/notifications/${notification.id}/read`);
            } catch (error) {
                setAllNotifications(prev =>
                    prev.map(n =>
                        n.id === notification.id ? {...n, is_read: false} : n
                    )
                );
                console.error("Ошибка при пометке уведомления как прочитано", error)
            }
        }
    };

    // Форматирование времени
    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) return 'только что';
        if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
        if (diffInHours < 24) return `${diffInHours} ч назад`;
        if (diffInDays < 7) return `${diffInDays} дн назад`;
        
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Обработчик клика по ID заявки
    const handleRequestIdClick = (requestId: string) => {
        // Здесь можно добавить логику для перехода к заявке
        // Пока просто показываем модалку, что заявка не найдена
        setNotFoundRequestId(requestId);
        setShowNotFoundModal(true);
    };

    // Получить иконку для типа уведомления
    const getNotificationIcon = (title: string) => {
        if (title.toLowerCase().includes('принята') || title.toLowerCase().includes('одобрена')) {
            return <CheckCircle className="w-4 h-4 text-green-600" />;
        }
        if (title.toLowerCase().includes('завершена') || title.toLowerCase().includes('выполнена')) {
            return <CheckCircle className="w-4 h-4 text-blue-600" />;
        }
        if (title.toLowerCase().includes('просрочена') || title.toLowerCase().includes('отклонена')) {
            return <AlertCircle className="w-4 h-4 text-red-600" />;
        }
        return <Clock className="w-4 h-4 text-gray-600" />;
    };

    // Получить цвет фона для уведомления
    const getNotificationBgColor = (title: string, isRead: boolean) => {
        if (isRead) return 'bg-gradient-to-r from-[#F3F3F3] to-[#C4C4CE]/30 border-[#C4C4CE] backdrop-blur-sm';
        
        if (title.toLowerCase().includes('принята') || title.toLowerCase().includes('одобрена')) {
            return 'bg-gradient-to-r from-[#114A65]/20 via-[#114A65]/10 to-[#114A65]/20 border-[#114A65]/30 backdrop-blur-md';
        }
        if (title.toLowerCase().includes('завершена') || title.toLowerCase().includes('выполнена')) {
            return 'bg-gradient-to-r from-[#114A65]/20 via-[#B8400E]/10 to-[#114A65]/20 border-[#114A65]/30 backdrop-blur-md';
        }
        if (title.toLowerCase().includes('просрочена') || title.toLowerCase().includes('отклонена')) {
            return 'bg-gradient-to-r from-[#B8400E]/20 via-[#B8400E]/10 to-[#B8400E]/20 border-[#B8400E]/30 backdrop-blur-md';
        }
        return 'bg-gradient-to-r from-[#114A65]/15 via-[#B8400E]/10 to-[#114A65]/15 border-[#114A65]/30 backdrop-blur-md';
    };

    const unreadNotificationCount = allNotifications.filter(n => !n.is_read).length;

    const handleClose = () => {
        router.back();
    };

    if (!user) {
        return null;
    }

    // На мобильных устройствах показываем как полноэкранную страницу
    if (!isDesktop) {
        return (
            <div className="min-h-screen bg-white">
                {/* Заголовок с кнопкой назад */}
                <div className="sticky top-0 z-10 flex items-center border-b border-gray-200 px-4 py-3 bg-white">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="mr-2"
                        onClick={handleClose}
                        aria-label="Назад"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Button>
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-[#114A65] rounded-lg flex items-center justify-center">
                            <Bell className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Уведомления</h2>
                            <p className="text-xs text-gray-600">
                                {unreadNotificationCount > 0 ? `${unreadNotificationCount} новых` : 'Все прочитаны'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Контент с прокруткой */}
                <div
                    ref={containerRef}
                    className="overflow-y-auto pb-4"
                    style={{ height: 'calc(100vh - 64px)' }}
                >
                    <div className="px-4 py-4 space-y-3">
                        {allNotifications.length === 0 && !isLoading ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bell className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-gray-500 font-medium">Нет уведомлений</p>
                                <p className="text-sm text-gray-400 mt-1">Новые уведомления появятся здесь</p>
                            </div>
                        ) : (
                            allNotifications.map((n: any) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 active:scale-[0.98] ${getNotificationBgColor(n.title, n.is_read)} ${
                                        n.is_read ? 'opacity-75' : 'opacity-100'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getNotificationIcon(n.title)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
                                                    {n.title}
                                                </h3>
                                                {!n.is_read && (
                                                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-[#B8400E] bg-[#B8400E]/20 rounded-full whitespace-nowrap">
                                                        Новое
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTimeAgo(n.created_at)}
                                            </p>
                                            <p className="text-sm text-gray-700 mt-2 leading-relaxed line-clamp-3">
                                                {createClickableRequestIds(n.content, handleRequestIdClick)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-center py-6">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="text-sm">Загрузка...</span>
                                </div>
                            </div>
                        )}
                        {!hasMore && allNotifications.length > 0 && !isLoading && (
                            <div className="text-center py-4">
                                <div className="w-8 h-px bg-gray-200 mx-auto mb-3"></div>
                                <p className="text-xs text-gray-400">
                                    Вы достигли конца списка
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Модалка для случая, когда заявка не найдена */}
                <RequestNotFoundModal
                    isOpen={showNotFoundModal}
                    onClose={() => setShowNotFoundModal(false)}
                    requestId={notFoundRequestId}
                />
            </div>
        );
    }

    // На десктопе показываем как модалку
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Фон затемнения */}
            <div 
                className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in"
                onClick={handleClose}
            />

            {/* Модальное окно */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden animate-in zoom-in-95 fade-in duration-300 border border-gray-200">
                {/* Заголовок */}
                <div className="flex items-center border-b border-[#C4C4CE] px-6 py-4 bg-[#F3F3F3]">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-[#114A65] rounded-xl flex items-center justify-center shadow-sm">
                            <Bell className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Уведомления</h2>
                            <p className="text-sm text-gray-600">
                                {unreadNotificationCount > 0 ? `${unreadNotificationCount} новых` : 'Все прочитаны'}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-gray-100"
                        onClick={handleClose}
                        aria-label="Закрыть модальное окно"
                    >
                        <span className="text-2xl text-gray-500">×</span>
                    </Button>
                </div>

                {/* Контент с прокруткой */}
                <div
                    ref={containerRef}
                    className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto custom-scrollbar"
                >
                    <div className="px-4 py-4 space-y-3">
                        {allNotifications.length === 0 && !isLoading ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bell className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-gray-500 font-medium">Нет уведомлений</p>
                                <p className="text-sm text-gray-400 mt-1">Новые уведомления появятся здесь</p>
                            </div>
                        ) : (
                            allNotifications.map((n: any) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${getNotificationBgColor(n.title, n.is_read)} ${
                                        n.is_read ? 'opacity-75' : 'opacity-100'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getNotificationIcon(n.title)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
                                                    {n.title}
                                                </h3>
                                                {!n.is_read && (
                                                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-[#B8400E] bg-[#B8400E]/20 rounded-full whitespace-nowrap">
                                                        Новое
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTimeAgo(n.created_at)}
                                            </p>
                                            <p className="text-sm text-gray-700 mt-2 leading-relaxed line-clamp-3">
                                                {createClickableRequestIds(n.content, handleRequestIdClick)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-center py-6">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="text-sm">Загрузка...</span>
                                </div>
                            </div>
                        )}
                        {!hasMore && allNotifications.length > 0 && !isLoading && (
                            <div className="text-center py-4">
                                <div className="w-8 h-px bg-gray-200 mx-auto mb-3"></div>
                                <p className="text-xs text-gray-400">
                                    Вы достигли конца списка
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Футер */}
                <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/50">
                    <Button
                        onClick={handleClose}
                        variant="outline"
                        className="w-full border-gray-200 hover:bg-gray-50 text-gray-700"
                    >
                        Закрыть
                    </Button>
                </div>
            </div>

            {/* Модалка для случая, когда заявка не найдена */}
            <RequestNotFoundModal
                isOpen={showNotFoundModal}
                onClose={() => setShowNotFoundModal(false)}
                requestId={notFoundRequestId}
            />
        </div>
    );
}

