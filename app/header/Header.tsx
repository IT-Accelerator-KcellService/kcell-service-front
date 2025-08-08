import {Bell, Loader2, LogOut, User} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import React, {useEffect, useRef, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import api from "@/lib/api";
import {VisuallyHidden} from "@radix-ui/react-visually-hidden";


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
                                <span className="text-white font-bold">K</span>
                            </div>
                            <span className="font-bold text-xl text-gray-900">Kcell Service</span>
                        </div>
                        {/* DESKTOP */}
                        <div className="hidden md:flex flex-row space-x-4 items-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsModalOpen(true)}
                                className="relative"
                            >
                                <Bell className="w-5 h-5"/>
                                {unreadNotificationCount > 0 && (
                                    <span
                                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[1rem] text-center">
                                        {unreadNotificationCount}
                                    </span>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowProfile(true)}
                            >
                                <User className="w-5 h-5 text-gray-600"/>
                                <span className="text-sm font-medium">Профиль</span>
                            </Button>
                            <Badge variant="secondary">{role}</Badge>
                            <Button variant="ghost" size="sm" onClick={handleLogout}>
                                <LogOut className="w-5 h-5"/>
                            </Button>
                        </div>
                        <div className="flex md:hidden items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsModalOpen(true)}
                                className="relative p-2"
                            >
                                <Bell className="w-5 h-5"/>
                                {unreadNotificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[1rem] text-center">
              {unreadNotificationCount}
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
                    className="max-w-xs sm:max-w-md w-full max-h-[80vh] overflow-hidden p-0 border border-gray-200 rounded-2xl shadow-2xl"
                >
                    <DialogHeader>
                        <VisuallyHidden asChild>
                            <DialogTitle>Уведомления</DialogTitle>
                        </VisuallyHidden>
                    </DialogHeader>

                    {/* Заголовок (визуальный) */}
                    <div className="flex items-center justify-between border-b px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Bell className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Уведомления</h2>
                                <p className="text-sm text-gray-500">
                                    {allNotifications.filter((n: any) => !n.is_read).length} новых
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Контент с прокруткой */}
                    <div className="max-h-[60vh] overflow-y-auto p-1">
                        <div
                            ref={containerRef}
                            className="px-4 py-3 space-y-3"
                        >
                            {allNotifications.length === 0 && !isLoading ? (
                                <p className="text-sm text-gray-500 text-center py-6">
                                    Нет уведомлений
                                </p>
                            ) : (
                                allNotifications.map((n: any) => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={`p-3 rounded-lg border break-words cursor-pointer transition-colors ${
                                            n.is_read
                                                ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                                : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                                {n.title}
                                            </p>
                                            {!n.is_read && (
                                                <span className="ml-2 px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-100 rounded-full whitespace-nowrap">
                                        Новое
                                    </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(n.created_at).toLocaleString("ru-RU", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "2-digit",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-line leading-relaxed">
                                            {n.content}
                                        </p>
                                    </div>
                                ))
                            )}
                            {isLoading && (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                </div>
                            )}
                            {!hasMore && allNotifications.length > 0 && !isLoading && (
                                <p className="text-xs text-center text-gray-400 py-3">
                                    Вы достигли конца списка
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Кнопка "Закрыть" внизу */}
                    <div className="border-t px-5 py-3 bg-gray-50">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Закрыть
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

        </>
    );
};

export default Header;
