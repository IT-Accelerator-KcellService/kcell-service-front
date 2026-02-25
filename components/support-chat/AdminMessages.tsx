"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getSupportTickets, getSupportTicketMessages, sendSupportMessage, type SupportTicket, type SupportMessage } from "@/lib/api";
import { MessageCircle, Send, Loader2, User, ArrowLeft, Headphones } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CHAT_BG = "#1A1A1A";
const CHAT_ORANGE = "#E85D2B";
const BUBBLE_DARK = "#2C2C2E";
const BORDER_DARK = "rgba(255,255,255,0.08)";

export function AdminMessages() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const loadTickets = useCallback(async () => {
        setLoadingTickets(true);
        try {
            const res = await getSupportTickets();
            const list = res.data?.tickets ?? [];
            setTickets(list);
            if (selectedTicket && !list.some((t) => t.id === selectedTicket.id)) {
                setSelectedTicket(null);
                setMessages([]);
            }
        } catch (e) {
            toast({ title: "Ошибка", description: "Не удалось загрузить чаты", variant: "destructive" });
        } finally {
            setLoadingTickets(false);
        }
    }, [selectedTicket, toast]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    useEffect(() => {
        if (!selectedTicket) {
            setMessages([]);
            return;
        }
        setLoadingMessages(true);
        getSupportTicketMessages(selectedTicket.id)
            .then((res) => setMessages(res.data?.messages ?? []))
            .catch(() => toast({ title: "Ошибка", description: "Не удалось загрузить сообщения", variant: "destructive" }))
            .finally(() => setLoadingMessages(false));
    }, [selectedTicket?.id, toast]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed || !selectedTicket || sending) return;
        setSending(true);
        setInputValue("");
        try {
            const res = await sendSupportMessage(selectedTicket.id, trimmed);
            const newMsg = res.data?.message;
            if (newMsg) setMessages((prev) => [...prev, newMsg]);
        } catch (e) {
            toast({ title: "Ошибка", description: "Не удалось отправить сообщение", variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const clientName = selectedTicket?.client_name ?? selectedTicket?.client?.full_name ?? "Клиент";

    return (
        <div
            className="rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0 md:max-h-[60vh]"
            style={{ background: CHAT_BG }}
        >
            {/* Шапка */}
            <div
                className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
                style={{ borderColor: BORDER_DARK }}
            >
                {selectedTicket ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setSelectedTicket(null)}
                            className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-white hover:opacity-90 transition-opacity"
                            style={{ background: BUBBLE_DARK }}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: `${CHAT_ORANGE}20` }}
                        >
                            <User className="w-5 h-5" style={{ color: CHAT_ORANGE }} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="font-semibold text-white truncate">{clientName}</h2>
                            <p className="text-xs text-gray-500">
                                {selectedTicket.status === "closed" ? "Закрыт" : selectedTicket.status === "in_progress" ? "В работе" : "Открыт"}
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: `${CHAT_ORANGE}20` }}
                        >
                            <MessageCircle className="w-5 h-5" style={{ color: CHAT_ORANGE }} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-white">Сообщения</h2>
                            <p className="text-xs text-gray-500">Чаты с клиентами</p>
                        </div>
                    </>
                )}
            </div>

            {!selectedTicket ? (
                <div className="flex-1 overflow-y-auto p-4">
                    {loadingTickets ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" style={{ color: CHAT_ORANGE }} />
                        </div>
                    ) : tickets.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-12">Нет чатов с клиентами</p>
                    ) : (
                        <ul className="space-y-1">
                            {tickets.map((t) => (
                                <li key={t.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTicket(t)}
                                        className="w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 transition-colors hover:opacity-90"
                                        style={{ background: BUBBLE_DARK }}
                                    >
                                        <div
                                            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                                            style={{ background: `${CHAT_ORANGE}20` }}
                                        >
                                            <User className="h-5 w-5" style={{ color: CHAT_ORANGE }} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-white truncate">
                                                {t.client_name ?? t.client?.full_name ?? `Клиент #${t.id}`}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {t.status === "closed" ? "Закрыт" : t.status === "in_progress" ? "В работе" : "Открыт"} · #{t.id}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[88px] md:pb-2">
                        {loadingMessages ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" style={{ color: CHAT_ORANGE }} />
                            </div>
                        ) : (
                            messages.map((m) => (
                                <div
                                    key={m.id}
                                    className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"} items-start gap-2`}
                                >
                                    {m.sender === "user" && (
                                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 mt-1">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                    <div
                                        className={`px-4 py-3 rounded-2xl max-w-[85%] ${
                                            m.sender === "admin"
                                                ? "rounded-tr-none"
                                                : "rounded-tl-none"
                                        }`}
                                        style={
                                            m.sender === "admin"
                                                ? { background: CHAT_ORANGE, color: "#fff" }
                                                : { background: BUBBLE_DARK, color: "#fff" }
                                        }
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                                        <p
                                            className={`text-xs mt-1 ${m.sender === "admin" ? "text-white/80" : "text-gray-500"}`}
                                        >
                                            {new Date(m.created_at).toLocaleTimeString("ru-RU", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                    {m.sender === "admin" && (
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                                            style={{ background: CHAT_ORANGE }}
                                        >
                                            <Headphones className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        {sending && (
                            <div className="flex justify-end">
                                <div
                                    className="px-4 py-3 rounded-2xl rounded-tr-none text-white text-sm"
                                    style={{ background: `${CHAT_ORANGE}80` }}
                                >
                                    Отправка...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} aria-hidden />
                    </div>
                    {/* Инпут закреплён внизу при скролле (как у клиента) */}
                    <div
                        className="fixed left-0 right-0 bottom-[calc(90px+env(safe-area-inset-bottom,0px))] p-3 border-t flex gap-2 flex-wrap items-end px-4 md:relative md:bottom-auto md:left-auto md:right-auto"
                        style={{ borderColor: BORDER_DARK, background: CHAT_BG }}
                    >
                        <input
                            type="text"
                            placeholder="Напишите сообщение..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                            disabled={sending}
                            className="flex-1 min-w-0 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E85D2B]"
                            style={{ background: BUBBLE_DARK, border: `1px solid ${BORDER_DARK}` }}
                        />
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={!inputValue.trim() || sending}
                            className="rounded-xl p-3 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shrink-0"
                            style={{ background: CHAT_ORANGE }}
                        >
                            {sending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
