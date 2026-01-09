"use client";
import { useState, useEffect, useRef, useCallback, FormEvent, KeyboardEvent } from "react";
import { Send, ArrowLeft, Trash2, Copy, Building2, Wrench, Ruler, Bell, Home, BarChart3, AlertTriangle, User, Menu } from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import axios, { AxiosError } from "axios";
import api from "@/lib/api";
import ReactMarkdown from 'react-markdown';
import {useAuthStore} from "@/stores/useAuthStore";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

type Message = {
    from: "user" | "bot";
    text: string;
};
type ApiError = {
    error?: string;
}

type Topic = {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    questions: string[];
}

const topics: Topic[] = [
    {
        id: "booking",
        title: "Бронирование комнат",
        description: "Найти и забронировать переговорную или кабинет",
        icon: <Building2 className="w-5 h-5" />,
        questions: [
            "Как забронировать комнату?",
            "Как изменить или отменить бронь?",
            "Почему комната недоступна?",
            "Где посмотреть мои бронирования?",
            "Что происходит, если я опоздал?"
        ]
    },
    {
        id: "requests",
        title: "Сервисные заявки",
        description: "Клининг, КТО, административные заявки",
        icon: <Wrench className="w-5 h-5" />,
        questions: [
            "Как создать заявку?",
            "Какие типы заявок доступны?",
            "Как прикрепить фото?",
            "Как посмотреть статус?",
            "Кто обрабатывает заявку?"
        ]
    },
    {
        id: "calculator",
        title: "Калькулятор высоты стола",
        description: "Подобрать комфортную высоту стола под себя",
        icon: <Ruler className="w-5 h-5" />,
        questions: [
            "Как работает калькулятор?",
            "Нужно ли вводить вес?",
            "В чём разница «сидя» / «стоя»?",
            "Насколько точны рекомендации?"
        ]
    },
    {
        id: "health",
        title: "Хелси-уведомления",
        description: "Напоминания встать, пройтись и сделать перерыв",
        icon: <Bell className="w-5 h-5" />,
        questions: [
            "Почему пришло уведомление «пора встать»?",
            "Как выбрать тайминг?",
            "Как включить / выключить уведомления?",
            "Работают ли уведомления во время встреч?",
            "Где посмотреть историю уведомлений?"
        ]
    },
    {
        id: "smart-home",
        title: "Умный дом",
        description: "Управление светом, климатом и устройствами офиса",
        icon: <Home className="w-5 h-5" />,
        questions: [
            "Что такое «умный дом» в WorkFlow?",
            "Какие устройства я могу управлять?",
            "Почему у меня есть / нет доступа?",
            "В каких кабинетах мне доступно управление?",
            "Можно ли управлять несколькими кабинетами?",
            "Когда доступ активен, а когда блокируется?",
            "Кто выдаёт и забирает доступ?",
            "Что делать, если устройство не отвечает?"
        ]
    },
    {
        id: "statistics",
        title: "Статистика",
        description: "Загрузка комнат, активность, отчёты",
        icon: <BarChart3 className="w-5 h-5" />,
        questions: [
            "Какие данные доступны?",
            "За какой период?",
            "Что означают показатели?",
            "Можно ли выгрузить отчёт?"
        ]
    },
    {
        id: "errors",
        title: "Ошибки и поддержка",
        description: "Ошибки, инструкции, вопросы по работе системы",
        icon: <AlertTriangle className="w-5 h-5" />,
        questions: [
            "Ошибка сервера — что делать?",
            "Не работает бронирование",
            "Нет доступа к умному дому",
            "Не приходят уведомления",
            "Куда обратиться за помощью?"
        ]
    },
    {
        id: "profile",
        title: "Профиль и доступы",
        description: "Настройки, роли, доступы к офисам",
        icon: <User className="w-5 h-5" />,
        questions: [
            "Где изменить данные профиля?",
            "Как работают мои доступы?",
            "Почему у меня ограниченные права?",
            "Кто может изменить мои доступы?"
        ]
    }
];

