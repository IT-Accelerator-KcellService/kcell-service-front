'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function MapView({ lat, lon, accuracy }: {
    lat: number
    lon: number
    accuracy: number
}) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<L.Map | null>(null)

    useEffect(() => {
        if (mapRef.current && !mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView([lat, lon], 17)

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(mapInstance.current)

            L.marker([lat, lon]).addTo(mapInstance.current)
                .bindPopup(`Местоположение заявки<br>±${accuracy} м`)
                .openPopup()

            L.circle([lat, lon], {
                radius: accuracy,
                color: 'blue',
                fillOpacity: 0.2,
            }).addTo(mapInstance.current)
        }

        return () => {
            mapInstance.current?.remove()
            mapInstance.current = null
        }
    }, [lat, lon, accuracy])

    return <div ref={mapRef} className="w-full h-full rounded-lg" />
}