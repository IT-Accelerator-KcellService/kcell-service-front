"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, XCircle } from "lucide-react"

interface RejectModalProps {
  isOpen: boolean
  onClose: () => void
  onReject: (reason: string) => Promise<void>
  requestId?: number
  isLoading?: boolean
  error?: string | null
}

// Причины отклонения
const rejectReasons = [
  "Занят",
  "Нет ресурсов",
  "Слишком сложно",
  "Нет времени",
  "Другое"
]

export function RejectModal({ 
  isOpen, 
  onClose, 
  onReject, 
  requestId, 
  isLoading = false, 
  error = null 
}: RejectModalProps) {
  const [rejectReason, setRejectReason] = useState("")
  const [customRejectReason, setCustomRejectReason] = useState("")

  const handleSubmit = async () => {
    const finalReason = rejectReason === "Другое" ? customRejectReason : rejectReason
    
    if (!finalReason.trim()) {
      return
    }

    await onReject(finalReason)
    
    // Сбрасываем состояние после отправки
    setRejectReason("")
    setCustomRejectReason("")
  }

  const handleClose = () => {
    setRejectReason("")
    setCustomRejectReason("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={handleClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Отклонить заявку #{requestId}</CardTitle>
              <CardDescription className="text-sm">
                Выберите причину отклонения заявки. Заявка будет возвращена в очередь назначения.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-sm font-medium text-gray-700">
              Причина отклонения
            </Label>
            <Select value={rejectReason} onValueChange={setRejectReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите причину" />
              </SelectTrigger>
              <SelectContent>
                {rejectReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {rejectReason === "Другое" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason" className="text-sm font-medium text-gray-700">
                Укажите свою причину
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Опишите причину отклонения..."
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !rejectReason || (rejectReason === "Другое" && !customRejectReason.trim())}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                "Отправить"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
