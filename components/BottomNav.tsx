import { User, MessageCircle, House, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {useEffect, useState} from "react";

interface BottomNavProps {
    activeTab?: 'home' | 'history' | 'chat' | 'profile';
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab }) => {
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const storedRole = localStorage.getItem('role');
        setRole(storedRole);
    }, []);
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-sm flex justify-around items-center py-2 z-50">
            {/* Главная */}
            <Link href="/home" className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${activeTab === 'home' ? 'text-purple-600' : 'text-gray-600'}`}
                >
                    <House className="w-5 h-5" />
                    <span className="text-xs mt-1">Главная</span>
                </Button>
            </Link>

            {/* История */}
            <Link href= {`/${role}`} className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${activeTab === 'history' ? 'text-purple-600' : 'text-gray-600'}`}
                >
                    <History className="w-5 h-5" />
                    <span className="text-xs mt-1">История</span>
                </Button>
            </Link>

            {/* Центральная кнопка */}
            <div className="flex-1 flex justify-center relative">
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute -top-6 bg-purple-600 text-white rounded-full w-12 h-12 hover:bg-purple-700 shadow-lg"
                >
                    <Plus className="w-6 h-6" />
                </Button>
            </div>

            {/* Чат */}
            <Link href="/chat-bot" className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${activeTab === 'chat' ? 'text-purple-600' : 'text-gray-600'}`}
                >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs mt-1">Чат</span>
                </Button>
            </Link>

            {/* Профиль */}
            <Link href="/profile" className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${activeTab === 'profile' ? 'text-purple-600' : 'text-gray-600'}`}
                >
                    <User className="w-5 h-5" />
                    <span className="text-xs mt-1">Профиль</span>
                </Button>
            </Link>
        </nav>
    );
};