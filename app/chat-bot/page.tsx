"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

type Message = {
    from: "user" | "bot";
    text: string;
};

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        { from: "bot", text: "Привет! Чем могу помочь?" },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Автопрокрутка при новых сообщениях
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Адаптация высоты textarea
    const adjustTextareaHeight = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(
                textareaRef.current.scrollHeight,
                150
            )}px`;
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        adjustTextareaHeight();
    }, [inputValue, adjustTextareaHeight]);

    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            e?.preventDefault();

            if (!inputValue.trim() || isSending) return;

            const userMessage = inputValue;
            setInputValue("");
            setIsSending(true);

            // Добавляем сообщение пользователя
            setMessages((prev) => [...prev, { from: "user", text: userMessage }]);

            try {
                // Имитация ответа бота
                await new Promise((resolve) => setTimeout(resolve, 1000));
                setMessages((prev) => [
                    ...prev,
                    { from: "bot", text: "Спасибо за сообщение! Я свяжусь с вами в ближайшее время." },
                ]);
            } finally {
                setIsSending(false);
            }
        },
        [inputValue, isSending]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 safe-area-padding">
            {/* Шапка чата */}
            <header className="sticky top-0 z-10 bg-purple-100 border-b p-3 safe-area-top">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <Link
                        href="/"
                        className="p-1 rounded-full hover:bg-purple-200 transition-colors"
                        aria-label="Назад"
                    >
                        <ArrowLeft className="w-5 h-5 text-purple-700" />
                    </Link>
                    <h1 className="font-semibold text-purple-700 text-sm">Чат поддержки</h1>
                    <div className="w-6" aria-hidden></div>
                </div>
            </header>

            {/* Область сообщений */}
            <main className="flex-1 overflow-y-auto p-3 space-y-3 max-w-2xl mx-auto w-full pb-24">
                {messages.map((msg, idx) => (
                    <div
                        key={`${msg.from}-${idx}`}
                        className={`flex ${msg.from === "bot" ? "justify-start" : "justify-end"} items-end gap-2`}
                    >
                        {msg.from === "bot" && (
                            <img
                                src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png"
                                alt="Аватар бота"
                                className="w-8 h-8 rounded-full flex-shrink-0"
                                width={32}
                                height={32}
                            />
                        )}
                        <div
                            className={`px-3 py-2 max-w-[80%] rounded-lg ${
                                msg.from === "bot"
                                    ? "bg-purple-100 text-purple-700 rounded-bl-none"
                                    : "bg-gray-200 text-gray-800 rounded-br-none"
                            }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} aria-hidden />
            </main>

            {/* Поле ввода */}
            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="fixed bottom-16 left-0 right-0 bg-white border-t p-2 max-w-2xl mx-auto w-full safe-area-bottom"
            >
                <div className="flex items-end gap-2">
          <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите сообщение..."
              className="flex-1 border rounded-lg p-2 resize-none focus:outline-none text-sm min-h-[48px] max-h-[150px]"
              rows={1}
              aria-label="Поле ввода сообщения"
              disabled={isSending}
          />
                    <button
                        type="submit"
                        className="bg-purple-600 text-white rounded-lg p-2 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!inputValue.trim() || isSending}
                        aria-label="Отправить сообщение"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>

            {/* Навигация */}
            <BottomNav activeTab="chat"  />
        </div>
    );
}