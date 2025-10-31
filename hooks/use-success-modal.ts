"use client"

import { useState, useCallback } from "react"

interface SuccessOptions {
    duration?: number
    title?: string
    message?: string
}

export function useSuccessModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [config, setConfig] = useState<SuccessOptions>({
        title: "Успешно!",
        message: "Операция выполнена успешно",
        duration: 2000,
    })

    const showSuccess = useCallback((options?: SuccessOptions) => {
        if (options) {
            setConfig((prev) => ({ ...prev, ...options }))
        }
        setIsOpen(true)
    }, [])

    const hideSuccess = useCallback(() => setIsOpen(false), [])

    return {
        isOpen,
        showSuccess,
        hideSuccess,
        ...config,
    }
}
