"use client"

import { useEffect } from "react"
import { Check } from "lucide-react"

interface SuccessModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    message?: string
    duration?: number
}

export function SuccessModal({
    isOpen,
    onClose,
    title = "Успешно!",
    message = "Операция выполнена успешно",
    duration = 2000,
}: SuccessModalProps) {
    useEffect(() => {
        if (!isOpen) return

        const timer = setTimeout(onClose, duration)
        return () => clearTimeout(timer)
    }, [isOpen, onClose, duration])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto p-8 animate-in zoom-in-95 fade-in duration-300 border border-gray-100">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-brand-teal text-white animate-in zoom-in duration-300 delay-100">
                        <Check className="w-8 h-8 stroke-[2.5]" />
                    </div>
                </div>

                <div className="text-center space-y-3">
                    <h3 className="text-xl font-bold text-gray-900 animate-in slide-in-from-bottom-2 duration-400 delay-200">
                        {title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed animate-in slide-in-from-bottom-2 duration-400 delay-300">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    )
}
