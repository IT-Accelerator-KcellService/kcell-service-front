"use client"

import { useEffect, useRef } from "react"

export type OfficePoint = {
    id: number
    name: string
    city: string
    address: string
    lat: number
    lon: number
}

type Props = {
    offices: OfficePoint[]
    className?: string
}

declare global {
    interface Window {
        L?: any
    }
}

/**
 * Lightweight Leaflet map without react-leaflet to avoid extra deps.
 * Loads Leaflet from CDN at runtime and initializes an interactive map.
 */
export default function OfficeMap({ offices, className }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<any>(null)

    useEffect(() => {
        let cancelled = false

        async function ensureLeaflet() {
            if (typeof window === "undefined") return
            if (!document.getElementById("leaflet-css")) {
                const link = document.createElement("link")
                link.id = "leaflet-css"
                link.rel = "stylesheet"
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                document.head.appendChild(link)
            }
            if (!window.L) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement("script")
                    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                    script.async = true
                    script.onload = () => resolve()
                    script.onerror = () => reject(new Error("Failed to load Leaflet"))
                    document.body.appendChild(script)
                })
            }
        }

        async function init() {
            await ensureLeaflet()
            if (cancelled) return
            const L = window.L
            if (!containerRef.current) return

            // initialize
            mapRef.current = L.map(containerRef.current, {
                center: [48.0, 66.9], // Kazakhstan approx center
                zoom: 4,
                zoomControl: false,
            })

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            }).addTo(mapRef.current)

            const markers: any[] = []
            offices.forEach((o) => {
                const marker = L.circleMarker([o.lat, o.lon], {
                    radius: 7,
                    color: "rgb(126,34,206)",
                    weight: 2,
                    fillColor: "rgb(126,34,206)",
                    fillOpacity: 0.6,
                })
                    .addTo(mapRef.current)
                    .bindPopup(
                        `<div style="font-weight:600">${o.name}</div>
             <div style="font-size:12px;color:#6b7280">${o.city}</div>
             <div style="font-size:12px;color:#6b7280">${o.address}</div>`,
                    )
                markers.push(marker)
            })

            if (markers.length > 0) {
                const group = (window as any).L.featureGroup(markers)
                mapRef.current.fitBounds(group.getBounds().pad(0.2))
            }

            // invalidate size after transition
            setTimeout(() => {
                try {
                    mapRef.current?.invalidateSize?.()
                } catch {}
            }, 250)

            const onResize = () => {
                try {
                    mapRef.current?.invalidateSize?.()
                } catch {}
            }
            window.addEventListener("resize", onResize)
            return () => {
                window.removeEventListener("resize", onResize)
            }
        }

        init()

        return () => {
            cancelled = true
            try {
                mapRef.current?.remove?.()
            } catch {}
        }
    }, [offices])

    return <div ref={containerRef} className={className || "h-full w-full"} />
}
