import {Bell, User, LogOut, MessageCircle, Send, X} from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";

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
    const [isChatOpen, setIsChatOpen] = useState(false);

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-md flex justify-around py-2 z-50">
            <Button variant="ghost" onClick={() => setShowProfile(true)} className="flex flex-col items-center text-xs">
                <User className="w-5 h-5 mb-1" />
                Профиль
            </Button>
            <Button variant="ghost" onClick={() => setIsModalOpen(true)} className="relative flex flex-col items-center text-xs">
                <Bell className="w-5 h-5 mb-1" />
                Уведомл.
                {unreadNotificationCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[1rem] text-center">
                        {unreadNotificationCount}
                    </span>
                )}
            </Button>
            <Button
                variant="ghost"
                onClick={() => setIsChatOpen(true)}
                className="flex flex-col items-center text-xs"
            >
                <MessageCircle className="w-5 h-5 mb-1" />
                Чат
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="flex flex-col items-center text-xs">
                <LogOut className="w-5 h-5 mb-1" />
                Выйти
            </Button>

            {/* Чат-бот */}
            {isChatOpen && (
                <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-[95%] h-[70vh] bg-white shadow-xl border rounded-2xl flex flex-col z-50">
                    <div className="flex items-center justify-between p-3 bg-purple-100 rounded-t-2xl border-b">
                        <span className="font-semibold text-purple-700">Чат поддержки - ChatAI</span>
                        <button
                            onClick={() => setIsChatOpen(false)}
                            className="p-1 rounded hover:bg-purple-200"
                        >
                            <X className="w-5 h-5 text-purple-700" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm custom-scrollbar bg-white">
                        {[
                            { from: "bot", text: "Привет! Чем могу помочь?" },
                        ].map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${
                                    msg.from === "bot" ? "justify-start" : "justify-end"
                                } items-end gap-2`}
                            >
                                {msg.from === "bot" && (
                                    <img
                                        src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png"
                                        alt="bot"
                                        className="w-8 h-8 rounded-full"
                                    />
                                )}
                                <div
                                    className={`
                                        relative px-3 py-2 max-w-[80%]
                                        ${
                                        msg.from === "bot"
                                            ? "bg-purple-100 text-purple-700 rounded-xl rounded-bl-none before:content-[''] before:absolute before:left-[-8px] before:top-3 before:border-8 before:border-transparent before:border-r-purple-100"
                                            : "bg-gray-200 text-gray-800 rounded-xl rounded-br-none before:content-[''] before:absolute before:right-[-8px] before:top-3 before:border-8 before:border-transparent before:border-l-gray-200"
                                    }
                                    `}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-2 border-t flex gap-2 items-end">
                        <textarea
                            placeholder="Напишите сообщение..."
                            className="flex-1 border rounded p-2 resize-none focus:outline-none"
                            style={{ height: "40px", maxHeight: "120px" }}
                        />
                        <button
                            className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 flex items-center justify-center"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default BottomNav;