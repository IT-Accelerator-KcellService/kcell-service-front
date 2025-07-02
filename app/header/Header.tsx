import { Bell, LogOut, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet";
import api from "@/lib/api";

interface HeaderProps {
    setShowProfile: (value: boolean) => void;
    handleLogout: () => void;
    notificationCount?: number;
    role?: string;
}

const Header: React.FC<HeaderProps> = ({
                                           setShowProfile,
                                           handleLogout,
                                           notificationCount = 0,
                                           role = "Клиент",
                                       }) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isBurgerOpen, setIsBurgerOpen] = React.useState(false);
    const [allNotifications, setAllNotifications] = React.useState<any[]>([]);

    React.useEffect(() => {
        api
            .get("/notifications/me")
            .then((res) => res.data.notifications)
            .then(setAllNotifications)
            .catch(console.error);
    }, []);

    React.useEffect(() => {
        if (isModalOpen) {
            api
                .get("/notifications/me")
                .then((res) => res.data.notifications)
                .then(setAllNotifications)
                .catch(console.error);
        }
    }, [isModalOpen]);

    const unreadNotificationCount = allNotifications.filter((n) => !n.is_read)
        .length;

    const handleNotificationClick = async (notification: any) => {
        if (!notification.is_read) {
            try {
                const response = await api.patch(
                    `/notifications/${notification.id}/read`
                );
                const updated = response.data;

                setAllNotifications((prev: any) =>
                    prev.map((n: any) => (n.id === updated.id ? { ...n, is_read: true } : n))
                );
            } catch (error) {
                console.error("Ошибка при пометке уведомления как прочитано", error);
            }
        }
        setIsModalOpen(true);
    };

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
                        <div className="hidden sm:flex flex-row space-x-4 items-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsModalOpen(true)}
                                className="relative"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadNotificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[1rem] text-center">
                                        {unreadNotificationCount}
                                    </span>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowProfile(true)}
                            >
                                <User className="w-5 h-5 text-gray-600" />
                                <span className="text-sm font-medium">Профиль</span>
                            </Button>
                            <Badge variant="secondary">{role}</Badge>
                            <Button variant="ghost" size="sm" onClick={handleLogout}>
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                        {/* MOBILE BURGER */}
                        <div className="flex sm:hidden">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsBurgerOpen(true)}
                            >
                                <Menu className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Уведомления */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="w-full max-w-xs sm:max-w-md max-h-[80vh] overflow-y-auto p-4">
                    <DialogHeader>
                        <DialogTitle>Все уведомления</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-4">
                        {allNotifications.length === 0 ? (
                            <p className="text-sm text-gray-500">Нет уведомлений</p>
                        ) : (
                            allNotifications.map((n: any) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={`p-3 rounded-lg border break-words ${
                                        n.is_read
                                            ? "bg-gray-50 border-gray-200"
                                            : "bg-blue-50 border-blue-200"
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-medium truncate">
                                            {n.title}
                                        </p>
                                        {!n.is_read && (
                                            <span className="text-blue-500 text-xs ml-2">Новое</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {new Date(n.created_at).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                                        {n.content}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Бургер меню */}
            <Sheet open={isBurgerOpen} onOpenChange={setIsBurgerOpen}>
                <SheetContent className="flex flex-col w-full max-w-xs px-4 py-4 space-y-2">
                    <SheetHeader>
                        <SheetTitle>Меню</SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col space-y-2 flex-grow">
                        <Button
                            variant="ghost"
                            className="justify-start w-full"
                            onClick={() => {
                                setShowProfile(true);
                                setIsBurgerOpen(false);
                            }}
                        >
                            <User className="w-5 h-5 mr-2" />
                            Профиль
                        </Button>
                        <Button
                            variant="ghost"
                            className="justify-start w-full"
                            onClick={() => {
                                setIsModalOpen(true);
                                setIsBurgerOpen(false);
                            }}
                        >
                            <Bell className="w-5 h-5 mr-2" />
                            Уведомления
                            {unreadNotificationCount > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[1rem] text-center">
                                    {unreadNotificationCount}
                                </span>
                            )}
                        </Button>
                    </div>
                    <Button
                        variant="ghost"
                        className="justify-start w-full"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-5 h-5 mr-2" />
                        Выйти
                    </Button>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default Header;
