"use client"

import React, { useState, useEffect } from "react"
import { ActivityStatistics } from "@/components/ActivityStatistics"
import { useAuthStore } from "@/stores/useAuthStore"
import { useRouter } from "next/navigation"
import Header from "@/app/header/Header"

export default function ActivityStatsPage() {
  const { user, clearAuth } = useAuthStore()
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    if (!user) {
      router.push('/login')
    } else if (user.role === 'executor') {
      // Исполнителю недоступны умный дом и health-уведомления
      router.replace('/executor')
    }
  }, [hydrated, user, router])

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  if (!hydrated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        handleLogout={handleLogout}
        role={user.role || 'Пользователь'}
      />
      <div className="container mx-auto max-w-6xl px-4 pt-4 pb-6">
        <ActivityStatistics />
      </div>
    </div>
  )
}

