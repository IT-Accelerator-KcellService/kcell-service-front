'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with Next.js/Webpack
const markerIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

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

            L.marker([lat, lon], { icon: markerIcon }).addTo(mapInstance.current)
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