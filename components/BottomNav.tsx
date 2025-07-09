import {History, House, MessageCircle, Plus, Send, User, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import React, {useState} from "react";

interface BottomNavProps {
    setShowProfile: (value: boolean) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({
                                                 setShowProfile
                                             }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center py-3 z-[60]">
            {/* Главная */}
            <Button
                variant="ghost"
                className="flex flex-col items-center gap-1 text-xs text-gray-700"
            >
                <House className="w-7 h-7 stroke-[1.8]" />
                <span>Главная</span>
            </Button>

            {/* История */}
            <Button
                variant="ghost"
                className="flex flex-col items-center gap-1 text-xs text-gray-700"
            >
                <History className="w-7 h-7 stroke-[1.8]" />
                <span>История</span>
            </Button>

            <div className="relative -top-2">
                <Button
                    variant="ghost"
                    className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                    <Plus className="w-6 h-6 text-gray-700" strokeWidth={2.2} />
                </Button>
            </div>

            {/* Чат */}
            <Button
                variant="ghost"
                onClick={() => setIsChatOpen(true)}
                className="flex flex-col items-center gap-1 text-xs text-gray-700"
            >
                <MessageCircle className="w-7 h-7 stroke-[1.8]" />
                <span>Чат</span>
            </Button>

            {/* Профиль */}
            <Button
                variant="ghost"
                onClick={() => setShowProfile(true)}
                className="flex flex-col items-center gap-1 text-xs text-gray-700"
            >
                <User className="w-7 h-7 stroke-[1.8]" />
                <span>Профиль</span>
            </Button>

            {/* Чат-бот модальное окно */}
            {isChatOpen && (
                <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 w-[95%] h-[70vh] max-h-[600px] bg-white shadow-xl rounded-t-2xl flex flex-col z-[70] border border-gray-200">
                    <div className="flex items-center justify-between p-4 border-b">
                        <span className="font-medium text-lg">Чат поддержки</span>
                        <button
                            onClick={() => setIsChatOpen(false)}
                            className="p-2 rounded-full hover:bg-gray-100"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {[
                            { from: "bot", text: "Привет! Чем могу помочь?" },
                        ].map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.from === "bot" ? "justify-start" : "justify-end"}`}
                            >
                                <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-base ${
                                    msg.from === "bot"
                                        ? "bg-gray-100 rounded-bl-none"
                                        : "bg-purple-100 rounded-br-none"
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t flex items-center gap-3">
                        <textarea
                            placeholder="Напишите сообщение..."
                            className="flex-1 border rounded-2xl px-4 py-3 resize-none focus:outline-none text-base min-h-[50px] max-h-[120px]"
                        />
                        <button className="p-3 text-purple-600 rounded-full hover:bg-purple-50">
                            <Send className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default BottomNav;