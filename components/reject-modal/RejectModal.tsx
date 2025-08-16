"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

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
  "Не моя категория",
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Отклонить заявку #{requestId}</DialogTitle>
          <DialogDescription>
            Выберите причину отклонения заявки. Заявка будет возвращена в очередь назначения.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reject-reason">Причина отклонения</Label>
            <Select value={rejectReason} onValueChange={setRejectReason}>
              <SelectTrigger>
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
            <div className="grid gap-2">
              <Label htmlFor="custom-reason">Укажите свою причину</Label>
              <Textarea
                id="custom-reason"
                placeholder="Опишите причину отклонения..."
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded-md">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !rejectReason || (rejectReason === "Другое" && !customRejectReason.trim())}
            className="bg-red-600 hover:bg-red-700"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
