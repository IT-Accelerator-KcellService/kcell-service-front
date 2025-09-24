import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, AlertTriangle } from "lucide-react";
import { getSubRequestDisplayId } from "@/lib/subRequestUtils";

interface RejectSubRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
  request: any;
  isSubmitting: boolean;
  error: string | null;
}

const REJECTION_REASONS = [
  { value: "Технические проблемы", label: "Технические проблемы" },
  { value: "Отсутствие необходимого оборудования", label: "Отсутствие необходимого оборудования" },
  { value: "Отсутствие материалов", label: "Отсутствие материалов" },
  { value: "Проблемы безопасности", label: "Проблемы безопасности" },
  { value: "Нет доступа к месту работы", label: "Нет доступа к месту работы" },
  { value: "Неблагоприятные погодные условия", label: "Неблагоприятные погодные условия" },
  { value: "Недостаточно времени", label: "Недостаточно времени" },
  { value: "Слишком высокая сложность", label: "Слишком высокая сложность" },
  { value: "other", label: "Другая причина" }
];

export const RejectSubRequestModal: React.FC<RejectSubRequestModalProps> = ({
  isOpen,
  onClose,
  onReject,
  request,
  isSubmitting,
  error,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  const handleSubmit = async () => {
    if (!selectedReason) return;
    
    const reason = selectedReason === "other" ? customReason : selectedReason;
    if (selectedReason === "other" && !customReason.trim()) return;
    
    await onReject(reason);
  };

  const handleClose = () => {
    setSelectedReason("");
    setCustomReason("");
    onClose();
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Отклонить подзаявку</CardTitle>
                <CardDescription>
                  Подзаявка № {getSubRequestDisplayId(request, request.request_group_id)}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Информация о подзаявке */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-900">{request.title}</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Категория:</span>
              <span className="text-xs font-medium text-gray-700">
                {request.category?.name || "Не указана"}
              </span>
            </div>
          </div>

          {/* Выбор причины */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Причина отклонения *
            </Label>
            <Select
              value={selectedReason}
              onValueChange={setSelectedReason}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Выберите причину отклонения" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Кастомная причина */}
          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="customReason" className="text-sm font-medium">
                Укажите причину *
              </Label>
              <Textarea
                id="customReason"
                placeholder="Опишите причину отклонения..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right">
                {customReason.length}/500
              </p>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Предупреждение */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Внимание!</p>
                <p>После отклонения подзаявка будет возвращена в очередь назначения и может быть назначена другому исполнителю.</p>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={isSubmitting || !selectedReason || (selectedReason === "other" && !customReason.trim())}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Отклонение...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Отклонить
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
