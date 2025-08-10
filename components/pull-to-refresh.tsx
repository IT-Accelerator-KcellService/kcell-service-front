"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type PullToRefreshProps = {
    children?: React.ReactNode
    onRefresh?: () => Promise<void>
    threshold?: number
    maxPull?: number
    color?: string
}

export default function PullToRefresh(props: PullToRefreshProps) {
    const {
        children,
        onRefresh = async () => {
            await new Promise((r) => setTimeout(r, 1000))
        },
        threshold = 96,
        maxPull = 180,
        color = "#7B28CC",
    } = props

    const containerRef = React.useRef<HTMLDivElement | null>(null)
    const startYRef = React.useRef<number>(0)
    const pullingRef = React.useRef<boolean>(false)
    const [pull, setPull] = React.useState(0)
    const [refreshing, setRefreshing] = React.useState(false)
    const [animatingBack, setAnimatingBack] = React.useState(false)

    // Rubber-band resistance curve to feel natural
    const rubber = React.useCallback((x: number, max: number) => {
        const resistance = 0.6
        const result = (x * resistance * max) / (x * resistance + max)
        return Math.max(0, Math.min(result, max))
    }, [])

    const progress = Math.max(0, Math.min(1, pull / threshold))

    const reset = React.useCallback(() => {
        setAnimatingBack(true)
        setPull(0)
        const t = setTimeout(() => {
            setAnimatingBack(false)
        }, 220)
        return () => clearTimeout(t)
    }, [])

    const doRefresh = React.useCallback(async () => {
        try {
            setRefreshing(true)
            // Keep content offset at threshold while loading
            setPull(threshold)
            await onRefresh()
        } finally {
            setRefreshing(false)
            reset()
        }
    }, [onRefresh, reset, threshold])

    const onPointerDown = React.useCallback(
        (e: PointerEvent) => {
            if (refreshing) return
            // Only primary pointer and only when scrolled to top
            const target = containerRef.current
            if (!target) return
            const isPrimary = (e as PointerEvent).isPrimary !== false && e.button === 0
            if (!isPrimary) return
            const scroller = target
            const atTop = scroller.scrollTop <= 0
            if (!atTop) return
            pullingRef.current = true
            startYRef.current = e.clientY
        },
        [refreshing],
    )

    const onPointerMove = React.useCallback(
        (e: PointerEvent) => {
            if (!pullingRef.current || refreshing) return
            const dy = e.clientY - startYRef.current
            if (dy > 0) {
                // Prevent native scroll/bounce while pulling
                e.preventDefault?.()
                const v = rubber(dy, maxPull)
                setPull(v)
            } else {
                // If user moves up, cancel
                setPull(0)
            }
        },
        [maxPull, refreshing, rubber],
    )

    const onPointerUp = React.useCallback(
        (_e: PointerEvent) => {
            if (!pullingRef.current || refreshing) return
            pullingRef.current = false
            if (pull >= threshold) {
                void doRefresh()
            } else {
                reset()
            }
        },
        [doRefresh, pull, refreshing, reset, threshold],
    )

    React.useEffect(() => {
        const el = containerRef.current
        if (!el) return

        // We attach pointer events to the scrollable container
        const down = (e: Event) => onPointerDown(e as PointerEvent)
        const move = (e: Event) => onPointerMove(e as PointerEvent)
        const up = (e: Event) => onPointerUp(e as PointerEvent)

        // Use non-passive to allow preventDefault on move
        el.addEventListener("pointerdown", down, { passive: true })
        el.addEventListener("pointermove", move as any, { passive: false })
        el.addEventListener("pointerup", up, { passive: true })
        el.addEventListener("pointercancel", up, { passive: true })
        el.addEventListener("pointerleave", up, { passive: true })

        // Also prevent touch scrolling while pulling
        const touchmove = (e: TouchEvent) => {
            if (pullingRef.current && !refreshing) {
                e.preventDefault()
            }
        }
        el.addEventListener("touchmove", touchmove, { passive: false })

        return () => {
            el.removeEventListener("pointerdown", down as any)
            el.removeEventListener("pointermove", move as any)
            el.removeEventListener("pointerup", up as any)
            el.removeEventListener("pointercancel", up as any)
            el.removeEventListener("pointerleave", up as any)
            el.removeEventListener("touchmove", touchmove as any)
        }
    }, [onPointerDown, onPointerMove, onPointerUp, refreshing])

    // Visuals
    const angle = Math.round(progress * 360)
    const ringSize = 48
    const ringThickness = 5
    const contentTranslateY = refreshing ? threshold : pull

    return (
        <div
            ref={containerRef}
            className="relative h-[calc(100vh_-_theme(spacing.14))] sm:h-[calc(100vh_-_theme(spacing.16))] overflow-y-auto overscroll-contain"
            // Role is just a scrollable region for content
            role="region"
            aria-label="Лента"
            // Prevent default iOS rubber band on the container
            style={{ WebkitOverflowScrolling: "auto" as any }}
        >
            {/* Pull overlay */}
            <div
                className={cn("pointer-events-none sticky top-0 z-10 flex items-end justify-center bg-transparent")}
                style={{
                    height: `${contentTranslateY}px`,
                    transition: animatingBack ? "height 220ms ease" : undefined,
                }}
                aria-hidden="true"
            >
                <div className="pb-2">
                    <ProgressRing
                        size={ringSize}
                        thickness={ringThickness}
                        color={color}
                        angle={angle}
                        spinning={refreshing}
                        progress={progress}
                    />
                </div>
            </div>

            {/* Content moved by pull distance */}
            <div
                style={{
                    transform: `translateY(${contentTranslateY}px)`,
                    transition: animatingBack ? "transform 220ms ease" : undefined,
                }}
            >
                {children}
            </div>
        </div>
    )
}

