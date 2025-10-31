"use client"

import { useState, useCallback } from "react"

interface RejectModalOptions {
    duration?: number
    title?: string
    message?: string
}

export function useRejectRequestModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [config, setConfig] = useState<RejectModalOptions>({
        title: "Заявка отклонена",
        message: "Заявка была успешно отклонена.",
        duration: 2000,
    })

    const showReject = useCallback((options?: RejectModalOptions) => {
        if (options) {
            setConfig((prev) => ({ ...prev, ...options }))
        }
        setIsOpen(true)
    }, [])

    const hideReject = useCallback(() => setIsOpen(false), [])

    return {
        isOpen,
        showReject,
        hideReject,
        title: config.title,
        message: config.message,
        duration: config.duration,
    }
}