import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import React, { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import api from "@/lib/api";

interface HeaderProps {
    setShowProfile: (value: boolean) => void;
    handleLogout: () => void;
    notificationCount?: number;
    role?: string;
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
                                       }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

        const { scrollTop, scrollHeight, clientHeight } = el;
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
        if (!notification.is_read) {
            try {
                await api.patch(`/notifications/${notification.id}/read`);
                setAllNotifications(prev =>
                    prev.map(n =>
                        n.id === notification.id ? { ...n, is_read: true } : n
                    )
                );
            } catch (error) {
                console.error("Ошибка при пометке уведомления как прочитано", error);
            }
        }
    };

    const unreadNotificationCount = allNotifications.filter(n => !n.is_read).length;

    return (
        <>
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold">K</span>
                            </div>
                            <span className="font-bold text-xl text-gray-900">Kcell Service</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsModalOpen(true)}
                                className="relative"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadNotificationCount > 0 && (
                                    <span className="absolute top-0 right-0 translate-x-1/5 -translate-y-1/5 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[1rem] text-center">
                    {unreadNotificationCount}
                  </span>
                                )}
                            </Button>

                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => setShowProfile(true)}>
                                    <User className="w-5 h-5 text-gray-600" />
                                    <span className="text-sm font-medium">Профиль</span>
                                </Button>
                                <Badge variant="secondary">{role}</Badge>
                                <Button variant="ghost" size="sm" onClick={handleLogout}>
                                    <LogOut className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Все уведомления</DialogTitle>
                    </DialogHeader>
                    <div
                        ref={containerRef}
                        className="space-y-3 mt-4 overflow-y-auto max-h-[65vh] pr-2"
                    >
                        {allNotifications.length === 0 && !isLoading ? (
                            <p className="text-sm text-gray-500">Нет уведомлений</p>
                        ) : (
                            allNotifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                        n.is_read ? "bg-gray-50" : "bg-blue-50 border border-blue-100"
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-medium">{n.title}</p>
                                        {!n.is_read && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Новое
                      </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(n.created_at).toLocaleString('ru-RU')}
                                    </p>
                                    <p className="text-sm text-gray-700 mt-2">{n.content}</p>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                            </div>
                        )}
                        {!hasMore && allNotifications.length > 0 && (
                            <p className="text-sm text-center text-gray-500 py-4">
                                Вы достигли конца списка
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default Header;