"use client";
import { useState, useEffect, useRef, useCallback, FormEvent, KeyboardEvent } from "react";
import { Send, Trash2, Copy, Building2, Wrench, Ruler, Bell, Home, BarChart3, AlertTriangle, User, Menu, Bot, BellRing, Check, Clock, ChevronRight, X } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import axios, { AxiosError } from "axios";
import api from "@/lib/api";
import ReactMarkdown from 'react-markdown';
import {useAuthStore} from "@/stores/useAuthStore";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { useNotificationStore } from "@/stores/notificationStore";

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
    const notifications = useNotificationStore(state => state.notifications)
    const [activeMessageTab, setActiveMessageTab] = useState<"chat" | "notifications">("chat")
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
    const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
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

    // Форматирование времени уведомления
    const formatNotificationTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return `${diffMins} мин назад`;
        if (diffHours < 24) return `${diffHours} ч назад`;
        if (diffDays < 7) return `${diffDays} дн назад`;
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="flex flex-col h-screen bg-black safe-area-padding">
            {/* Header с вкладками */}
            <header className="sticky top-0 z-10 bg-black pt-12 pb-4 px-4 safe-area-top">
                <h1 className="text-2xl font-bold text-white mb-4">Сообщение</h1>
                
                {/* Переключатель вкладок */}
                <div className="flex rounded-xl overflow-hidden bg-[#3D3D3D]">
                    <button
                        onClick={() => setActiveMessageTab("chat")}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                            activeMessageTab === "chat"
                                ? "bg-[#5A5A5A] text-white"
                                : "bg-transparent text-gray-400"
                        }`}
                    >
                        <Bot className="w-4 h-4" />
                        Чат-бот
                    </button>
                    <button
                        onClick={() => setActiveMessageTab("notifications")}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                            activeMessageTab === "notifications"
                                ? "bg-[#5A5A5A] text-white"
                                : "bg-transparent text-gray-400"
                        }`}
                    >
                        <BellRing className="w-4 h-4" />
                        Уведомления
                        {notifications.length > 0 && (
                            <span className="bg-[#F35713] text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                                {notifications.length}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Контент в зависимости от активной вкладки */}
            {activeMessageTab === "chat" ? (
                <>
                    {/* Chat Messages */}
                    <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full pb-40">
                        {/* Topics Menu */}
                        {showTopics && (
                            <div className="space-y-3 mb-4">
                                {topics.map((topic) => (
                                    <button
                                        key={topic.id}
                                        onClick={() => handleTopicSelect(topic.id)}
                                        className="w-full bg-[#1C1C1E] rounded-xl p-4 border border-gray-700 hover:border-[#F35713] hover:shadow-md transition-all text-left flex items-start gap-3 group"
                                    >
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#F35713]/20 flex items-center justify-center text-[#F35713] group-hover:bg-[#F35713]/30 transition-colors">
                                            {topic.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white text-sm mb-1">{topic.title}</h3>
                                            <p className="text-xs text-gray-400">{topic.description}</p>
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
                                    className="text-sm text-[#F35713] hover:underline mb-2 flex items-center gap-1"
                                >
                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                    Назад к темам
                                </button>
                                <div className="bg-[#1C1C1E] rounded-xl p-4 border border-gray-700 mb-3">
                                    <h3 className="font-semibold text-white text-base mb-2">
                                        {topics.find(t => t.id === selectedTopic)?.title}
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-3">
                                        Выберите вопрос или напишите свой:
                                    </p>
                                    <div className="space-y-2">
                                        {topics.find(t => t.id === selectedTopic)?.questions.map((question, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleQuestionSelect(question)}
                                                className="w-full text-left p-3 rounded-lg bg-[#2C2C2E] hover:bg-[#F35713]/20 transition-all text-sm text-gray-300"
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
                                    <div className="w-8 h-8 rounded-full bg-[#F35713] flex items-center justify-center flex-shrink-0 mt-1">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                )}

                                <div className="relative group max-w-[85%]">
                                    <button
                                        onClick={() => handleCopyMessage(msg.text)}
                                        className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-[#2C2C2E] rounded-full shadow-sm hover:bg-[#3C3C3E] border border-gray-600"
                                        title="Копировать"
                                    >
                                        <Copy className="w-3 h-3 text-gray-400" />
                                    </button>
                                    <div className={`px-4 py-3 rounded-2xl ${msg.from === "bot" ? "bg-[#2C2C2E] text-white rounded-tl-none" : "bg-[#F35713] text-white rounded-tr-none"}`}>
                                        <ReactMarkdown components={{
                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                            code: ({ node, ...props }) => <code className="bg-black/30 px-1 rounded text-sm font-mono" {...props} />,
                                            a: ({ node, ...props }) => <a className="text-[#F9AB89] hover:underline" {...props} />
                                        }}>
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                {msg.from === "user" && (
                                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 mt-1">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isBotTyping && (
                            <div className="flex justify-start items-end gap-2">
                                <div className="w-8 h-8 rounded-full bg-[#F35713] flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div className="px-4 py-3 rounded-2xl bg-[#2C2C2E] text-white rounded-tl-none">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-[#F35713] animate-bounce"></div>
                                        <div className="w-2 h-2 rounded-full bg-[#F35713] animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                        <div className="w-2 h-2 rounded-full bg-[#F35713] animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} aria-hidden />
                    </main>

                    {/* Chat Input */}
                    <form
                        onSubmit={handleSubmit}
                        className="fixed bottom-20 left-0 right-0 bg-black border-t border-gray-800 p-4 max-w-2xl mx-auto w-full safe-area-bottom"
                    >
                        {error && (
                            <div className="text-[#F35713] text-xs mb-2 px-2">{error}</div>
                        )}
                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={handleShowTopicsMenu}
                                className="p-3 rounded-xl bg-[#2C2C2E] text-gray-400 hover:text-white transition-colors"
                                title="Меню тем"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Напишите сообщение..."
                                className="flex-1 border border-gray-700 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#F35713] focus:border-transparent text-sm min-h-[48px] max-h-[150px] bg-[#2C2C2E] text-white placeholder-gray-500"
                                rows={1}
                                aria-label="Поле ввода сообщения"
                                disabled={isSending}
                            />
                            <button
                                type="submit"
                                className="bg-[#F35713] text-white rounded-xl p-3 hover:bg-[#E04A0A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!inputValue.trim() || isSending}
                                aria-label="Отправить сообщение"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </>
            ) : (
                <>
                    {/* Notifications List */}
                    <main className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <BellRing className="w-16 h-16 mb-4 opacity-50" />
                                <p className="text-lg font-medium">Нет уведомлений</p>
                                <p className="text-sm">Здесь будут ваши уведомления</p>
                            </div>
                        ) : (
                            notifications.map((notification: any, index: number) => (
                                <button
                                    key={notification.id || index}
                                    onClick={() => setSelectedNotification(notification)}
                                    className="w-full bg-[#1C1C1E] rounded-xl p-4 border border-gray-700 hover:border-[#F35713] transition-all text-left flex items-start gap-3"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#F35713]/20 flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-[#F35713]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white text-sm mb-1 truncate">
                                            {notification.title || 'Уведомление'}
                                        </h3>
                                        <p className="text-xs text-gray-400 line-clamp-2">
                                            {notification.message || notification.body || 'Новое уведомление'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Clock className="w-3 h-3 text-gray-500" />
                                            <span className="text-xs text-gray-500">
                                                {formatNotificationTime(notification.created_at || notification.timestamp || new Date().toISOString())}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                </button>
                            ))
                        )}
                    </main>

                    {/* Notification Detail Modal */}
                    {selectedNotification && (
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
                            <div className="bg-[#1C1C1E] w-full max-w-lg rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-white">
                                        {selectedNotification.title || 'Уведомление'}
                                    </h2>
                                    <button
                                        onClick={() => setSelectedNotification(null)}
                                        className="p-2 rounded-full bg-[#2C2C2E] text-gray-400 hover:text-white"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mb-4 text-gray-400 text-sm">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        {new Date(selectedNotification.created_at || selectedNotification.timestamp || new Date()).toLocaleString('ru-RU')}
                                    </span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    {selectedNotification.message || selectedNotification.body || 'Нет содержимого'}
                                </p>
                                {selectedNotification.request_id && (
                                    <div className="mt-4 p-3 bg-[#2C2C2E] rounded-xl">
                                        <p className="text-xs text-gray-400 mb-1">Связанная заявка</p>
                                        <p className="text-white font-medium">#{selectedNotification.request_id}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Navigation */}
            <BottomNav activeTab="help" />

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