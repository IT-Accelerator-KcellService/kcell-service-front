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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Завершить задачу</CardTitle>
                <CardDescription>
                  Подзаявка #{task.id}
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
          {/* Информация о задаче */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-900">{task.title}</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {task.category?.name || "Без категории"}
              </Badge>
              {task.complexity && (
                <Badge variant="outline" className="text-xs">
                  {task.complexity === 'simple' ? 'Простая' : 
                   task.complexity === 'medium' ? 'Средняя' : 'Сложная'}
                </Badge>
              )}
            </div>
          </div>

          {/* Комментарий */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Комментарий о выполнении
            </Label>
            <Textarea
              id="comment"
              placeholder="Опишите, что было выполнено..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 text-right">
              {comment.length}/500
            </p>
          </div>

          {/* Фотографии */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Фотографии результата (обязательно, до 3 шт.)
            </Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {photoPreviews.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo || "/placeholder.svg"}
                    alt={`Photo ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photoPreviews.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-violet-500 transition-colors"
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Camera className="w-6 h-6 text-gray-400" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Добавьте фотографии, подтверждающие выполнение работы (минимум 1, максимум 3)
            </p>
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
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isSubmitting || photos.length === 0}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Завершение...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Завершить
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