function ProgressRing({
                          size = 48,
                          thickness = 5,
                          color = "#7B28CC",
                          angle = 0,
                          spinning = false,
                          progress = 0,
                      }: {
    size?: number
    thickness?: number
    color?: string
    angle?: number
    spinning?: boolean
    progress?: number
}) {
    // A conic-gradient ring that fills with progress;
    // While refreshing, we spin it continuously and show a full ring.
    const bg = spinning
        ? `conic-gradient(${color} 0deg, ${color} 270deg, #e5e7eb 270deg 360deg)`
        : `conic-gradient(${color} ${angle}deg, #e5e7eb 0deg)`
    const rotate = spinning ? "animate-spin" : ""

    // Kcell mark inside: white circle with a bold "K" tinted with brand color
    const scale = 0.9 + progress * 0.15
    const rotateDeg = spinning ? 0 : Math.round(progress * 20) // subtle tilt on pull

    return (
        <div
            className={cn("relative", rotate)}
            style={{
                width: size,
                height: size,
                // Rotate wrapper to animate conic gradient when spinning
            }}
            aria-label={spinning ? "Обновление" : "Прогресс обновления"}
            role={spinning ? "status" : "progressbar"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
        >
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background: bg,
                    transition: spinning ? "none" : "background 60ms linear",
                }}
            />
            <div
                className="absolute rounded-full bg-white shadow-sm"
                style={{
                    top: thickness,
                    left: thickness,
                    right: thickness,
                    bottom: thickness,
                }}
            />
            <div
                className="absolute inset-0 grid place-items-center"
                style={{
                    transform: `scale(${scale}) rotate(${rotateDeg}deg)`,
                    transition: "transform 120ms ease",
                }}
            >
                <KcellMark size={size - thickness * 2 - 6} color={color} />
            </div>
        </div>
    )
}

function KcellMark({ size = 40, color = "#7B28CC" }: { size?: number; color?: string }) {
    // A simple, brand-colored circle with a bold K inside (no inline SVGs).
    return (
        <div
            className="rounded-full grid place-items-center"
            style={{
                width: size,
                height: size,
                backgroundColor: color,
                color: "white",
                fontWeight: 800,
                letterSpacing: "0.02em",
                fontSize: Math.max(14, Math.round(size * 0.48)),
                boxShadow: "0 6px 16px rgba(123,40,204,0.25)",
            }}
            aria-hidden="true"
        >
            {"K"}
        </div>
    )
}
