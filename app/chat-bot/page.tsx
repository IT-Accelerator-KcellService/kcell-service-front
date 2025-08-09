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
        const token = localStorage.getItem('token');
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

    return (
        <div className="flex flex-col h-screen bg-gray-50 safe-area-padding">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-purple-100 border-b p-4 safe-area-top">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <Link
                        href="/"
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Назад"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="font-medium text-gray-900 text-sm">Чат поддержки</h1>
                        <button
                            onClick={handleClearChat}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                            title="Очистить чат"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="w-6" aria-hidden></div>
                </div>
            </header>

            {/* Messages */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full pb-32">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.from === "bot" ? "justify-start" : "justify-end"} items-start gap-2`}>
                        {msg.from === "bot" && (
                            <img
                                src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png"
                                alt="Аватар бота"
                                className="w-8 h-8 rounded-full flex-shrink-0 mt-1"
                                width={32}
                                height={32}
                            />
                        )}

                        <div className="relative group max-w-[85%]">
                            <button
                                onClick={() => handleCopyMessage(msg.text)}
                                className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white rounded-full shadow-sm hover:bg-gray-50 border border-gray-200"
                                title="Копировать"
                            >
                                <Copy className="w-3 h-3 text-gray-500" />
                            </button>
                            <div className={`px-4 py-3 rounded-2xl ${msg.from === "bot" ? "bg-purple-100 text-gray-800 rounded-tl-none" : "bg-gray-100 text-gray-800 rounded-tr-none"}`}>
                                <ReactMarkdown components={{
                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                    code: ({ node, ...props }) => <code className="bg-gray-200 px-1 rounded text-sm font-mono" {...props} />,
                                    a: ({ node, ...props }) => <a className="text-purple-600 hover:underline" {...props} />
                                }}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {msg.from === "user" && (
                            <img
                                src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                                alt="Аватар пользователя"
                                className="w-8 h-8 rounded-full flex-shrink-0 mt-1"
                                width={32}
                                height={32}
                            />
                        )}
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
                        <div className="px-4 py-3 rounded-2xl bg-purple-100 text-gray-800 rounded-tl-none">
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

            {/* Input */}
            <form
                onSubmit={handleSubmit}
                className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-2xl mx-auto w-full safe-area-bottom"
            >
                {error && (
                    <div className="text-red-500 text-xs mb-2 px-2">{error}</div>
                )}
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Напишите сообщение..."
                        className="flex-1 border border-gray-300 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[48px] max-h-[150px] bg-white"
                        rows={1}
                        aria-label="Поле ввода сообщения"
                        disabled={isSending}
                    />
                    <button
                        type="submit"
                        className="bg-purple-600 text-white rounded-xl p-3 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 mb-[2px]"
                        disabled={!inputValue.trim() || isSending}
                        aria-label="Отправить сообщение"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>

            {/* Navigation */}
            <BottomNav activeTab="chat" />
        </div>
    );
}