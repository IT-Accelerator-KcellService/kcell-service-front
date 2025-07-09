"use client";
import { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {BottomNav} from "@/components/BottomNav";

export default function ChatPage() {
    const [messages, setMessages] = useState([
        { from: "bot", text: "Привет! Чем могу помочь?" },
    ]);
    const [inputValue, setInputValue] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

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
            textareaRef.current.style.height = "48px";
        }
    };

    return (
        <div className="flex flex-col h-screen pb-16 bg-gray-50">
            {/* Шапка чата */}
            <div className="sticky top-0 z-10 bg-purple-100 border-b p-3">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <Link href="/" className="p-1 rounded-full hover:bg-purple-200">
                        <ArrowLeft className="w-5 h-5 text-purple-700" />
                    </Link>
                    <h1 className="font-semibold text-purple-700 text-sm">Чат поддержки</h1>
                    <div className="w-6"></div>
                </div>
            </div>

            {/* Область сообщений */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 max-w-2xl mx-auto w-full">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.from === "bot" ? "justify-start" : "justify-end"} items-end gap-2`}
                    >
                        {msg.from === "bot" && (
                            <img
                                src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png"
                                alt="bot"
                                className="w-8 h-8 rounded-full"
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
                <div ref={messagesEndRef} />
            </div>

            {/* Поле ввода */}
            <div className="sticky bottom-16 bg-white border-t p-2 max-w-2xl mx-auto w-full">
                <div className="flex items-end gap-2">
          <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Напишите сообщение..."
              className="flex-1 border rounded-lg p-2 resize-none focus:outline-none text-sm"
              style={{
                  minHeight: "48px",
                  maxHeight: "120px",
              }}
          />
                    <button
                        onClick={handleSend}
                        className="bg-purple-600 text-white rounded-lg p-2 hover:bg-purple-700 mb-1"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <BottomNav activeTab="chat" />
        </div>
    );
}