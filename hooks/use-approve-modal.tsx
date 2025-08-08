"use client"

import { useState, useCallback } from "react"

interface AcceptModalOptions {
    duration?: number
    title?: string
    message?: string
}

export function useAcceptRequestModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [config, setConfig] = useState<AcceptModalOptions>({
        title: "Заявка принята!",
        message: "Заявка успешно одобрена и обработана.",
        duration: 2000,
    })

    const showAccept = useCallback((options?: AcceptModalOptions) => {
        if (options) {
            setConfig((prev) => ({ ...prev, ...options }))
        }
        setIsOpen(true)
    }, [])

    const hideAccept = useCallback(() => setIsOpen(false), [])

    return {
        isOpen,
        showAccept,
        hideAccept,
        title: config.title,
        message: config.message,
        duration: config.duration,
    }
}