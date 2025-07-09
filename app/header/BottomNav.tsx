import {Bell, User, LogOut, MessageCircle} from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import Link from "next/link";

interface BottomNavProps {
    setShowProfile: (value: boolean) => void;
    setIsModalOpen: (value: boolean) => void;
    handleLogout: () => void;
    unreadNotificationCount: number;
}

const BottomNav: React.FC<BottomNavProps> = ({
                                                 setShowProfile,
                                                 setIsModalOpen,
                                                 handleLogout,
                                                 unreadNotificationCount
                                             }) => {
    return (
        <>
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-md flex justify-around py-2 z-50">
                <Button variant="ghost" onClick={() => setShowProfile(true)} className="flex flex-col items-center text-xs p-0">
                    <User className="w-5 h-5 mb-1" />
                    Профиль
                </Button>
                <Button variant="ghost" onClick={() => setIsModalOpen(true)} className="relative flex flex-col items-center text-xs p-0">
                    <Bell className="w-5 h-5 mb-1" />
                    Уведомл.
                    {unreadNotificationCount > 0 && (
                        <span className="absolute top-0 right-4 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[1rem] text-center">
                            {unreadNotificationCount}
                        </span>
                    )}
                </Button>
                <Link
                    href="/chat-bot"
                    className="flex flex-col items-center justify-center text-xs p-2 text-gray-700 hover:text-purple-600"
                >
                    <MessageCircle className="w-5 h-5 mb-1" />
                    Чат
                </Link>
                <Button variant="ghost" onClick={handleLogout} className="flex flex-col items-center text-xs p-0">
                    <LogOut className="w-5 h-5 mb-1" />
                    Выйти
                </Button>
            </nav>
        </>
    );
};

export default BottomNav;