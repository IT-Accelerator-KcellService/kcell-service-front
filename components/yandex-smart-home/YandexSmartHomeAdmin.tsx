"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Loader2, Trash2, Home } from "lucide-react"
import api, { getYandexTokens, deleteYandexTokens, refreshYandexTokens } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface YandexToken {
  id: number
  expires_at: string | null
  created_at: string
  updated_at: string
  has_tokens: boolean
}

export function YandexSmartHomeAdmin() {
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingToken, setExistingToken] = useState<YandexToken | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadTokens()
  }, [])

  const loadTokens = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await getYandexTokens()
      setExistingToken(response.data)
    } catch (err: any) {
      if (err.response?.status === 404) {
        setExistingToken(null)
      } else {
        setError(err.response?.data?.message || "Ошибка при загрузке информации о токенах")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existingToken) return

    if (!confirm("Вы уверены, что хотите удалить токены?")) {
      return
    }

    try {
      setIsDeleting(true)
      setError(null)
      await deleteYandexTokens()

      toast({
        title: "Успешно",
        description: "Токены удалены",
        duration: 3000
      })

      setExistingToken(null)
    } catch (err: any) {
      setError(err.response?.data?.message || "Ошибка при удалении токенов")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      const response = await refreshYandexTokens()

      toast({
        title: "Успешно",
        description: "Токены обновлены",
        duration: 3000
      })

      await loadTokens()
    } catch (err: any) {
      setError(err.response?.data?.message || "Ошибка при обновлении токенов")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="w-full">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            Управление Яндекс умным домом
          </CardTitle>
          <CardDescription>
            Управление токенами авторизации для интеграции с Яндекс умным домом. Токены получаются через OAuth авторизацию и хранятся только на сервере.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <div className="text-sm text-blue-800">Загрузка...</div>
              </div>
            </div>
          )}

          {existingToken && !isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Токены настроены</p>
                  <p>Создано: {new Date(existingToken.created_at).toLocaleString("ru-RU")}</p>
                  {existingToken.expires_at && (
                    <p>Истекает: {new Date(existingToken.expires_at).toLocaleString("ru-RU")}</p>
                  )}
                  <p className="text-xs text-blue-600 mt-2">Токены хранятся только на сервере и не отправляются на фронтенд</p>
                </div>
              </div>
            </div>
          )}

          {!existingToken && !isLoading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Токены не настроены</p>
                  <p>Токены должны быть получены через OAuth авторизацию Яндекс и сохраняются автоматически на сервере.</p>
                </div>
              </div>
            </div>
          )}

          {existingToken && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                className="flex-1"
              >
                {isRefreshing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Обновление...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4" />
                    <span>Обновить токены</span>
                  </div>
                )}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="destructive"
                className="flex-1 sm:flex-initial"
              >
                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Удаление...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Удалить</span>
                  </div>
                )}
              </Button>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
            <div className="text-xs text-gray-700">
              <p className="font-medium mb-1">Информация:</p>
              <p>• Endpoint для Яндекс умного дома: <code className="bg-gray-100 px-1 rounded">GET /api/yandex-smart-home/v1.0/user/devices</code></p>
              <p>• Яндекс будет отправлять запросы с токеном в заголовке Authorization</p>
              <p>• Токены получаются через OAuth авторизацию и сохраняются автоматически на сервере</p>
              <p>• Токены хранятся только на сервере и никогда не отправляются на фронтенд</p>
              <p>• При истечении токены автоматически обновляются через refresh_token</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
