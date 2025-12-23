"use client"

import React, { useState, useEffect } from "react"
import { ActivityTracker } from "@/components/ActivityTracker"
import { useAuthStore } from "@/stores/useAuthStore"
import { useRouter } from "next/navigation"

export default function ActivityTrackerPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true) // сработает только на клиенте
  }, [])

  useEffect(() => {
    if (!hydrated) return // ждём восстановления данных из localStorage

    if (!user) {
      router.push('/login')
      return
    }

    // Трекер активности доступен только для исполнителей
    if (user.role !== 'executor') {
      router.push('/')
    }
  }, [hydrated, user, router])

  if (!hydrated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl">
        <ActivityTracker />
      </div>
    </div>
  )
}

