"use client"

import type React from "react"

import { useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
    open: boolean
    onClose: () => void
    title?: string
    description?: string
    footer?: React.ReactNode
    children: React.ReactNode
}

export function CardModal({ open, onClose, title, description, footer, children }: Props) {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        document.addEventListener("keydown", onKey)
        document.body.style.overflow = "hidden"
        return () => {
            document.removeEventListener("keydown", onKey)
            document.body.style.overflow = ""
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div
            className={cn("fixed inset-0 z-50", "flex items-end sm:items-center justify-center")}
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0" onClick={onClose} />
            <div
                className={cn(
                    "relative z-10 w-full max-w-screen-sm mx-auto",
                    "rounded-t-2xl sm:rounded-2xl bg-white shadow-xl",
                    "animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200",
                )}
            >
                <div className="absolute right-3 top-3">
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-full grid place-items-center hover:bg-neutral-100"
                        aria-label="Закрыть модальное окно"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                {(title || description) && (
                    <div className="px-4 pt-4 pb-2">
                        {title && <h3 className="text-base font-semibold">{title}</h3>}
                        {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
                    </div>
                )}
                <div className="px-4 pb-4">{children}</div>
                {footer && <div className="px-4 pb-4">{footer}</div>}
            </div>
        </div>
    )
}
