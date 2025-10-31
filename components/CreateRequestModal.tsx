import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Camera, MapPin, Plus, Trash2, ChevronUp, ChevronDown, Loader2, Calendar as CalendarLucid, CheckCircle, AlertTriangle, ArrowLeft, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ImportExcelModal } from "./ImportExcelModal";
import { findNearestOffice, getLocationByIP } from "@/lib/utils";
import { getBlocksForOffice, getLocationsForBlock, getRoomsForLocation, hasLocationsForBlock, hasRoomsForLocation } from "@/lib/office-locations";

interface ServiceCategory {
  id: number;
  name: string;
  subcategories?: ServiceSubcategory[];
}

interface ServiceSubcategory {
  id: number;
  name: string;
  category_id: number;
}

interface Office {
  id: number;
  name: string;
  city: string;
  address: string;
  lat: number | null;
  lon: number | null;
}

interface Executor {
  id: number;
  executor_id: number;
  user: {
    id: number;
    full_name: string;
    phone?: string;
  };
  specialty: string;
  workload: number;
}

interface SubRequestExecutor {
  id: number;
  role: 'executor' | 'leader';
}

interface SubRequest {
  title: string;
  description: string;
  category_id: number;
  subcategory_id?: number; // Добавляем поддержку подкатегорий
  complexity?: 'simple' | 'medium' | 'complex';
  sla?: string;
  executors?: SubRequestExecutor[]; // Массив с ID и ролями исполнителей
}

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'client' | 'admin-worker' | 'department-head' | 'executor' | 'manager';
  categories: ServiceCategory[];
  onSubmit: (formData: FormData) => Promise<void>;
  isSubmitting: boolean;
  formErrors: string | null;
  clientLocation?: string;
  translateType?: (type: string) => string;
  executors?: Executor[]; // Список исполнителей для department-head
  userServiceCategoryId?: number; // ID категории пользователя для department-head
  createMode?: 'create' | 'createAndComplete'; // Режим создания для executor
  onModeChange?: (mode: 'create' | 'createAndComplete') => void; // Функция изменения режима
  offices: Office[]; // Список офисов для всех ролей (обязательное поле)
  isFullScreen?: boolean; // Полноэкранный режим для мобильных устройств
  onCreateRecurringTask?: () => void; // Функция для создания повторяющейся задачи
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
  executors = [],
  userServiceCategoryId,
  createMode = 'create',
  onModeChange,
  offices = [],
  isFullScreen = false,
  onCreateRecurringTask,
}) => {
  const [requestType, setRequestType] = useState("normal");
  const [locationDetails, setLocationDetails] = useState("");
  const [plannedDate, setPlannedDate] = useState<string>("");
  const [date, setDate] = useState<Date>();
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [subRequests, setSubRequests] = useState<SubRequest[]>([
    { title: "", description: "", category_id: 0, subcategory_id: 0, executors: [] }
  ]);
  const [validationErrors, setValidationErrors] = useState<Set<number>>(new Set());
  const [basicFieldErrors, setBasicFieldErrors] = useState<Set<string>>(new Set());
  const [isRecurringTask, setIsRecurringTask] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [afterPhotoPreviews, setAfterPhotoPreviews] = useState<string[]>([]);
  const [completionComment, setCompletionComment] = useState("");
  const [completionDate, setCompletionDate] = useState<Date>(new Date());
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);

  // Состояния для нового функционала расположения в офисе
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [customLocation, setCustomLocation] = useState<string>("");
  const [customRoom, setCustomRoom] = useState<string>("");

  // Состояния для повторяющихся задач
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<Date>(new Date());

  // Отладочная информация


  // Состояние для геолокации
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Сброс формы при закрытии
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);


  // Сброс даты при изменении типа заявки
  useEffect(() => {
    if (requestType !== "planned") {
      setDate(undefined);
      setPlannedDate("");
    }
  }, [requestType]);

  // Сброс блока, местонахождения и помещения при изменении офиса
  useEffect(() => {
    setSelectedBlock("");
    setSelectedLocation("");
    setSelectedRoom("");
    setCustomLocation("");
    setCustomRoom("");
  }, [selectedOfficeId]);

  // Сброс местонахождения и помещения при изменении блока
  useEffect(() => {
    setSelectedLocation("");
    setSelectedRoom("");
    setCustomLocation("");
    setCustomRoom("");
    
    // Если для блока нет местонахождений в справочнике, автоматически устанавливаем пустую строку
    if (selectedBlock && selectedOfficeId) {
      const currentOffice = offices.find(o => o.id === selectedOfficeId);
      if (currentOffice) {
        const hasLocations = hasLocationsForBlock(currentOffice.name, selectedBlock);
        if (!hasLocations) {
          setSelectedLocation(""); // Устанавливаем пустую строку для перехода к помещению
        }
      }
    }
  }, [selectedBlock, selectedOfficeId, offices]);

  // Сброс помещения при изменении местонахождения
  useEffect(() => {
    setSelectedRoom("");
    setCustomRoom("");
  }, [selectedLocation]);

  const resetForm = () => {
    setRequestType("normal");
    setLocationDetails("");
    setPlannedDate("");
    setDate(undefined);
    setPhotos([]);
    setPhotoPreviews([]);
    setAfterPhotos([]);
    setAfterPhotoPreviews([]);
    setCompletionComment("");
    setCompletionDate(new Date());
    setSelectedOfficeId(null);
    setSelectedBlock("");
    setSelectedLocation("");
    setSelectedRoom("");
    setCustomLocation("");
    setCustomRoom("");
    setSubRequests([{ title: "", description: "", category_id: 0, subcategory_id: 0, executors: [] }]);
    setValidationErrors(new Set());
    setBasicFieldErrors(new Set());
    setHasAttemptedSubmit(false);
    setIsRecurringTask(false);
    setRecurrenceType('weekly');
    setRecurrenceInterval(1);
    setRecurrenceStartDate(new Date());
    setIsGettingLocation(false);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));

    if (photos.length + validFiles.length > 3) {
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

  const handleAfterPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));

    if (afterPhotos.length + validFiles.length > 3) {
      return;
    }

    const newPhotos = [...afterPhotos, ...validFiles];
    setAfterPhotos(newPhotos);

    // Создаем превью
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAfterPhotoPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAfterPhoto = (index: number) => {
    setAfterPhotos(afterPhotos.filter((_, i) => i !== index));
    setAfterPhotoPreviews(afterPhotoPreviews.filter((_, i) => i !== index));
  };

  const addSubRequest = () => {
    // Функция отключена - теперь только один подзаявка
    return;
  };

  const removeSubRequest = (index: number) => {
    // Функция отключена - нельзя удалить единственный подзаявка
    return;
  };

  const updateSubRequest = (index: number, field: keyof SubRequest, value: any) => {
    const newSubRequests = [...subRequests];
    newSubRequests[index] = { ...newSubRequests[index], [field]: value };
    setSubRequests(newSubRequests);
  };

  const updateSubRequestExecutors = (index: number, executors: SubRequestExecutor[]) => {
    const newSubRequests = [...subRequests];
    newSubRequests[index] = { ...newSubRequests[index], executors };
    setSubRequests(newSubRequests);
  };

  // Обновление ошибок валидации при изменении подзаявок
  useEffect(() => {
    if (!hasAttemptedSubmit) {
      setValidationErrors(new Set());
      return;
    }

    if (userRole === 'admin-worker' || userRole === 'department-head') {
      const newValidationErrors = new Set<number>();
      subRequests.forEach((subRequest, index) => {
        if (subRequest.title.trim() && subRequest.description.trim() && subRequest.category_id > 0) {
          // Проверяем сложность и время выполнения
          if (!subRequest.complexity || !subRequest.sla) {
            newValidationErrors.add(index);
          }

          // Для department-head проверяем наличие лидера в исполнителях
          if (userRole === 'department-head' && userServiceCategoryId &&
              subRequest.category_id === userServiceCategoryId &&
              subRequest.executors && subRequest.executors.length > 0) {
            const hasLeader = subRequest.executors.some(e => e.role === 'leader');
            if (!hasLeader) {
              newValidationErrors.add(index);
            }
          }
        }
      });
      setValidationErrors(newValidationErrors);
    }
  }, [subRequests, userRole, hasAttemptedSubmit, userServiceCategoryId]);

  // Обновление ошибок основных полей
  useEffect(() => {
    if (!hasAttemptedSubmit) {
      setBasicFieldErrors(new Set());
      return;
    }

    const newBasicFieldErrors = new Set<string>();

    if (!requestType) {
      newBasicFieldErrors.add('requestType');
    }

    // Валидация офиса для всех ролей
    if (!selectedOfficeId) {
      newBasicFieldErrors.add('office');
    }

    // Валидация блока, местонахождения и помещения
    if (!selectedBlock) {
      newBasicFieldErrors.add('block');
    }

    // Проверка местонахождения
    if (selectedBlock && selectedOfficeId) {
      const currentOffice = offices.find(o => o.id === selectedOfficeId);
      if (currentOffice) {
        const hasLocations = hasLocationsForBlock(currentOffice.name, selectedBlock);
        if (hasLocations) {
          if (!selectedLocation || selectedLocation === "") {
            newBasicFieldErrors.add('location');
          } else if (selectedLocation === "Другое" && !customLocation.trim()) {
            newBasicFieldErrors.add('customLocation');
          }
        }
      }
    }

    // Проверка помещения
    if (selectedBlock && selectedLocation && selectedOfficeId) {
      const currentOffice = offices.find(o => o.id === selectedOfficeId);
      if (currentOffice) {
        const hasRooms = hasRoomsForLocation(currentOffice.name, selectedBlock, selectedLocation === "Другое" ? "" : selectedLocation);
        if (hasRooms) {
          if (!selectedRoom || selectedRoom === "") {
            newBasicFieldErrors.add('room');
          } else if (selectedRoom === "Другое" && !customRoom.trim()) {
            newBasicFieldErrors.add('customRoom');
          }
        } else if (selectedLocation !== "Другое" && selectedLocation !== "") {
          // Если местонахождение выбрано (не "Другое"), но помещений нет в справочнике
          if (!customRoom.trim()) {
            newBasicFieldErrors.add('customRoom');
          }
        }
      }
    }

    if (photos.length === 0) {
      newBasicFieldErrors.add('photos');
    }

    // Валидация для режима создания с завершением
    if (userRole === 'executor' && createMode === 'createAndComplete') {
      if (afterPhotos.length === 0) {
        newBasicFieldErrors.add('фотографии результата');
      }
      if (!completionComment.trim()) {
        newBasicFieldErrors.add('комментарий о выполненной работе');
      }
    }

    setBasicFieldErrors(newBasicFieldErrors);
  }, [requestType, selectedBlock, selectedLocation, selectedRoom, customLocation, customRoom, photos, afterPhotos, completionComment, selectedOfficeId, userRole, createMode, hasAttemptedSubmit, offices]);

  useEffect(() => {
    if (isOpen) {
      handleGetLocation();
    }
  }, [isOpen]);

  const handleGetLocation = async () => {
    // Показываем индикатор загрузки
    setIsGettingLocation(true);

    // Сначала пробуем геолокацию браузера
    if (navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 секунд
        maximumAge: 60000 // 1 минута кэша
      };

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });

        const { latitude, longitude, accuracy } = position.coords;
        
        // Ищем ближайший офис
        const nearestOfficeResult = findNearestOffice(latitude, longitude, offices);
        
        if (nearestOfficeResult) {
          const { office, distance } = nearestOfficeResult;
          setSelectedOfficeId(office.id);
          
          // Показываем информацию о найденном офисе
          const distanceText = distance < 1 ? `${Math.round(distance * 1000)} м` : `${distance.toFixed(1)} км`;
          console.log(`Найден ближайший офис: ${office.name} (${distanceText})`);
        }
        
        setIsGettingLocation(false);
        return;
      } catch (error: any) {
        console.error("Ошибка геолокации:", error);
        
        // Детальная обработка ошибок
        let errorMessage = "Не удалось определить местоположение";

        console.log(errorMessage);
      } finally {
        setIsGettingLocation(false);
      }
    }
  };

  const handleSubmit = async () => {
    // Устанавливаем флаг попытки отправки
    setHasAttemptedSubmit(true);

    // Проверяем основные поля формы
    const basicFieldErrors = [];

    if (!requestType) {
      basicFieldErrors.push('тип заявки');
    }

    // Валидация офиса для всех ролей
    if (!selectedOfficeId) {
      basicFieldErrors.push('офис');
    }

    // Валидация блока, местонахождения и помещения
    if (!selectedBlock) {
      basicFieldErrors.push('блок');
    }

    const currentOffice = offices.find(o => o.id === selectedOfficeId);
    if (currentOffice && selectedBlock) {
      // Проверка местонахождения
      const hasLocations = hasLocationsForBlock(currentOffice.name, selectedBlock);
      if (hasLocations) {
        if (!selectedLocation || selectedLocation === "") {
          basicFieldErrors.push('местонахождение');
        } else if (selectedLocation === "Другое" && !customLocation.trim()) {
          basicFieldErrors.push('местонахождение (укажите вручную)');
        }
      }

      // Проверка помещения
      if (selectedLocation) {
        const hasRooms = hasRoomsForLocation(
          currentOffice.name,
          selectedBlock, 
          selectedLocation === "Другое" ? "" : selectedLocation
        );
        if (hasRooms) {
          if (!selectedRoom || selectedRoom === "") {
            basicFieldErrors.push('помещение');
          } else if (selectedRoom === "Другое" && !customRoom.trim()) {
            basicFieldErrors.push('помещение (укажите вручную)');
          }
        } else if (selectedLocation !== "Другое" && selectedLocation !== "") {
          // Если местонахождение выбрано (не "Другое"), но помещений нет в справочнике
          if (!customRoom.trim()) {
            basicFieldErrors.push('помещение (укажите вручную)');
          }
        }
      }
    }

    if (photos.length === 0) {
      basicFieldErrors.push('фотографии (минимум 1)');
    }

    // Валидация для режима создания с завершением
    if (userRole === 'executor' && createMode === 'createAndComplete') {
      if (afterPhotos.length === 0) {
        basicFieldErrors.push('фотографии результата (минимум 1)');
      }
      if (!completionComment.trim()) {
        basicFieldErrors.push('комментарий о выполненной работе');
      }
    }

    // Проверяем обязательные поля в подзаявках
    const subRequestErrors: string[] = [];
    subRequests.forEach((subRequest, index) => {
      if (!subRequest.title.trim()) {
        subRequestErrors.push(`название заявки`);
      }
      if (!subRequest.description.trim()) {
        subRequestErrors.push(`описание заявки`);
      }
      if (!subRequest.category_id || subRequest.category_id === 0) {
        subRequestErrors.push(`категорию заявки`);
      }
    });

    // Проверяем что есть хотя бы один заявка (всегда должен быть один)
    if (subRequests.length === 0) {
      basicFieldErrors.push('хотя бы одну заявку');
    }

    if (basicFieldErrors.length > 0 || subRequestErrors.length > 0) {
      const allErrors = [...basicFieldErrors, ...subRequestErrors];
      const errorMessage = `Пожалуйста, заполните следующие обязательные поля:\n\n${allErrors.join('\n')}`;
      return;
    }

            // Валидация времени выполнения и complexity для admin-worker и department-head
    if (userRole === 'admin-worker' || userRole === 'department-head') {
      const invalidSubRequests = subRequests.filter(sub => !sub.complexity || !sub.sla);
      if (invalidSubRequests.length > 0) {
        const invalidIndices = invalidSubRequests.map(sub => {
          return subRequests.indexOf(sub) + 1;
        });
        const errorMessage = `Пожалуйста, заполните сложность и время выполнения для заявки.\n\nЗаявка автоматически развернута для заполнения.`;
        return;
      }
    }

    // Валидация лидера для department-head
    if (userRole === 'department-head') {
      const subRequestsWithoutLeader = subRequests.filter(sub => {
        if (userServiceCategoryId && sub.category_id === userServiceCategoryId &&
            sub.executors && sub.executors.length > 0) {
          return !sub.executors.some(e => e.role === 'leader');
        }
        return false;
      });
      if (subRequestsWithoutLeader.length > 0) {
        const leaderInvalidIndices = subRequestsWithoutLeader.map(sub => {
          return subRequests.indexOf(sub) + 1;
        });
        const errorMessage = `Пожалуйста, назначьте лидера для заявки с исполнителями.\n\nЗаявка автоматически развернута для заполнения.`;
        return;
      }
    }

    const formData = new FormData();

    // Определяем статус группы заявок
    let groupStatus = 'awaiting_assignment';
    if (userRole === 'client') {
      groupStatus = 'in_progress';
    } else if (userRole === 'executor') {
      groupStatus = createMode === 'createAndComplete' ? 'completed' : 'in_progress';
    } else if (userRole === 'department-head') {
      // Если хотя бы одна подзаявка имеет исполнителей, то статус execution
      const hasExecutors = subRequests.some(sub =>
        sub.executors && sub.executors.length > 0
      );
      groupStatus = hasExecutors ? 'execution' : 'awaiting_assignment';
    }

    // Поля группы заявок
    // Для повторяющихся задач устанавливаем request_type как 'recurring', иначе используем обычный requestType
    const finalRequestType = isRecurringTask ? 'recurring' : requestType;
    formData.append('request_type', finalRequestType);
    formData.append('location', `Широта: ${currentOffice?.lat}, Долгота: ${currentOffice?.lon} (±${Math.round(1)} м)`);
    
    // Формируем location_detail из блока, местонахождения и помещения
    const locationParts = [];
    locationParts.push(`Блок: ${selectedBlock}`);
    
    // Добавляем местонахождение
    if (currentOffice) {
      const hasLocations = hasLocationsForBlock(currentOffice.name, selectedBlock);
      if (hasLocations) {
        // Есть справочные местонахождения
        const locationValue = selectedLocation === "Другое" ? customLocation : selectedLocation;
        if (locationValue) {
          locationParts.push(`Местонахождение: ${locationValue}`);
        }
      } else {
        // Нет справочных местонахождений - используем customLocation если заполнено
        if (customLocation) {
          locationParts.push(`Местонахождение: ${customLocation}`);
        }
      }
    }
    
    // Добавляем помещение
    if (currentOffice) {
      const hasLocations = hasLocationsForBlock(currentOffice.name, selectedBlock);
      
      // Определяем текущее местонахождение для проверки помещений
      let currentLocationForRooms = "";
      if (hasLocations) {
        currentLocationForRooms = selectedLocation === "Другое" ? "" : selectedLocation;
      }
      
      const hasRooms = hasRoomsForLocation(
        currentOffice.name,
        selectedBlock, 
        currentLocationForRooms
      );
      
      if (hasRooms) {
        // Есть справочные помещения
        const roomValue = selectedRoom === "Другое" ? customRoom : selectedRoom;
        if (roomValue) {
          locationParts.push(`Помещение: ${roomValue}`);
        }
      } else {
        // Нет справочных помещений - используем customRoom если заполнено
        if (customRoom) {
          locationParts.push(`Помещение: ${customRoom}`);
        }
      }
    }

    const locationDetailsStr = locationParts.join(', ');
    formData.append('location_detail', locationDetailsStr);
    formData.append('status', groupStatus);
    if (plannedDate) formData.append('planned_date', plannedDate);
    if (selectedOfficeId) {
      formData.append('office_id', String(selectedOfficeId));
    }

            // Под заявки с их временем выполнения и сложностью
    const subRequestsData = subRequests.map(sub => {
      let subStatus = 'awaiting_assignment';
      if (userRole === 'client') {
        subStatus = 'in_progress';
      } else if (userRole === 'executor') {
        subStatus = createMode === 'createAndComplete' ? 'completed' : 'in_progress';
      } else if (userRole === 'department-head') {
        // Если у подзаявки есть исполнители, то статус assigned
        if (sub.executors && sub.executors.length > 0) {
          subStatus = 'assigned';
        }
      }
      return {
        title: sub.title,
        description: sub.description,
        category_id: sub.category_id,
        subcategory_id: sub.subcategory_id || null,
        complexity: (userRole === 'admin-worker' || userRole === 'department-head') ? sub.complexity : undefined,
        sla: (userRole === 'admin-worker' || userRole === 'department-head') ? sub.sla : undefined,
        status: subStatus,
        executors: sub.executors || []
      };
    });
    formData.append('sub_requests', JSON.stringify(subRequestsData));

    // Фото
    photos.forEach(photo => formData.append('photos', photo));

    // Дополнительные данные для режима создания с завершением
    if (userRole === 'executor' && createMode === 'createAndComplete') {
      formData.append('completion_comment', completionComment);
      formData.append('completion_date', format(completionDate, 'yyyy-MM-dd'));
      afterPhotos.forEach(photo => formData.append('after_photos', photo));
    }

    // Данные для повторяющихся задач
    if (isRecurringTask) {
      formData.append('recurrence_type', recurrenceType);
      formData.append('recurrence_interval', String(recurrenceInterval));
      formData.append('start_date', format(recurrenceStartDate, 'yyyy-MM-dd'));
      
      // Отладочная информация
      console.log('CreateRequestModal - FormData contents for recurring task:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }
    }

    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
        isFullScreen ? 'p-0' : 'p-4'
      }`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        resetForm();
      }}
    >
      <Card className={`w-full overflow-y-auto ${
        isFullScreen 
          ? 'max-w-none max-h-none h-full rounded-none' 
          : 'max-w-4xl max-h-[90vh]'
      }`} onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isFullScreen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div>
                <CardTitle>Создать заявку</CardTitle>
                <CardDescription>Заполните форму для подачи новой заявки</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pb-16 px-6">
          {/* Выбор режима создания для executor */}
          {userRole === 'executor' && onModeChange && (
            <div>
              <Label className="flex items-center gap-1 mb-3">
                Режим создания
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant={createMode === 'create' ? 'default' : 'outline'}
                  onClick={() => onModeChange('create')}
                  className="flex-1 text-sm sm:text-base"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Создать заявку</span>
                  <span className="sm:hidden">Обычная</span>
                </Button>
                <Button
                  type="button"
                  variant={createMode === 'createAndComplete' ? 'default' : 'outline'}
                  onClick={() => onModeChange('createAndComplete')}
                  className="flex-1 text-sm sm:text-base"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Создать с завершением</span>
                  <span className="sm:hidden">С завершением</span>
                </Button>
              </div>
              {createMode === 'createAndComplete' && (
                <p className="text-xs text-gray-600 mt-2">
                  Создайте заявку для уже выполненной работы с отчетом и фотографиями результата
                </p>
              )}
            </div>
          )}

          {/* Выбор офиса для всех ролей */}
          {offices.length > 0 && (
            <div>
              <Label className="flex items-center gap-1 mb-2">
                Офис
              </Label>
              <Select
                value={selectedOfficeId?.toString() || ""}
                onValueChange={(value) => setSelectedOfficeId(parseInt(value))}
              >
                <SelectTrigger className={hasAttemptedSubmit && !selectedOfficeId ? 'border-red-300 focus:border-red-500' : ''}>
                  <SelectValue placeholder="Выберите офис" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id.toString()}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasAttemptedSubmit && !selectedOfficeId && (
                <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
              )}

                             <Button
                   variant="outline"
                   className="whitespace-nowrap mt-4"
                   onClick={handleGetLocation}
                   disabled={isGettingLocation}
               >
                 {isGettingLocation ? (
                     <>
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-600 mr-2"></div>
                       Определение...
                     </>
                 ) : (
                     <>
                       <MapPin className="w-4 h-4 mr-2" />
                       Определить ближайший офис
                     </>
                 )}
               </Button>
            </div>
          )}

          {/* Блок, Местонахождение, Помещение */}
          <div className="space-y-4">
            {/* Блок */}
            <div>
              <Label className="flex items-center gap-1 mb-2">
                Блок
              </Label>
              <Select
                value={selectedBlock}
                onValueChange={(value) => setSelectedBlock(value)}
                disabled={!selectedOfficeId}
              >
                <SelectTrigger 
                  className={hasAttemptedSubmit && basicFieldErrors.has('block') ? 'border-red-300 focus:border-red-500' : ''}
                >
                  <SelectValue placeholder={selectedOfficeId ? "Выберите блок" : "Сначала выберите офис"} />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                  {selectedOfficeId && (() => {
                    const currentOffice = offices.find(o => o.id === selectedOfficeId);
                    if (currentOffice) {
                      const blocks = getBlocksForOffice(currentOffice.name);
                      return blocks.map((block) => (
                        <SelectItem key={block} value={block}>
                          {block}
                        </SelectItem>
                      ));
                    }
                    return null;
                  })()}
                </SelectContent>
              </Select>
              {hasAttemptedSubmit && basicFieldErrors.has('block') && (
                <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
              )}
            </div>

            {/* Местонахождение */}
            {selectedBlock && (() => {
              const currentOffice = offices.find(o => o.id === selectedOfficeId);
              if (!currentOffice) return null;
              
              const hasLocations = hasLocationsForBlock(currentOffice.name, selectedBlock);
              const locations = hasLocations ? getLocationsForBlock(currentOffice.name, selectedBlock) : [];
              
              if (hasLocations && locations.length > 0) {
                // Показываем селект если есть местонахождения в справочнике
                return (
                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Местонахождение
                    </Label>
                    <Select
                      value={selectedLocation}
                      onValueChange={(value) => setSelectedLocation(value)}
                    >
                      <SelectTrigger 
                        className={hasAttemptedSubmit && basicFieldErrors.has('location') ? 'border-red-300 focus:border-red-500' : ''}
                      >
                        <SelectValue placeholder="Выберите местонахождение" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                        <SelectItem value="Другое">Другое</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasAttemptedSubmit && basicFieldErrors.has('location') && (
                      <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                    )}
                    
                    {selectedLocation === "Другое" && (
                      <div className="mt-2">
                        <Input
                          placeholder="Введите местонахождение"
                          value={customLocation}
                          onChange={(e) => setCustomLocation(e.target.value)}
                          className={hasAttemptedSubmit && basicFieldErrors.has('customLocation') ? 'border-red-300 focus:border-red-500' : ''}
                        />
                        {hasAttemptedSubmit && basicFieldErrors.has('customLocation') && (
                          <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              } else {
                // Если местонахождений нет в справочнике, сразу переходим к помещению
                return null;
              }
            })()}

            {/* Помещение */}
            {selectedBlock && (() => {
              const currentOffice = offices.find(o => o.id === selectedOfficeId);
              if (!currentOffice) return null;
              
              // Проверяем, нужно ли показывать поле помещения
              const hasLocations = hasLocationsForBlock(currentOffice.name, selectedBlock);
              const shouldShowRoom = !hasLocations || (hasLocations && selectedLocation !== "");
              
              if (!shouldShowRoom) return null;

              const hasRooms = hasRoomsForLocation(
                currentOffice.name,
                selectedBlock, 
                selectedLocation === "Другое" ? "" : selectedLocation
              );

              if (hasRooms) {
                const rooms = getRoomsForLocation(
                  currentOffice.name,
                  selectedBlock, 
                  selectedLocation === "Другое" ? "" : selectedLocation
                );

                return (
                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Помещение
                    </Label>
                    <Select
                      value={selectedRoom}
                      onValueChange={(value) => setSelectedRoom(value)}
                    >
                      <SelectTrigger 
                        className={hasAttemptedSubmit && basicFieldErrors.has('room') ? 'border-red-300 focus:border-red-500' : ''}
                      >
                        <SelectValue placeholder="Выберите помещение" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                        {rooms.map((room) => (
                          <SelectItem key={room} value={room}>
                            {room}
                          </SelectItem>
                        ))}
                        <SelectItem value="Другое">Другое</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasAttemptedSubmit && basicFieldErrors.has('room') && (
                      <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                    )}
                    
                    {selectedRoom === "Другое" && (
                      <div className="mt-2">
                        <Input
                          placeholder="Введите помещение"
                          value={customRoom}
                          onChange={(e) => setCustomRoom(e.target.value)}
                          className={hasAttemptedSubmit && basicFieldErrors.has('customRoom') ? 'border-red-300 focus:border-red-500' : ''}
                        />
                        {hasAttemptedSubmit && basicFieldErrors.has('customRoom') && (
                          <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              } else if (selectedLocation !== "Другое") {
                // Если местонахождение выбрано (не "Другое"), но помещений нет в справочнике
                return (
                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Помещение *
                    </Label>
                    <Input
                      placeholder="Введите помещение"
                      value={customRoom}
                      onChange={(e) => setCustomRoom(e.target.value)}
                      className={hasAttemptedSubmit && basicFieldErrors.has('customRoom') ? 'border-red-300 focus:border-red-500' : ''}
                    />
                    {hasAttemptedSubmit && basicFieldErrors.has('customRoom') && (
                      <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                    )}
                  </div>
                );
              }
              
              return null;
            })()}
          </div>

          <div>
            <Label className="flex items-center gap-1 mb-2">
              Тип заявки
            </Label>
            <Select value={requestType} onValueChange={(value) => {
              setRequestType(value);
              setIsRecurringTask(value === 'recurring');
            }}>
              <SelectTrigger className={hasAttemptedSubmit && basicFieldErrors.has('requestType') ? 'border-red-300 focus:border-red-500' : ''}>
                <SelectValue placeholder="Выберите тип заявки" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                <SelectItem value="normal">Обычная</SelectItem>
                <SelectItem value="urgent">Экстренная</SelectItem>
                {(userRole === 'admin-worker' || userRole === 'department-head') && (
                  <SelectItem value="planned">Плановая</SelectItem>
                )}
                {(userRole === 'admin-worker') && (
                  <SelectItem value="recurring">Повторяющаяся задача</SelectItem>
                )}
              </SelectContent>
            </Select>
            {hasAttemptedSubmit && basicFieldErrors.has('requestType') && (
              <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
            )}
          </div>

          {requestType === "planned" && (userRole === 'admin-worker' || userRole === 'department-head') && (
              <div>
                <Label className="mb-2">Планируемая дата</Label>
                <Popover>
                  <PopoverTrigger asChild>
                                         <Button
                         variant={"outline"}
                         className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
                     >
                       <CalendarLucid className="mr-2 h-4 w-4" />
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
                         disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                         initialFocus
                     />
                   </PopoverContent>
                </Popover>
              </div>
          )}

          {/* Поля для повторяющихся задач */}
          {isRecurringTask && (
            <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CalendarLucid className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Настройки повторения</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recurrence_type" className="mb-2">Тип повторения</Label>
                  <Select
                    value={recurrenceType}
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'yearly') => setRecurrenceType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="daily">Ежедневно</SelectItem>
                      <SelectItem value="weekly">Еженедельно</SelectItem>
                      <SelectItem value="monthly">Ежемесячно</SelectItem>
                      <SelectItem value="yearly">Ежегодно</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recurrence_interval" className="mb-2">Интервал</Label>
                  <Select
                    value={String(recurrenceInterval)}
                    onValueChange={(value) => setRecurrenceInterval(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="1">Каждые 1</SelectItem>
                      <SelectItem value="2">Каждые 2</SelectItem>
                      <SelectItem value="3">Каждые 3</SelectItem>
                      <SelectItem value="4">Каждые 4</SelectItem>
                      <SelectItem value="6">Каждые 6</SelectItem>
                      <SelectItem value="12">Каждые 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="mb-2">Дата начала повторения</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarLucid className="mr-2 h-4 w-4" />
                      {format(recurrenceStartDate, "PPP", { locale: ru })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={recurrenceStartDate}
                      onSelect={(newDate) => {
                        if (newDate) {
                          setRecurrenceStartDate(newDate);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded-md">
                <p><strong>Пример:</strong></p>
                {recurrenceType === 'daily' && (
                  <p>Задача будет выполняться каждые {recurrenceInterval} {recurrenceInterval === 1 ? 'день' : 'дней'}</p>
                )}
                {recurrenceType === 'weekly' && (
                  <p>Задача будет выполняться каждые {recurrenceInterval} {recurrenceInterval === 1 ? 'неделю' : 'недель'}</p>
                )}
                {recurrenceType === 'monthly' && (
                  <p>Задача будет выполняться каждые {recurrenceInterval} {recurrenceInterval === 1 ? 'месяц' : 'месяцев'}</p>
                )}
                {recurrenceType === 'yearly' && (
                  <p>Задача будет выполняться каждые {recurrenceInterval} {recurrenceInterval === 1 ? 'год' : 'лет'}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <Label className="flex items-center gap-1 mb-2">
              Фотографии (до 3 шт.)
            </Label>
            <div className={`flex flex-wrap gap-4 ${
              hasAttemptedSubmit && basicFieldErrors.has('photos') ? 'border-2 border-red-300 border-dashed rounded-lg p-4' : ''
            }`}>
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
            {hasAttemptedSubmit && basicFieldErrors.has('photos') && (
              <p className="text-xs text-red-500 mt-1">Добавьте хотя бы одну фотографию</p>
            )}
          </div>

          {/* Поля для режима создания с завершением */}
          {userRole === 'executor' && createMode === 'createAndComplete' && (
            <>
              <div>
                <Label className="flex items-center gap-1">
                  Дата выполнения
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal ${!completionDate && "text-muted-foreground"}`}
                    >
                      <CalendarLucid className="mr-2 h-4 w-4" />
                      {completionDate ? format(completionDate, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={completionDate}
                      onSelect={(newDate) => {
                        if (newDate) {
                          setCompletionDate(newDate);
                        }
                      }}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  Комментарий о выполненной работе *
                </Label>
                <Textarea
                  placeholder="Опишите выполненную работу, использованные материалы, время выполнения и т.д."
                  value={completionComment}
                  onChange={(e) => setCompletionComment(e.target.value)}
                  className={`min-h-[100px] resize-none ${
                    hasAttemptedSubmit && !completionComment.trim() ? 'border-red-300 focus:border-red-500' : ''
                  }`}
                />
                {hasAttemptedSubmit && !completionComment.trim() && (
                  <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  Фотографии результата (до 3 шт.) *
                </Label>
                <div className={`flex flex-wrap gap-4 mt-2 ${
                  hasAttemptedSubmit && basicFieldErrors.has('фотографии результата') ? 'border-2 border-red-300 border-dashed rounded-lg p-4' : ''
                }`}>
                  {afterPhotoPreviews.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo || "/placeholder.svg"}
                        alt={`After Photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeAfterPhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {afterPhotoPreviews.length < 3 && (
                    <button
                      type="button"
                      onClick={() => document.getElementById('after-photo-input')?.click()}
                      className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-violet-500 transition-colors"
                    >
                      <input
                        id="after-photo-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAfterPhotoUpload}
                        className="hidden"
                      />
                      <Camera className="w-6 h-6 text-gray-400" />
                    </button>
                  )}
                </div>
                {hasAttemptedSubmit && basicFieldErrors.has('фотографии результата') && (
                  <p className="text-xs text-red-500 mt-1">Добавьте хотя бы одну фотографию результата</p>
                )}
              </div>
            </>
          )}

            {/* Под заявки - теперь только один */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Кнопка добавления подзаявки отключена - теперь только один подзаявка */}
              {/* Кнопка импорта Excel для admin-worker и department-head */}
              {(userRole === 'admin-worker' || userRole === 'department-head') && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">Импорт Excel</span>
                  <span className="sm:hidden">Excel</span>
                </Button>
              )}
            </div>

            <div>
              {subRequests.map((subRequest, index) => (
                <div key={index}>
                                        {/* Содержимое подзаявки */}
                    <div>
                      <div className="space-y-5">

                        <div>
                          <Label htmlFor={`subRequestCategory-${index}`} className="flex items-center gap-1 mb-2">
                            Категория заявки
                          </Label>
                          <Select
                              value={categories.find(c => c.id === subRequest.category_id)?.name || ''}
                              onValueChange={(value) => {
                                const category = categories.find(c => c.name === value);

                                // Обновляем все поля за один раз
                                const newSubRequests = [...subRequests];
                                newSubRequests[index] = {
                                  ...newSubRequests[index],
                                  category_id: category?.id || 0,
                                  subcategory_id: 0,
                                  title: ''
                                };
                                setSubRequests(newSubRequests);
                              }}
                          >
                            <SelectTrigger
                                id={`subRequestCategory-${index}`}
                                className={hasAttemptedSubmit && (!subRequest.category_id || subRequest.category_id === 0) ? 'border-red-300 focus:border-red-500' : ''}
                            >
                              <SelectValue placeholder="Выберите категорию" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                              {categories.map(category => (
                                  <SelectItem key={category.id} value={category.name}>
                                    {category.name}
                                  </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {hasAttemptedSubmit && (!subRequest.category_id || subRequest.category_id === 0) && (
                              <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                          )}
                        </div>


                        <div>
                          <Label htmlFor={`subRequestTitle-${index}`} className="flex items-center gap-1 mb-2">
                            Название заявки
                          </Label>
                          <Select
                              value={(() => {
                                const category = categories.find(c => c.id === subRequest.category_id);
                                const subcategory = category?.subcategories?.find(s => s.name === subRequest.title);
                                return subcategory?.name || subRequest.title || '';
                              })()}
                              onValueChange={(value) => {
                                // Обновляем все поля за один раз
                                const category = categories.find(c => c.id === subRequest.category_id);
                                const subcategory = category?.subcategories?.find(s => s.name === value);

                                const newSubRequests = [...subRequests];
                                newSubRequests[index] = {
                                  ...newSubRequests[index],
                                  title: value,
                                  subcategory_id: subcategory?.id || 0
                                };
                                setSubRequests(newSubRequests);
                              }}
                          >
                            <SelectTrigger
                                id={`subRequestTitle-${index}`}
                                className={hasAttemptedSubmit && !subRequest.title.trim() ? 'border-red-300 focus:border-red-500' : ''}
                            >
                              <SelectValue placeholder="Выберите название заявки" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                              {(() => {
                                const category = categories.find(c => c.id === subRequest.category_id);
                                return category?.subcategories?.map(subcategory => (
                                    <SelectItem key={subcategory.id} value={subcategory.name}>
                                      {subcategory.name}
                                    </SelectItem>
                                )) || [];
                              })()}
                            </SelectContent>
                          </Select>
                          {hasAttemptedSubmit && !subRequest.title.trim() && (
                              <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor={`subRequestDescription-${index}`} className="flex items-center gap-1 mb-2">
                            Описание заявки
                          </Label>
                          <Textarea
                            id={`subRequestDescription-${index}`}
                            placeholder="Опишите заявку подробно..."
                            className={`min-h-[100px] ${hasAttemptedSubmit && !subRequest.description.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                            value={subRequest.description}
                            onChange={(e) => updateSubRequest(index, 'description', e.target.value)}
                          />
                          {hasAttemptedSubmit && !subRequest.description.trim() && (
                            <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                          )}
                        </div>

                        {/* Выбор исполнителей для department-head */}
                        {userRole === 'department-head' && userServiceCategoryId &&
                         subRequest.category_id === userServiceCategoryId && executors.length > 0 && (
                          <div className="space-y-4">
                            {/* Выбор исполнителей через Select */}
                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm font-medium mb-2">Добавить исполнителя (необязательно)</Label>
                                <Select
                                  value=""
                                  onValueChange={(value) => {
                                    if (value) {
                                      const executorId = parseInt(value);
                                      const currentExecutors = subRequest.executors || [];
                                      const executor = executors.find(e => e.id === executorId);

                                      if (executor && !currentExecutors.some(e => e.id === executorId)) {
                                        // Добавляем исполнителя как обычного исполнителя
                                        const newExecutors = [...currentExecutors, { id: executorId, role: 'executor' as const }];
                                        updateSubRequestExecutors(index, newExecutors);
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите исполнителя для добавления" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                                    {executors
                                      .filter(executor => !subRequest.executors?.some(e => e.id === executor.id))
                                      .map(executor => (
                                        <SelectItem key={executor.id} value={executor.id.toString()}>
                                          <div className="flex flex-col">
                                            <span className="font-medium">{executor.user.full_name}</span>
                                            <span className="text-xs text-gray-500">
                                              {executor.specialty} • Загрузка: {executor.workload}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Список выбранных исполнителей */}
                              {subRequest.executors && subRequest.executors.length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium mb-2">Выбранные исполнители:</Label>
                                  {subRequest.executors.map(executorData => {
                                    const executor = executors.find(e => e.id === executorData.id);
                                    if (!executor) return null;

                                    return (
                                      <div
                                        key={executorData.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">
                                              {executor.user.full_name}
                                            </span>
                                            {executorData.role === 'leader' && (
                                              <Badge variant="secondary" className="text-xs">
                                                Лидер
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-600 mt-1">
                                            {executor.specialty} • Загрузка: {executor.workload}
                                          </p>
                                          {executor.user.phone && (
                                            <p className="text-xs text-gray-500 mt-1">
                                              Тел: {executor.user.phone}
                                            </p>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <Select
                                            value={executorData.role}
                                            onValueChange={(role: 'executor' | 'leader') => {
                                              const currentExecutors = subRequest.executors || [];
                                              const updatedExecutors = currentExecutors.map(e =>
                                                e.id === executorData.id
                                                  ? { ...e, role }
                                                  : e
                                              );
                                              updateSubRequestExecutors(index, updatedExecutors);
                                            }}
                                          >
                                            <SelectTrigger className="w-28 h-8 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent position="popper" className="max-h-[200px]">
                                              <SelectItem value="executor">Исполнитель</SelectItem>
                                              <SelectItem value="leader">Лидер</SelectItem>
                                            </SelectContent>
                                          </Select>

                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              const currentExecutors = subRequest.executors || [];
                                              updateSubRequestExecutors(
                                                index,
                                                currentExecutors.filter(e => e.id !== executorData.id)
                                              );
                                            }}
                                            className="text-red-500 hover:text-red-700 p-1 h-8 w-8"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Индикатор статуса */}
                            {subRequest.executors && subRequest.executors.length > 0 && (
                              <div className={`p-3 rounded-lg border ${
                                subRequest.executors.some(e => e.role === 'leader')
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-yellow-50 border-yellow-200'
                              }`}>
                                <div className="flex items-center gap-2 text-sm">
                                  {subRequest.executors.some(e => e.role === 'leader') ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <span className="text-green-800">
                                        Выбрано исполнителей: {subRequest.executors.length} (включая лидера)
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                      <span className="text-yellow-800">
                                        Выбрано исполнителей: {subRequest.executors.length}. Назначьте лидера!
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Дополнительные поля только для admin-worker and department-head */}
                        {(userRole === 'admin-worker' || userRole === 'department-head') && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`subRequestComplexity-${index}`} className="flex items-center gap-1 mb-2">
                                  Сложность
                                </Label>
                                <Select
                                  value={subRequest.complexity || ''}
                                  onValueChange={(value: 'simple' | 'medium' | 'complex') =>
                                    updateSubRequest(index, 'complexity', value)
                                  }
                                >
                                  <SelectTrigger
                                    id={`subRequestComplexity-${index}`}
                                    className={hasAttemptedSubmit && !subRequest.complexity ? 'border-red-300 focus:border-red-500' : ''}
                                  >
                                    <SelectValue placeholder="Выберите сложность" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                                    <SelectItem value="simple">Простая</SelectItem>
                                    <SelectItem value="medium">Средняя</SelectItem>
                                    <SelectItem value="complex">Сложная</SelectItem>
                                  </SelectContent>
                                </Select>
                                {hasAttemptedSubmit && !subRequest.complexity && (
                                  <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                                )}
                              </div>

                              <div>
                                <Label htmlFor={`subRequestSLA-${index}`} className="flex items-center gap-1 mb-2">
                                  Время выполнения
                                </Label>
                                <Select
                                  value={subRequest.sla || ''}
                                  onValueChange={(value: string) => updateSubRequest(index, 'sla', value)}
                                >
                                  <SelectTrigger
                                    id={`subRequestSLA-${index}`}
                                    className={hasAttemptedSubmit && !subRequest.sla ? 'border-red-300 focus:border-red-500' : ''}
                                  >
                                    <SelectValue placeholder="Выберите время выполнения" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" className="max-h-[300px] w-[var(--radix-select-trigger-width)]">
                                    <SelectItem value="1h">1 час</SelectItem>
                                    <SelectItem value="4h">4 часа</SelectItem>
                                    <SelectItem value="8h">8 часов</SelectItem>
                                    <SelectItem value="1d">1 день</SelectItem>
                                    <SelectItem value="3d">3 дня</SelectItem>
                                    <SelectItem value="1w">1 неделя</SelectItem>
                                  </SelectContent>
                                </Select>
                                {hasAttemptedSubmit && !subRequest.sla && (
                                  <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                                )}
                              </div>
                            </div>

                            {/* Индикатор заполненности обязательных полей */}
                            {hasAttemptedSubmit && (
                              <div className={`p-3 rounded-lg border ${
                                subRequest.complexity && subRequest.sla 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-yellow-50 border-yellow-200'
                              }`}>
                                <div className="flex items-center gap-2 text-sm">
                                  {subRequest.complexity && subRequest.sla ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <span className="text-green-800">
                                        Все обязательные поля заполнены
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                      <span className="text-yellow-800">
                                        Заполните сложность и время выполнения для заявки
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                </div>
              ))}
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
                  {userRole === 'executor' && createMode === 'createAndComplete' ? 'Создание с завершением...' :
                   ['client', 'executor'].includes(userRole) ? 'Отправка...' : 'Создание...'}
                </>
              ) : (
                userRole === 'executor' && createMode === 'createAndComplete' ? 'Создать с завершением' :
                ['client', 'executor'].includes(userRole) ? 'Отправить заявку' : 'Создать заявку'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
      
      {/* Модал импорта Excel */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          // Можно добавить обновление списка задач или другие действия
        }}
        userRole={userRole as 'admin-worker' | 'department-head'}
        isFullScreen={isFullScreen}
      />
    </div>
  );
};
