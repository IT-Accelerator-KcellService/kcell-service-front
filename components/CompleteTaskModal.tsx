import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Camera, Upload, Trash2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CompleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (comment: string, photos: File[]) => Promise<void>;
  task: any;
  isSubmitting: boolean;
}

export const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  task,
  isSubmitting,
}) => {
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const totalPhotos = photos.length + files.length;
    
    if (totalPhotos > 3) {
      alert("Максимальное количество фотографий - 3");
      return;
    }
    
    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);

    // Создаем превью для новых фотографий
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Валидация фотографий
    if (photos.length === 0) {
      alert("Пожалуйста, добавьте хотя бы одну фотографию результата");
      return;
    }
    
    if (photos.length > 3) {
      alert("Максимальное количество фотографий - 3");
      return;
    }
    
    await onComplete(comment, photos);
    // Сброс формы
    setComment("");
    setPhotos([]);
    setPhotoPreviews([]);
  };

  const handleClose = () => {
    setComment("");
    setPhotos([]);
    setPhotoPreviews([]);
    onClose();
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg max-h-[95vh] flex flex-col">
        <Card className="w-full h-full flex flex-col bg-white border border-gray-200 shadow-xl rounded-xl sm:rounded-2xl">
          {/* Header - фиксированный */}
          <CardHeader className="flex-shrink-0 pb-4 px-4 sm:px-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">
                    Завершить задачу
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    Подзаявка #{task.id}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="w-8 h-8 sm:w-10 sm:h-10 p-0 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </Button>
            </div>
          </CardHeader>

          {/* Content - прокручиваемый */}
          <CardContent className="flex-1 overflow-y-auto space-y-4 px-4 sm:px-6 py-4 sm:py-6">

            {/* Комментарий */}
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm font-medium text-gray-700">
                Комментарий о выполнении
              </Label>
              <Textarea
                id="comment"
                placeholder="Опишите, что было выполнено..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px] sm:min-h-[100px] resize-none border border-gray-300 rounded-lg"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right">
                {comment.length}/500
              </p>
            </div>

            {/* Фотографии */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Фотографии результата (обязательно, до 3 шт.)
              </Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {photoPreviews.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo || "/placeholder.svg"}
                      alt={`Photo ${index + 1}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photoPreviews.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-green-500 transition-colors"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          </CardContent>

          {/* Footer - фиксированный с кнопками */}
          <div className="flex-shrink-0 px-4 sm:px-6 pb-4 sm:pb-6 pt-4 border-t border-gray-100">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-10 sm:h-12 bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 h-10 sm:h-12 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || photos.length === 0}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Завершение...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Завершить</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
