"use client";
import { useState, useEffect, useRef, useCallback, FormEvent, KeyboardEvent } from "react";
import { Send, ArrowLeft, Trash2, Copy } from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import axios, { AxiosError } from "axios";
import api from "@/lib/api";
import ReactMarkdown from 'react-markdown';

type Message = {
    from: "user" | "bot";
    text: string;
};
type ApiError = {
    error?: string;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        { from: "bot", text: "Привет! Чем могу помочь по проекту?" },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [userToken, setUserToken] = useState<string | null>(null)
    const getChatStorageKey = useCallback(() => {
        return userToken ? `chat-messages-${userToken}` : 'chat-messages';
    }, [userToken]);
    useEffect(() => {
        const token = localStorage.getItem('authToken'); // Замените на ваш ключ
        setUserToken(token);

        const saved = localStorage.getItem(getChatStorageKey());
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setMessages(parsed);
                }
            } catch (e) {
                localStorage.removeItem(getChatStorageKey());
            }
        }
        textareaRef.current?.focus();
    }, [getChatStorageKey]);

    // Сохранение сообщений
    useEffect(() => {
        if (messages.length > 1) {
            localStorage.setItem(getChatStorageKey(), JSON.stringify(messages));
        }
    }, [messages, getChatStorageKey]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const adjustTextareaHeight = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        adjustTextareaHeight();
    }, [inputValue, adjustTextareaHeight]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed || isSending) return;

        setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
        setInputValue("");
        setIsSending(true);
        setIsBotTyping(true);
        setError(null);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await api.post("/chat", {
                message: trimmed,
            }, {
                signal: abortController.signal
            });

            const botText = response.data?.answer ?? "Не получилось обработать ответ.";
            setMessages((prev) => [...prev, { from: "bot", text: botText }]);
        } catch (err) {
            if (axios.isCancel(err)) {
                return;
            }

            const error = err as AxiosError<ApiError>;
            const errorMessage = error.response?.data?.error || "Ошибка сервера. Попробуйте позже.";
            setError(errorMessage);
            setMessages((prev) => [...prev, { from: "bot", text: errorMessage }]);
        } finally {
            setIsSending(false);
            setIsBotTyping(false);
        }
    };

    const handleClearChat = () => {
        if (confirm('Очистить историю чата?')) {
            setMessages([{ from: "bot", text: "Чат очищен. Чем могу помочь?" }]);
            localStorage.removeItem(getChatStorageKey());
        }
    };

    const handleCopyMessage = (text: string) => {
        navigator.clipboard.writeText(text);
        // Можно добавить toast-уведомление здесь
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const messageStyles = {
        bot: "bg-purple-100 text-purple-700 rounded-bl-none",
        user: "bg-gray-200 text-gray-800 rounded-br-none"
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
                    <div className="flex items-center gap-2">
                        <h1 className="font-semibold text-purple-700 text-sm">Чат поддержки</h1>
                        <button
                            onClick={handleClearChat}
                            className="text-xs text-purple-500 hover:text-purple-700"
                            title="Очистить чат"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="w-6" aria-hidden></div>
                </div>
            </header>

            {/* Область сообщений */}
            <main className="flex-1 overflow-y-auto p-3 space-y-3 max-w-2xl mx-auto w-full pb-[130px]">
                {messages.map((msg, idx) => (
                    <div
                        key={`${msg.from}-${idx}-${Date.now()}`}
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
                        <div className="relative group">
                            <div className={`px-3 py-2 max-w-[80%] rounded-lg ${messageStyles[msg.from]}`}>
                                {typeof msg.text === 'string' ? (
                                    <ReactMarkdown components={{
                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                                        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                        code: ({ node, ...props }) => <code className="bg-gray-100 px-1 rounded text-sm" {...props} />
                                    }}>
                                        {msg.text}
                                    </ReactMarkdown>
                                ) : (
                                    <div className="text-red-500 text-sm">Ошибка отображения сообщения</div>
                                )}
                            </div>
                            <button
                                onClick={() => handleCopyMessage(typeof msg.text === 'string' ? msg.text : '')}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10"
                                title="Копировать"
                            >
                                <Copy className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
                {isBotTyping && (
                    <div className="flex justify-start items-end gap-2">
                        <img
                            src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png"
                            alt="Аватар бота"
                            className="w-8 h-8 rounded-full flex-shrink-0"
                            width={32}
                            height={32}
                        />
                        <div className="px-3 py-2 max-w-[80%] rounded-lg bg-purple-100 text-purple-700 rounded-bl-none">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></div>
                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{animationDelay: '0.4s'}}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} aria-hidden />
            </main>

            {/* Поле ввода */}
            <form
                onSubmit={handleSubmit}
                className="fixed bottom-16 left-0 right-0 bg-white border-t p-2 max-w-2xl mx-auto w-full safe-area-bottom"
            >
                {error && (
                    <div className="text-red-500 text-xs mb-1 px-2">{error}</div>
                )}
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
            <BottomNav activeTab="chat" />
        </div>
    );
}