export default function ChatPage() {
    const {token} = useAuthStore()
    const [messages, setMessages] = useState<Message[]>([
        { from: "bot", text: "Выберите, с чем хотите работать 👉" },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showClearModal, setShowClearModal] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [showTopics, setShowTopics] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const getChatStorageKey = useCallback(() => {
        return token ? `chat-messages-${token}` : 'chat-messages';
    }, [token]);
    useEffect(() => {
        const saved = localStorage.getItem(getChatStorageKey());
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 1) {
                    setMessages(parsed);
                    setShowTopics(false);
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
        setShowTopics(false);
        setSelectedTopic(null);
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
        setShowClearModal(true);
    };

    const confirmClearChat = () => {
        setMessages([{ from: "bot", text: "Выберите, с чем хотите работать 👉" }]);
        localStorage.removeItem(getChatStorageKey());
        setShowClearModal(false);
        setSelectedTopic(null);
        setShowTopics(true);
    };

    const handleTopicSelect = (topicId: string) => {
        setSelectedTopic(topicId);
        setShowTopics(false);
    };

    const handleQuestionSelect = async (question: string) => {
        setSelectedTopic(null);
        setShowTopics(false);
        setInputValue("");
        
        // Добавляем вопрос как сообщение пользователя
        setMessages((prev) => [...prev, { from: "user", text: question }]);
        
        // Отправляем вопрос на сервер
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
                message: question,
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

    const handleBackToTopics = () => {
        setSelectedTopic(null);
        setShowTopics(true);
    };

    const handleShowTopicsMenu = () => {
        setSelectedTopic(null);
        setShowTopics(true);
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
        <div className="flex flex-col h-screen bg-[#F3F3F3] safe-area-padding">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-gradient-to-r from-[#114A65]/20 via-[#114A65]/10 to-[#114A65]/20 border-b border-[#C4C4CE] backdrop-blur-md p-4 safe-area-top">
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
                            onClick={handleShowTopicsMenu}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                            title="Показать меню тем"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
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
            <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full pb-40">
                {/* Topics Menu */}
                {showTopics && (
                    <div className="space-y-3 mb-4">
                        {topics.map((topic) => (
                            <button
                                key={topic.id}
                                onClick={() => handleTopicSelect(topic.id)}
                                className="w-full bg-white rounded-xl p-4 border border-[#C4C4CE] hover:border-[#114A65] hover:shadow-md transition-all text-left flex items-start gap-3 group"
                            >
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-r from-[#114A65]/10 to-[#B8400E]/10 flex items-center justify-center text-[#114A65] group-hover:from-[#114A65]/20 group-hover:to-[#B8400E]/20 transition-colors">
                                    {topic.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{topic.title}</h3>
                                    <p className="text-xs text-gray-600">{topic.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Questions for selected topic */}
                {selectedTopic && !showTopics && (
                    <div className="space-y-3 mb-4">
                        <button
                            onClick={handleBackToTopics}
                            className="text-sm text-[#114A65] hover:underline mb-2 flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Назад к темам
                        </button>
                        <div className="bg-white rounded-xl p-4 border border-[#C4C4CE] mb-3">
                            <h3 className="font-semibold text-gray-900 text-base mb-2">
                                {topics.find(t => t.id === selectedTopic)?.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                                Выберите вопрос или напишите свой:
                            </p>
                            <div className="space-y-2">
                                {topics.find(t => t.id === selectedTopic)?.questions.map((question, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleQuestionSelect(question)}
                                        className="w-full text-left p-3 rounded-lg bg-[#F3F3F3] hover:bg-[#114A65]/10 hover:border hover:border-[#114A65]/20 transition-all text-sm text-gray-700"
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

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
                            <div className={`px-4 py-3 rounded-2xl ${msg.from === "bot" ? "bg-gradient-to-r from-[#114A65]/20 via-[#114A65]/10 to-[#114A65]/20 text-[#040404] rounded-tl-none backdrop-blur-sm" : "bg-gradient-to-r from-[#F3F3F3] to-[#C4C4CE]/30 text-[#040404] rounded-tr-none backdrop-blur-sm"}`}>
                                <ReactMarkdown components={{
                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                    code: ({ node, ...props }) => <code className="bg-[#C4C4CE]/30 px-1 rounded text-sm font-mono" {...props} />,
                                    a: ({ node, ...props }) => <a className="text-[#114A65] hover:underline" {...props} />
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
                        <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#114A65]/20 via-[#114A65]/10 to-[#114A65]/20 text-[#040404] rounded-tl-none backdrop-blur-sm">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 rounded-full bg-[#114A65] animate-bounce"></div>
                                <div className="w-2 h-2 rounded-full bg-[#114A65] animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                <div className="w-2 h-2 rounded-full bg-[#114A65] animate-bounce" style={{animationDelay: '0.4s'}}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} aria-hidden />
            </main>

            {/* Input */}
            <form
                onSubmit={handleSubmit}
                className="fixed bottom-16 left-0 right-0 bg-gradient-to-r from-[#F3F3F3] via-white to-[#F3F3F3] border-t border-[#C4C4CE] backdrop-blur-md p-4 max-w-2xl mx-auto w-full safe-area-bottom"
            >
                {error && (
                    <div className="text-[#B8400E] text-xs mb-2 px-2">{error}</div>
                )}
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Напишите сообщение..."
                        className="flex-1 border border-[#C4C4CE] rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#114A65] focus:border-transparent text-sm min-h-[48px] max-h-[150px] bg-white"
                        rows={1}
                        aria-label="Поле ввода сообщения"
                        disabled={isSending}
                    />
                    <button
                        type="submit"
                        className="bg-gradient-to-r from-[#114A65] to-[#B8400E] text-white rounded-xl p-3 hover:from-[#0d3a4f] hover:to-[#A3390D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#114A65] mb-[2px]"
                        disabled={!inputValue.trim() || isSending}
                        aria-label="Отправить сообщение"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>

            {/* Navigation */}
            <BottomNav activeTab="chat" />

            {/* Modal для очистки чата */}
            <DeleteConfirmationModal
                isOpen={showClearModal}
                onClose={() => setShowClearModal(false)}
                onConfirm={confirmClearChat}
                title="Очистить историю чата?"
                description="Вы уверены, что хотите очистить всю историю переписки? Это действие нельзя отменить."
                confirmText="Очистить"
                cancelText="Отмена"
            />
        </div>
    );
}