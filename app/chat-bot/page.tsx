"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send } from "lucide-react";

export default function Page() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { from: "bot", text: "Привет! Чем могу помочь?" },
    ]);
    const [inputValue, setInputValue] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen && window.innerWidth < 768) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    useEffect(() => {
        // прокрутка вниз
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const autoResize = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"; // сброс
            textareaRef.current.style.height = `${Math.min(
                textareaRef.current.scrollHeight,
                120 // макс высота 120px
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
            textareaRef.current.style.height = "40px"; // возвращаем в исходное
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-14 h-14 bg-purple-100 text-purple-600 rounded-full shadow-lg hover:bg-purple-200 transition"
            >
                <MessageCircle className="w-7 h-7" />
            </button>

            {isOpen && (
                <div
                    className={`
            fixed z-50 bg-white shadow-xl border flex flex-col
            ${
                        window.innerWidth < 768
                            ? "bottom-4 left-1/2 transform -translate-x-1/2 w-[95%] h-[90%] rounded-2xl"
                            : "bottom-4 right-4 w-[350px] h-[500px] rounded-2xl"
                    }
          `}
                >
                    <div className="flex items-center justify-between p-3 bg-purple-100 rounded-t-2xl border-b">
                        <span className="font-semibold text-purple-700">Чат поддержки - ChatAI</span>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded hover:bg-purple-200"
                        >
                            <X className="w-5 h-5 text-purple-700" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm custom-scrollbar bg-white">
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
                                        className="w-8 h-8 rounded-full"
                                    />
                                )}
                                {msg.from === "user" }
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
                        <div ref={messagesEndRef} />
                    </div>


                    <div className="p-2 border-t flex gap-2 items-end">
            <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    autoResize();
                }}
                placeholder="Напишите сообщение..."
                className="flex-1 border rounded p-2 resize-none focus:outline-none"
                style={{ height: "40px", maxHeight: "120px" }}
            />
                        <button
                            onClick={handleSend}
                            className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 flex items-center justify-center"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
