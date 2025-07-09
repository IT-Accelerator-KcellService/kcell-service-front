"use client";

import { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ChatPage() {
    const [messages, setMessages] = useState([
        { from: "bot", text: "Привет! Чем могу помочь?" },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isMobile, setIsMobile] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Проверка на мобильное устройство
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);

        return () => {
            window.removeEventListener('resize', checkIfMobile);
        };
    }, []);

    useEffect(() => {
        // Прокрутка вниз при новых сообщениях
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const autoResize = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(
                textareaRef.current.scrollHeight,
                120
            )}px`;
        }
    };

    const handleSend = () => {
        if (!inputValue.trim()) return;

        setMessages((prev) => [...prev, { from: "user", text: inputValue }]);

        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                { from: "bot", text: "Спасибо за сообщение, скоро свяжусь!" },
            ]);
        }, 1000);

        setInputValue("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "40px";
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Шапка чата (уменьшенная на мобильных) */}
            <div className={`flex items-center justify-between p-3 ${isMobile ? 'py-2' : 'p-4'} bg-purple-100 border-b`}>
                <Link
                    href="/"
                    className="p-1 rounded-full hover:bg-purple-200 flex items-center"
                >
                    <ArrowLeft className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-purple-700`} />
                    {!isMobile && <span className="ml-1">Назад</span>}
                </Link>
                <span className={`font-semibold text-purple-700 ${isMobile ? 'text-sm' : ''}`}>
                    Чат поддержки
                </span>
                <div className="w-6"></div> {/* Для выравнивания */}
            </div>

            {/* Область сообщений (увеличенные отступы на мобильных) */}
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3' : 'p-4'} space-y-3 custom-scrollbar bg-white`}>
                {messages.map((msg, idx) => (
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
                                className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} rounded-full`}
                            />
                        )}
                        <div
                            className={`
                                relative px-3 py-2 ${isMobile ? 'max-w-[85%]' : 'max-w-[80%]'} 
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
                <div ref={messagesEndRef} />
            </div>

            {/* Поле ввода (компактное на мобильных) */}
            <div className={`${isMobile ? 'p-2' : 'p-3'} border-t flex gap-2 items-end`}>
                <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        autoResize();
                    }}
                    placeholder="Напишите сообщение..."
                    className="flex-1 border rounded-lg p-2 resize-none focus:outline-none"
                    style={{
                        height: "40px",
                        maxHeight: "120px",
                        fontSize: isMobile ? '14px' : '16px'
                    }}
                />
                <button
                    onClick={handleSend}
                    className={`bg-purple-600 text-white rounded-full hover:bg-purple-700 flex items-center justify-center ${
                        isMobile ? 'p-2' : 'p-2.5'
                    }`}
                >
                    <Send className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
                </button>
            </div>
        </div>
    );
}