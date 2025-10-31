import {Bell, Loader2, LogOut, User, CheckCircle, Clock, AlertCircle, RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import React, {useEffect, useRef, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import api from "@/lib/api";
import { createClickableRequestIds } from '@/lib/notificationUtils';
import { useRequestFromNotification } from '@/hooks/useRequestFromNotification';
import { RequestNotFoundModal } from '@/components/RequestNotFoundModal';


interface HeaderProps {
    setShowProfile: (value: boolean) => void;
    handleLogout: () => void;
    notificationCount?: number;
    role?: string;
    onRefresh?: () => void;
    onRequestClick?: (requestId: string) => boolean;
}

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

const Header: React.FC<HeaderProps> = ({
                                           setShowProfile,
                                           handleLogout,
                                           notificationCount = 0,
                                           role = "Клиент",
                                           onRefresh,
                                           onRequestClick,
                                       }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    // Загрузка при открытии модального окна
    useEffect(() => {
        if (isModalOpen) {
            loadNotifications(1, true);
        }
    }, [isModalOpen]);

    // Первоначальная загрузка
    useEffect(() => {
        loadNotifications(1, true);
    }, []);

    // Обработчик скролла для подгрузки
    const handleScroll = () => {
        const el = containerRef.current;
        if (!el || isLoading || !hasMore) return;

        const {scrollTop, scrollHeight, clientHeight} = el;
        if (scrollHeight - (scrollTop + clientHeight) < 100) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadNotifications(nextPage);
        }
    };

    // Подписка на скролл
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, [isLoading, hasMore, page]);

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
        const request = getRequestById(requestId);
        if (request && onRequestClick) {
            if (onRequestClick(requestId)) {
                setIsModalOpen(false);
                return;
            }
        }
        
        // Заявка не найдена, показываем модалку
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
        if (isRead) return 'bg-gray-50/80 border-gray-100';
        
        if (title.toLowerCase().includes('принята') || title.toLowerCase().includes('одобрена')) {
            return 'bg-green-50/90 border-green-200';
        }
        if (title.toLowerCase().includes('завершена') || title.toLowerCase().includes('выполнена')) {
            return 'bg-blue-50/90 border-blue-200';
        }
        if (title.toLowerCase().includes('просрочена') || title.toLowerCase().includes('отклонена')) {
            return 'bg-red-50/90 border-red-200';
        }
        return 'bg-violet-50/90 border-violet-200';
    };

    const unreadNotificationCount = allNotifications.filter(n => !n.is_read).length;

    return (
        <>
            <style>{`
                html { scrollbar-gutter: stable; }
            `}</style>

            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold">W</span>
                            </div>
                            <span className="font-bold text-xl text-gray-900">WorkFlow</span>
                        </div>
                        {/* DESKTOP */}
                        <div className="hidden md:flex flex-row space-x-4 items-center">
                            {onRefresh && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onRefresh}
                                    className="hover:bg-violet-50 transition-colors duration-200"
                                >
                                    <RefreshCw className="w-5 h-5 text-gray-700"/>
                                    <span className="ml-1 text-sm">Обновить</span>
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsModalOpen(true)}
                                className="relative hover:bg-violet-50 transition-colors duration-200"
                            >
                                <Bell className="w-5 h-5 text-gray-700"/>
                                {unreadNotificationCount > 0 && (
                                    <span
                                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center font-medium shadow-sm animate-pulse">
                                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                    </span>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowProfile(true)}
                                className="hover:bg-violet-50 transition-colors duration-200"
                            >
                                <User className="w-5 h-5 text-gray-600"/>
                                <span className="text-sm font-medium">Профиль</span>
                            </Button>
                            <Badge variant="secondary" className="bg-violet-100 text-violet-800 border-violet-200">{role}</Badge>
                            <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-red-50 hover:text-red-600 transition-colors duration-200">
                                <LogOut className="w-5 h-5"/>
                            </Button>
                        </div>
                        <div className="flex md:hidden items-center space-x-2">
                            {onRefresh && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onRefresh}
                                    className="p-2 hover:bg-violet-50 transition-colors duration-200"
                                >
                                    <RefreshCw className="w-5 h-5 text-gray-700"/>
                                    <span className="ml-1 text-sm">Обновить</span>
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsModalOpen(true)}
                                className="relative p-2 hover:bg-violet-50 transition-colors duration-200"
                            >
                                <Bell className="w-5 h-5 text-gray-700"/>
                                {unreadNotificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center font-medium shadow-sm animate-pulse">
                                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Уведомления */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent
                    className="max-w-sm sm:max-w-md w-[95vw] max-h-[85vh] overflow-hidden p-0 border-0 rounded-2xl shadow-2xl bg-white"
                >
                    <DialogHeader className="sr-only">
                        <DialogTitle>Уведомления</DialogTitle>
                    </DialogHeader>

                    {/* Заголовок */}
                    <div className="flex items-center border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-violet-50 to-purple-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                                <Bell className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Уведомления</h2>
                                <p className="text-sm text-gray-600">
                                    {unreadNotificationCount > 0 ? `${unreadNotificationCount} новых` : 'Все прочитаны'}
                                </p>
                            </div>
                        </div>
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
                                                        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-violet-600 bg-violet-100 rounded-full whitespace-nowrap">
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
                            onClick={() => setIsModalOpen(false)}
                            variant="outline"
                            className="w-full border-gray-200 hover:bg-gray-50 text-gray-700"
                        >
                            Закрыть
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Модалка для случая, когда заявка не найдена */}
            <RequestNotFoundModal
                isOpen={showNotFoundModal}
                onClose={() => setShowNotFoundModal(false)}
                requestId={notFoundRequestId}
            />

        </>
    );
};

export default Header;
