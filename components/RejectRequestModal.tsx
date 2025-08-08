"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

interface RejectRequestModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    message?: string
    duration?: number
}

export function RejectRequestModal({
                                           isOpen,
                                           onClose,
                                           title = "Заявка отклонена",
                                           message = "Заявка была успешно отклонена.",
                                           duration = 2000,
                                       }: RejectRequestModalProps) {
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
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 text-white animate-in zoom-in duration-300 delay-100">
                        <X className="w-8 h-8 stroke-[2.5]" />
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