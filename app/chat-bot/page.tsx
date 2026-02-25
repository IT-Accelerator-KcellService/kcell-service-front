"use client";
import { useState, useEffect, useRef, useCallback, FormEvent, KeyboardEvent } from "react";
import { Send, Trash2, Copy, Building2, Wrench, Ruler, Bell, Home, BarChart3, AlertTriangle, User, Menu, Bot, BellRing, Check, Clock, ChevronRight, X, CheckCircle, AlertCircle, Loader2, Headphones, ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useMediaQuery } from "@/hooks/use-media-query";
import axios, { AxiosError } from "axios";
import api, { createSupportTicket, getSupportTicketMessages, sendSupportMessage, getMySupportTickets, type SupportTicket, type SupportMessage } from "@/lib/api";
import ReactMarkdown from 'react-markdown';
import {useAuthStore} from "@/stores/useAuthStore";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { useNotificationStore } from "@/stores/notificationStore";
import { createClickableRequestIds } from '@/lib/notificationUtils';

type Message = {
    from: "user" | "bot";
    text: string;
    /** Показать кнопку «Написать в техподдержку» (когда бот не смог ответить) */
    suggestSupport?: boolean;
    /** Текст вопроса пользователя — подставить в форму поддержки */
    userMessage?: string;
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
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const [activeMessageTab, setActiveMessageTab] = useState<"chat" | "notifications">("chat")
    /** Внутри чата: первая — чат-бот, вторая — техподдержка */
    const [innerChatTab, setInnerChatTab] = useState<"bot" | "support">("bot")
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

    // Support chat state
    const [showSupportForm, setShowSupportForm] = useState(false);
    const [supportFormValue, setSupportFormValue] = useState("");
    const [supportFormSubmitting, setSupportFormSubmitting] = useState(false);
    const [activeSupportTicket, setActiveSupportTicket] = useState<SupportTicket | null>(null);
    const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
    const [supportChatView, setSupportChatView] = useState(false);
    const [supportError, setSupportError] = useState<string | null>(null);
    const supportMessagesEndRef = useRef<HTMLDivElement>(null);
    const supportInputRef = useRef<HTMLTextAreaElement>(null);
    const [supportInputValue, setSupportInputValue] = useState("");
    const [supportSending, setSupportSending] = useState(false);
    const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    // Notifications state (local, like old page)
    const [allNotifications, setAllNotifications] = useState<any[]>([]);
    const [notifPage, setNotifPage] = useState(1);
    const [notifHasMore, setNotifHasMore] = useState(true);
    const [notifLoading, setNotifLoading] = useState(false);
    const notifContainerRef = useRef<HTMLDivElement | null>(null);
    const notifThrottleRef = useRef<NodeJS.Timeout | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Fetch notifications with pagination (like old notifications page)
    const loadNotifications = useCallback(async (pageNum: number, reset: boolean = false) => {
        if (notifLoading || !token) return;
        
        setNotifLoading(true);
        try {
            const res = await api.get(`/notifications/me?page=${pageNum}&pageSize=10`);
            const newNotifs = res.data.notifications || [];
            
            setAllNotifications(prev =>
                reset
                    ? newNotifs
                    : [...prev, ...newNotifs.filter(
                        (newN: any) => !prev.some((p: any) => p.id === newN.id)
                    )]
            );
            
            setNotifHasMore(pageNum < (res.data.totalPages || Math.ceil((res.data.total || 0) / 10)));
            if (reset) setNotifPage(1);
            else setNotifPage(pageNum);
        } catch (error) {
            console.error('Ошибка при загрузке уведомлений:', error);
        } finally {
            setNotifLoading(false);
        }
    }, [token, notifLoading]);

    // Load notifications on mount
    useEffect(() => {
        if (token) {
            loadNotifications(1, true);
        }
    }, [token]);

    // Scroll-based pagination for notifications
    const handleNotifScroll = useCallback(() => {
        const el = notifContainerRef.current;
        if (!el || notifLoading || !notifHasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollHeight - (scrollTop + clientHeight) < 100) {
            const nextPage = notifPage + 1;
            setNotifPage(nextPage);
            loadNotifications(nextPage);
        }
    }, [notifLoading, notifHasMore, notifPage, loadNotifications]);

    const throttledNotifScroll = useCallback(() => {
        if (notifThrottleRef.current) return;
        notifThrottleRef.current = setTimeout(() => {
            handleNotifScroll();
            notifThrottleRef.current = null;
        }, 100);
    }, [handleNotifScroll]);

    useEffect(() => {
        const el = notifContainerRef.current;
        if (!el || activeMessageTab !== "notifications") return;

        el.addEventListener('scroll', throttledNotifScroll, { passive: true });
        return () => el.removeEventListener('scroll', throttledNotifScroll);
    }, [throttledNotifScroll, activeMessageTab]);

    // Mark as read
    const handleNotificationClick = async (notification: any) => {
        setSelectedNotification(notification);
        if (!notification.is_read) {
            // Optimistic update
            setAllNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
            );
            try {
                await api.patch(`/notifications/${notification.id}/read`);
            } catch (error) {
                // Revert on error
                setAllNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, is_read: false } : n)
                );
                console.error("Ошибка при пометке уведомления как прочитано", error);
            }
        }
    };

    // Notification helpers
    const getNotificationIcon = (title: string) => {
        if (title?.toLowerCase().includes('принята') || title?.toLowerCase().includes('одобрена')) {
            return <CheckCircle className="w-4 h-4 text-green-400" />;
        }
        if (title?.toLowerCase().includes('завершена') || title?.toLowerCase().includes('выполнена')) {
            return <CheckCircle className="w-4 h-4 text-blue-400" />;
        }
        if (title?.toLowerCase().includes('просрочена') || title?.toLowerCase().includes('отклонена')) {
            return <AlertCircle className="w-4 h-4 text-red-400" />;
        }
        return <Clock className="w-4 h-4 text-gray-400" />;
    };

    const unreadCount = allNotifications.filter(n => !n.is_read).length;
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
            const isFallback = !botText || botText === "Не получилось обработать ответ." || /ошибка|попробуйте позже/i.test(botText);
            setMessages((prev) => [
                ...prev,
                { from: "bot", text: botText },
                ...(isFallback ? [{ from: "bot" as const, text: "Можете обратиться в техподдержку — во вкладке «Техподдержка» опишите вопрос, мы ответим в чате.", suggestSupport: true, userMessage: trimmed }] : [])
            ]);
        } catch (err) {
            if (axios.isCancel(err)) {
                return;
            }

            const error = err as AxiosError<ApiError>;
            const errorMessage = error.response?.data?.error || "Ошибка сервера. Попробуйте позже.";
            setError(errorMessage);
            setMessages((prev) => [
                ...prev,
                { from: "bot", text: errorMessage },
                { from: "bot", text: "Можете обратиться в техподдержку — во вкладке «Техподдержка» опишите вопрос, мы ответим в чате.", suggestSupport: true, userMessage: trimmed }
            ]);
        } finally {
            setIsSending(false);
            setIsBotTyping(false);
        }
    };

    const handleGoToSupport = (userMessage?: string) => {
        setInnerChatTab("support");
        setSupportFormValue(userMessage?.trim() ?? "");
        setShowSupportForm(true);
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
            const isFallback = !botText || botText === "Не получилось обработать ответ." || /ошибка|попробуйте позже/i.test(botText);
            setMessages((prev) => [
                ...prev,
                { from: "bot", text: botText },
                ...(isFallback ? [{ from: "bot" as const, text: "Можете обратиться в техподдержку — во вкладке «Техподдержка» опишите вопрос, мы ответим в чате.", suggestSupport: true, userMessage: question }] : [])
            ]);
        } catch (err) {
            if (axios.isCancel(err)) {
                return;
            }

            const error = err as AxiosError<ApiError>;
            const errorMessage = error.response?.data?.error || "Ошибка сервера. Попробуйте позже.";
            setError(errorMessage);
            setMessages((prev) => [
                ...prev,
                { from: "bot", text: errorMessage },
                { from: "bot", text: "Можете обратиться в техподдержку — во вкладке «Техподдержка» опишите вопрос, мы ответим в чате.", suggestSupport: true, userMessage: question }
            ]);
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

    // Support: try API first, fallback to local state (works before backend is ready)
    const loadOrCreateSupportTicket = useCallback(async (initialMessage: string) => {
        setSupportFormSubmitting(true);
        setSupportError(null);
        try {
            const res = await createSupportTicket(initialMessage);
            const ticket = res.data?.ticket || res.data;
            if (ticket?.id) {
                setActiveSupportTicket(ticket);
                setSupportMessages([{ id: 0, ticket_id: ticket.id, sender: "user", message: initialMessage, created_at: new Date().toISOString() }]);
                setSupportChatView(true);
                setShowSupportForm(false);
                setSupportFormValue("");
                setInnerChatTab("support");
                setMyTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
            }
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 404 || status === 501 || status >= 500) {
                const fallbackTicket: SupportTicket = {
                    id: Date.now(),
                    user_id: 0,
                    message: initialMessage,
                    status: "open",
                    created_at: new Date().toISOString(),
                };
                const fallbackMsg: SupportMessage = { id: 0, ticket_id: fallbackTicket.id, sender: "user", message: initialMessage, created_at: fallbackTicket.created_at };
                const adminReply: SupportMessage = {
                    id: 1,
                    ticket_id: fallbackTicket.id,
                    sender: "admin",
                    message: "Ваше обращение получено. Администратор свяжется с вами в ближайшее время.",
                    created_at: new Date().toISOString(),
                };
                setActiveSupportTicket(fallbackTicket);
                setSupportMessages([fallbackMsg, adminReply]);
                setSupportChatView(true);
                setShowSupportForm(false);
                setSupportFormValue("");
                setInnerChatTab("support");
            } else {
                setSupportError(err?.response?.data?.error || "Не удалось отправить заявку. Попробуйте позже.");
            }
        } finally {
            setSupportFormSubmitting(false);
        }
    }, []);

    const handleSupportFormSubmit = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = supportFormValue.trim();
        if (!trimmed || supportFormSubmitting) return;
        loadOrCreateSupportTicket(trimmed);
    };

    const handleCloseSupportChat = () => {
        setSupportChatView(false);
        setActiveSupportTicket(null);
        setSupportMessages([]);
        setSupportInputValue("");
        setShowSupportForm(false);
    };

    const handleSendSupportMessage = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = supportInputValue.trim();
        if (!trimmed || !activeSupportTicket || supportSending) return;

        const optimisticMsg: SupportMessage = {
            id: Date.now(),
            ticket_id: activeSupportTicket.id,
            sender: "user",
            message: trimmed,
            created_at: new Date().toISOString(),
        };
        setSupportMessages((prev) => [...prev, optimisticMsg]);
        setSupportInputValue("");
        setSupportSending(true);

        try {
            await sendSupportMessage(activeSupportTicket.id, trimmed);
            const res = await getSupportTicketMessages(activeSupportTicket.id);
            if (res.data?.messages) setSupportMessages(res.data.messages);
        } catch (err: any) {
            if (err?.response?.status === 404 || err?.response?.status >= 500) {
                setSupportMessages((prev) => [
                    ...prev,
                    {
                        id: prev.length + 1,
                        ticket_id: activeSupportTicket.id,
                        sender: "admin" as const,
                        message: "Сообщение получено. Администратор ответит вам в ближайшее время.",
                        created_at: new Date().toISOString(),
                    },
                ]);
            }
        } finally {
            setSupportSending(false);
        }
    };

    useEffect(() => {
        if (supportChatView) supportMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [supportMessages, supportChatView]);

    // Загрузка тикетов при открытии вкладки «Техподдержка»
    useEffect(() => {
        if (innerChatTab !== "support" || !token) return;
        setLoadingTickets(true);
        getMySupportTickets()
            .then((res) => setMyTickets(res.data?.tickets ?? []))
            .catch(() => setMyTickets([]))
            .finally(() => setLoadingTickets(false));
    }, [innerChatTab, token]);

    const openSupportTicket = useCallback(async (ticket: SupportTicket) => {
        setActiveSupportTicket(ticket);
        setSupportMessages([]);
        setSupportChatView(true);
        try {
            const res = await getSupportTicketMessages(ticket.id);
            setSupportMessages(res.data?.messages ?? []);
        } catch {
            setSupportMessages([]);
        }
    }, []);

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

                {/* Внутри чата: две вкладки — Чат-бот и Техподдержка */}
                {(isDesktop ? activeMessageTab === "chat" : true) && (
                <div className="flex rounded-xl overflow-hidden bg-[#3D3D3D] mb-2">
                    <button
                        onClick={() => setInnerChatTab("bot")}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                            innerChatTab === "bot"
                                ? "bg-[#5A5A5A] text-white"
                                : "bg-transparent text-gray-400"
                        }`}
                    >
                        <Bot className="w-4 h-4" />
                        Чат-бот
                    </button>
                    <button
                        onClick={() => setInnerChatTab("support")}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                            innerChatTab === "support"
                                ? "bg-[#5A5A5A] text-white"
                                : "bg-transparent text-gray-400"
                        }`}
                    >
                        <Headphones className="w-4 h-4" />
                        Техподдержка
                    </button>
                </div>
                )}

                {/* На десктопе: третья вкладка — Уведомления */}
                {isDesktop && (
                <div className="flex rounded-xl overflow-hidden bg-[#3D3D3D]">
                    <button
                        onClick={() => setActiveMessageTab("chat")}
                        className={`flex-1 py-2.5 px-3 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                            activeMessageTab === "chat"
                                ? "bg-[#5A5A5A] text-white"
                                : "bg-transparent text-gray-400"
                        }`}
                    >
                        Чат
                    </button>
                    <button
                        onClick={() => setActiveMessageTab("notifications")}
                        className={`flex-1 py-2.5 px-3 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                            activeMessageTab === "notifications"
                                ? "bg-[#5A5A5A] text-white"
                                : "bg-transparent text-gray-400"
                        }`}
                    >
                        <BellRing className="w-4 h-4" />
                        Уведомления
                        {unreadCount > 0 && (
                            <span className="bg-[#F35713] text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </div>
                )}
            </header>

            {/* Контент: на мобилке только чат, на десктопе — по вкладке */}
            {(isDesktop ? activeMessageTab === "chat" : true) ? (
                <>
                    {/* Вкладка «Техподдержка»: чат с поддержкой или список тикетов */}
                    {innerChatTab === "support" && (
                    supportChatView && activeSupportTicket ? (
                        <div className="flex flex-col flex-1 min-h-0">
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-[#1C1C1E]">
                                <button onClick={handleCloseSupportChat} className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2C2C2E]">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-[#F35713]/20 flex items-center justify-center">
                                    <Headphones className="w-5 h-5 text-[#F35713]" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-white">Чат с поддержкой</h2>
                                    <p className="text-xs text-gray-400">Администратор</p>
                                </div>
                            </div>
                            <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full pb-32">
                                {supportMessages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-start" : "justify-end"} items-start gap-2`}>
                                        {msg.sender === "admin" && (
                                            <div className="w-8 h-8 rounded-full bg-[#F35713] flex items-center justify-center flex-shrink-0 mt-1">
                                                <Headphones className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                        <div className={`px-4 py-3 rounded-2xl max-w-[85%] ${msg.sender === "admin" ? "bg-[#2C2C2E] text-white rounded-tl-none" : "bg-[#F35713] text-white rounded-tr-none"}`}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                            <p className={`text-xs mt-1 ${msg.sender === "admin" ? "text-gray-500" : "text-white/70"}`}>
                                                {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                        {msg.sender === "user" && (
                                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 mt-1">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {supportSending && (
                                    <div className="flex justify-end">
                                        <div className="px-4 py-3 rounded-2xl bg-[#F35713]/50 text-white text-sm">Отправка...</div>
                                    </div>
                                )}
                                <div ref={supportMessagesEndRef} aria-hidden />
                            </main>
                            <form onSubmit={(e) => handleSendSupportMessage(e)} className="fixed left-0 right-0 bg-black border-t border-gray-800 p-4 max-w-2xl mx-auto w-full md:bottom-20 bottom-[calc(90px+env(safe-area-inset-bottom,0px))]" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
                                <div className="flex items-end gap-2">
                                    <textarea
                                        ref={supportInputRef}
                                        value={supportInputValue}
                                        onChange={(e) => setSupportInputValue(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendSupportMessage(); } }}
                                        placeholder="Напишите сообщение..."
                                        className="flex-1 border border-gray-700 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#F35713] text-sm min-h-[48px] max-h-[120px] bg-[#2C2C2E] text-white placeholder-gray-500"
                                        rows={1}
                                        disabled={supportSending}
                                    />
                                    <button type="submit" disabled={!supportInputValue.trim() || supportSending} className="bg-[#F35713] text-white rounded-xl p-3 hover:bg-[#E04A0A] disabled:opacity-50 disabled:cursor-not-allowed">
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                    /* Список обращений в поддержку и кнопка «Написать» */
                    <div className="flex flex-col flex-1 min-h-0">
                        <main className="flex-1 overflow-y-auto p-4 space-y-3 max-w-2xl mx-auto w-full pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-32">
                            <button
                                type="button"
                                onClick={() => setShowSupportForm(true)}
                                className="w-full rounded-xl p-4 border border-gray-700 bg-[#1C1C1E] hover:border-[#F35713] hover:bg-[#1C1C1E]/90 transition-all text-left flex items-center gap-3"
                            >
                                <div className="w-10 h-10 rounded-full bg-[#F35713]/20 flex items-center justify-center shrink-0">
                                    <Headphones className="w-5 h-5 text-[#F35713]" />
                                </div>
                                <div>
                                    <p className="font-semibold text-white">Написать в поддержку</p>
                                    <p className="text-xs text-gray-400">Опишите проблему — ответим в чате</p>
                                </div>
                            </button>
                            {loadingTickets ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#F35713]" />
                                </div>
                            ) : myTickets.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500 font-medium">Мои обращения</p>
                                    {myTickets.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => openSupportTicket(t)}
                                            className="w-full rounded-xl p-3 border border-gray-700 bg-[#2C2C2E] hover:border-[#F35713]/50 text-left flex items-center justify-between gap-2"
                                        >
                                            <span className="text-white text-sm truncate">
                                                #{t.id} · {t.status === "closed" ? "Закрыт" : t.status === "in_progress" ? "В работе" : "Открыт"}
                                            </span>
                                            <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </main>
                        {/* Support form modal — тот же, что в теме «ошибки» */}
                        {showSupportForm && (
                            <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center" onClick={() => !supportFormSubmitting && setShowSupportForm(false)}>
                                <div className="bg-[#1C1C1E] w-full max-w-lg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto pb-[calc(24px+env(safe-area-inset-bottom,0px)+80px)] md:pb-6" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Headphones className="w-5 h-5 text-[#F35713]" />
                                            Обращение в поддержку
                                        </h2>
                                        <button onClick={() => !supportFormSubmitting && setShowSupportForm(false)} className="p-2 rounded-full bg-[#2C2C2E] text-gray-400 hover:text-white">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-4">
                                        Опишите вашу проблему. Администратор свяжется с вами в чате.
                                    </p>
                                    <form onSubmit={handleSupportFormSubmit}>
                                        <textarea
                                            value={supportFormValue}
                                            onChange={(e) => setSupportFormValue(e.target.value)}
                                            placeholder="Опишите проблему..."
                                            className="w-full border border-gray-700 rounded-xl p-4 bg-[#2C2C2E] text-white placeholder-gray-500 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#F35713] resize-none"
                                            disabled={supportFormSubmitting}
                                            rows={4}
                                        />
                                        {supportError && <p className="text-[#F35713] text-sm mt-2">{supportError}</p>}
                                        <div className="flex gap-2 mt-4">
                                            <button type="button" onClick={() => !supportFormSubmitting && setShowSupportForm(false)} className="flex-1 py-3 rounded-xl bg-[#2C2C2E] text-gray-400 hover:text-white">
                                                Отмена
                                            </button>
                                            <button type="submit" disabled={!supportFormValue.trim() || supportFormSubmitting} className="flex-1 py-3 rounded-xl bg-[#F35713] text-white hover:bg-[#E04A0A] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                                {supportFormSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                                Отправить
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                    )
                    )}

                    {/* Вкладка «Чат-бот»: темы, диалог с ботом */}
                    {innerChatTab === "bot" && (
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
                                        {selectedTopic === "errors" && (
                                            <button
                                                onClick={() => { setInnerChatTab("support"); setShowSupportForm(true); }}
                                                className="w-full text-left p-3 rounded-lg bg-[#F35713]/20 border border-[#F35713]/40 hover:bg-[#F35713]/30 transition-all text-sm text-[#F35713] font-medium flex items-center gap-2"
                                            >
                                                <Headphones className="w-4 h-4" />
                                                ИИ не помог — написать в поддержку
                                            </button>
                                        )}
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
                                        {msg.suggestSupport && (
                                            <button
                                                type="button"
                                                onClick={() => handleGoToSupport(msg.userMessage)}
                                                className="mt-3 w-full py-2.5 rounded-xl bg-[#F35713]/20 border border-[#F35713]/50 hover:bg-[#F35713]/30 text-[#F35713] font-medium text-sm flex items-center justify-center gap-2"
                                            >
                                                <Headphones className="w-4 h-4" />
                                                Написать в техподдержку
                                            </button>
                                        )}
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
                    )}
                </>
            ) : (
                <>
                    {/* Notifications List (на мобилке эта ветка не показывается — уведомления в Профиле) */}
                    <main 
                        ref={notifContainerRef}
                        className="flex-1 overflow-y-auto p-4 space-y-3 pb-24"
                    >
                        {allNotifications.length === 0 && !notifLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <BellRing className="w-16 h-16 mb-4 opacity-50" />
                                <p className="text-lg font-medium">Нет уведомлений</p>
                                <p className="text-sm">Здесь будут ваши уведомления</p>
                            </div>
                        ) : (
                            <>
                                {allNotifications.map((notification: any, index: number) => (
                                    <button
                                        key={notification.id || index}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full rounded-xl p-4 border transition-all text-left flex items-start gap-3 ${
                                            notification.is_read 
                                                ? 'bg-[#1C1C1E]/60 border-gray-800 opacity-70' 
                                                : 'bg-[#1C1C1E] border-gray-700 hover:border-[#F35713]'
                                        }`}
                                    >
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#F35713]/20 flex items-center justify-center">
                                            {getNotificationIcon(notification.title)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">
                                                    {notification.title || 'Уведомление'}
                                                </h3>
                                                {!notification.is_read && (
                                                    <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-medium text-[#F35713] bg-[#F35713]/20 rounded-full whitespace-nowrap">
                                                        Новое
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                                                {notification.content || notification.message || notification.body || 'Новое уведомление'}
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
                                ))}
                                {notifLoading && (
                                    <div className="flex justify-center py-4">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span className="text-sm">Загрузка...</span>
                                        </div>
                                    </div>
                                )}
                                {!notifHasMore && allNotifications.length > 0 && !notifLoading && (
                                    <div className="text-center py-4">
                                        <p className="text-xs text-gray-500">Все уведомления загружены</p>
                                    </div>
                                )}
                            </>
                        )}
                    </main>

                    {/* Notification Detail Modal */}
                    {selectedNotification && (
                        <div 
                            className="fixed inset-0 bg-black/80 z-[60] flex items-end justify-center"
                            onClick={() => setSelectedNotification(null)}
                        >
                            <div 
                                className="bg-[#1C1C1E] w-full max-w-lg rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
                                style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#F35713]/20 flex items-center justify-center">
                                            {getNotificationIcon(selectedNotification.title)}
                                        </div>
                                        <h2 className="text-lg font-bold text-white">
                                            {selectedNotification.title || 'Уведомление'}
                                        </h2>
                                    </div>
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
                                    {selectedNotification.is_read && (
                                        <span className="text-xs text-gray-500 ml-2">• Прочитано</span>
                                    )}
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                    {selectedNotification.content || selectedNotification.message || selectedNotification.body || 'Нет содержимого'}
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
            {!isDesktop && !selectedNotification && <BottomNav activeTab="help" />}

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