import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Camera, MapPin, Plus, Trash2, ChevronUp, ChevronDown, Loader2, Calendar as CalendarLucid } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "@/lib/api";

interface ServiceCategory {
  id: number;
  name: string;
}

interface SubRequest {
  title: string;
  description: string;
  category_id: number;
  complexity?: 'simple' | 'medium' | 'complex';
  sla?: string;
}

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'client' | 'admin-worker';
  categories: ServiceCategory[];
  onSubmit: (formData: FormData) => Promise<void>;
  isSubmitting: boolean;
  formErrors: string | null;
  clientLocation?: string;
  translateType?: (type: string) => string;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  userRole,
  categories,
  onSubmit,
  isSubmitting,
  formErrors,
  clientLocation = "",
  translateType = (type) => type,
}) => {
  const [requestType, setRequestType] = useState("normal");
  const [location, setLocation] = useState(clientLocation);
  const [locationDetails, setLocationDetails] = useState("");
  const [plannedDate, setPlannedDate] = useState<string>("");
  const [date, setDate] = useState<Date>();
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [subRequests, setSubRequests] = useState<SubRequest[]>([
    { title: "", description: "", category_id: 0 }
  ]);
  const [expandedSubRequests, setExpandedSubRequests] = useState<Set<number>>(new Set([0]));
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Сброс формы при закрытии
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Обновление локации при изменении clientLocation
  useEffect(() => {
    if (clientLocation) {
      setLocation(clientLocation);
    }
  }, [clientLocation]);

  const resetForm = () => {
    setRequestType("normal");
    setLocation(clientLocation);
    setLocationDetails("");
    setPlannedDate("");
    setDate(undefined);
    setPhotos([]);
    setPhotoPreviews([]);
    setSubRequests([{ title: "", description: "", category_id: 0 }]);
    setExpandedSubRequests(new Set([0]));
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (photos.length + validFiles.length > 3) {
      alert("Максимум 3 фотографии");
      return;
    }

    const newPhotos = [...photos, ...validFiles];
    setPhotos(newPhotos);

    // Создаем превью
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const addSubRequest = () => {
    const newIndex = subRequests.length;
    setSubRequests([...subRequests, { title: "", description: "", category_id: 0 }]);
    setExpandedSubRequests(prev => new Set([...prev, newIndex]));
  };

  const removeSubRequest = (index: number) => {
    if (subRequests.length > 1) {
      setSubRequests(subRequests.filter((_, i) => i !== index));
      setExpandedSubRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const updateSubRequest = (index: number, field: keyof SubRequest, value: any) => {
    const newSubRequests = [...subRequests];
    newSubRequests[index] = { ...newSubRequests[index], [field]: value };
    setSubRequests(newSubRequests);
  };

  const toggleSubRequestExpansion = (index: number) => {
    setExpandedSubRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocation(
            `Широта: ${latitude.toFixed(5)}, Долгота: ${longitude.toFixed(5)} (±${Math.round(accuracy)} м)`
          );
        },
        (error) => {
          console.error("Ошибка геолокации:", error);
          setLocation("Не удалось определить местоположение");
        }
      );
    } else {
      setLocation("Геолокация не поддерживается вашим браузером");
    }
  };

  const handleSubmit = async () => {
    // Проверяем, что все под заявки заполнены
    const validSubRequests = subRequests.filter(sub =>
      sub.title.trim() && sub.description.trim() && sub.category_id > 0
    );

    if (
      !requestType ||
      !location.trim() ||
      !locationDetails.trim() ||
      photos.length === 0 ||
      validSubRequests.length === 0
    ) {
      return;
    }

    const formData = new FormData();

    // Поля группы заявок
    formData.append('request_type', requestType);
    formData.append('location', location);
    formData.append('location_detail', locationDetails);
    formData.append('status', userRole === 'client' ? 'in_progress' : 'awaiting_assignment');
    if (plannedDate) formData.append('planned_date', plannedDate);

    // Под заявки с их SLA и сложностью (только для admin-worker)
    const subRequestsData = validSubRequests.map(sub => ({
      title: sub.title,
      description: sub.description,
      category_id: sub.category_id,
      complexity: userRole === 'admin-worker' ? (sub.complexity || 'simple') : undefined,
      sla: userRole === 'admin-worker' ? (sub.sla || '1h') : undefined,
      status: userRole === 'client' ? 'in_progress' : 'awaiting_assignment'
    }));

    formData.append('sub_requests', JSON.stringify(subRequestsData));

    // Фото
    photos.forEach(photo => formData.append('photos', photo));

    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
      onClick={onClose}
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>Создать {translateType(requestType).toLowerCase()} заявку</CardTitle>
          <CardDescription>Заполните форму для подачи новой заявки</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-16">
          <div>
            <Label>Тип заявки</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип заявки" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Обычная</SelectItem>
                <SelectItem value="urgent">Экстренная</SelectItem>
                {userRole === 'admin-worker' && (
                  <SelectItem value="planned">Плановая</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {requestType === "planned" && userRole === 'admin-worker' && (
              <div>
                <Label>Планируемая дата</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => {
                          setDate(newDate);
                          if (newDate) {
                            setPlannedDate(format(newDate, 'yyyy-MM-dd'));
                          }
                        }}
                        initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
          )}

          <div>
            <Label>Локация</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                className={`flex-1 min-w-[200px] ${userRole === 'client' ? "bg-gray-100 cursor-not-allowed" : ""}`}
                placeholder={userRole === 'client' ? "Определение вашего местоположения..." : "Введите расположение"}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                readOnly={userRole === 'client'}
              />
              {userRole === 'admin-worker' && (
                <Button
                  variant="outline"
                  className="whitespace-nowrap"
                  onClick={handleGetLocation}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Определить местоположение
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>Расположение в офисе</Label>
            <Input
              placeholder="Например: 3 этаж, кабинет 305"
              value={locationDetails}
              onChange={(e) => setLocationDetails(e.target.value)}
            />
          </div>

          <div>
            <Label>Фотографии (до 3 шт.)</Label>
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
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photoPreviews.length < 3 && (
                <button
                  type="button"
                  onClick={handleButtonClick}
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-violet-500 transition-colors"
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Camera className="w-6 h-6 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Под заявки */}
          <div>
            <Label className="text-lg font-semibold">Под заявки</Label>
            <p className="text-sm text-gray-600 mb-4">
              Добавьте одну или несколько под заявок с их параметрами
            </p>
            
            <div className="space-y-4">
              {subRequests.map((subRequest, index) => (
                <Card key={index} className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Под заявка #{index + 1}</h4>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSubRequestExpansion(index)}
                          className="p-1"
                        >
                          {expandedSubRequests.has(index) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                        {subRequests.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSubRequest(index)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className={`space-y-4 ${expandedSubRequests.has(index) ? 'block' : 'hidden'}`}>
                    <div>
                      <Label htmlFor={`subRequestTitle-${index}`}>Название под заявки</Label>
                      <Input
                        id={`subRequestTitle-${index}`}
                        placeholder="Краткое название задачи"
                        value={subRequest.title}
                        onChange={(e) => updateSubRequest(index, 'title', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`subRequestCategory-${index}`}>Категория услуги</Label>
                      <Select
                        value={categories.find(c => c.id === subRequest.category_id)?.name || ''}
                        onValueChange={(value) => {
                          const category = categories.find(c => c.name === value);
                          updateSubRequest(index, 'category_id', category?.id || 0);
                        }}
                      >
                        <SelectTrigger id={`subRequestCategory-${index}`}>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`subRequestDescription-${index}`}>Описание проблемы</Label>
                      <Textarea
                        id={`subRequestDescription-${index}`}
                        placeholder="Опишите проблему подробно..."
                        className="min-h-[100px]"
                        value={subRequest.description}
                        onChange={(e) => updateSubRequest(index, 'description', e.target.value)}
                      />
                    </div>

                    {/* Дополнительные поля только для admin-worker */}
                    {userRole === 'admin-worker' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`subRequestComplexity-${index}`}>Сложность</Label>
                          <Select
                            value={subRequest.complexity}
                            onValueChange={(value: 'simple' | 'medium' | 'complex') => 
                              updateSubRequest(index, 'complexity', value)
                            }
                          >
                            <SelectTrigger id={`subRequestComplexity-${index}`}>
                              <SelectValue placeholder="Выберите сложность" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simple">Простая</SelectItem>
                              <SelectItem value="medium">Средняя</SelectItem>
                              <SelectItem value="complex">Сложная</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`subRequestSLA-${index}`}>SLA</Label>
                          <Select
                            value={subRequest.sla}
                            onValueChange={(value: string) => updateSubRequest(index, 'sla', value)}
                          >
                            <SelectTrigger id={`subRequestSLA-${index}`}>
                              <SelectValue placeholder="Выберите SLA" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1h">1 час</SelectItem>
                              <SelectItem value="4h">4 часа</SelectItem>
                              <SelectItem value="8h">8 часов</SelectItem>
                              <SelectItem value="1d">1 день</SelectItem>
                              <SelectItem value="3d">3 дня</SelectItem>
                              <SelectItem value="1w">1 неделя</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addSubRequest}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить под заявку
              </Button>
            </div>
          </div>

          {formErrors && <p className="text-sm text-red-500">{formErrors}</p>}

          <div className="flex space-x-4">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-violet-600 hover:bg-violet-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {userRole === 'client' ? 'Отправка...' : 'Создание...'}
                </>
              ) : (
                userRole === 'client' ? 'Отправить заявку' : 'Создать заявку'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="flex-1"
            >
              Отмена
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
