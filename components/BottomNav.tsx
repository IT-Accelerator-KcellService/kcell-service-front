import { User, MessageCircle, House, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import {useAuthStore} from "@/stores/useAuthStore";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface BottomNavProps {
    activeTab?: 'home' | 'history' | 'chat' | 'profile';
    hidden?: boolean; // Новый пропс для скрытия навигации
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, hidden = false }) => {
    const {role} = useAuthStore()
    const router = useRouter()

    // Скрываем навигацию если hidden = true
    if (hidden) {
        return null;
    }

    const handleCreateRequest = () => {
        router.push('/create-request')
    }

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-[#F3F3F3] via-white to-[#F3F3F3] border-t border-[#C4C4CE] shadow-sm flex justify-around items-center py-3 px-2 z-50 rounded-t-2xl">
            {/* Главная */}
            <Link href="/home" className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${
                        activeTab === 'home'
                            ? 'text-[#B8400E] hover:text-[#B8400E]'
                            : 'text-[#C4C4CE] hover:text-[#C4C4CE]'
                    }`}
                >
                    <House className={`w-5 h-5 ${activeTab === 'home' ? 'text-[#B8400E]' : 'text-[#C4C4CE]'}`} />
                    <span className="text-xs mt-1">Главная</span>
                </Button>
            </Link>

            {/* История */}
            <Link href={`/${role}?createRequest=false`} className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${
                        activeTab === 'history'
                            ? 'text-[#B8400E] hover:text-[#B8400E]'
                            : 'text-[#C4C4CE] hover:text-[#C4C4CE]'
                    }`}
                >
                    <History className={`w-5 h-5 ${activeTab === 'history' ? 'text-[#B8400E]' : 'text-[#C4C4CE]'}`} />
                    <span className="text-xs mt-1">История</span>
                </Button>
            </Link>

            {/* Центральная иконка приложения - кнопка создания заявки */}
            <div className="flex-1 flex justify-center">
                <button
                    onClick={handleCreateRequest}
                    className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                    aria-label="Создать заявку"
                >
                    <Image 
                        src="/app-icon.png" 
                        alt="Создать заявку" 
                        width={44} 
                        height={44} 
                        className="rounded-lg"
                    />
                </button>
            </div>

            {/* Чат */}
            <Link href="/chat-bot" className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${
                        activeTab === 'chat'
                            ? 'text-[#B8400E] hover:text-[#B8400E]'
                            : 'text-[#C4C4CE] hover:text-[#C4C4CE]'
                    }`}
                >
                    <MessageCircle className={`w-5 h-5 ${activeTab === 'chat' ? 'text-[#B8400E]' : 'text-[#C4C4CE]'}`} />
                    <span className="text-xs mt-1">Сообщение</span>
                </Button>
            </Link>

            {/* Профиль */}
            <Link href="/profile" className="flex-1 flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center w-full ${
                        activeTab === 'profile'
                            ? 'text-[#B8400E] hover:text-[#B8400E]'
                            : 'text-[#C4C4CE] hover:text-[#C4C4CE]'
                    }`}
                >
                    <User className={`w-5 h-5 ${activeTab === 'profile' ? 'text-[#B8400E]' : 'text-[#C4C4CE]'}`} />
                    <span className="text-xs mt-1">Профиль</span>
                </Button>
            </Link>
        </nav>
    );
};