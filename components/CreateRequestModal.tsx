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
import { Camera, MapPin, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, Loader2, Calendar as CalendarLucid, CheckCircle, AlertTriangle, ArrowLeft, ArrowRight, FileSpreadsheet, Home, Building2 } from "lucide-react";
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
  lat?: number | null;
  lon?: number | null;
  photo?: string | null;
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
  /** Кабинеты пользователя (с умным домом) — для выбора при создании заявки сотрудником */
  userCabinetRooms?: { id: number; name: string; office_id: number }[];
  isFullScreen?: boolean; // Полноэкранный режим для мобильных устройств
  isStandalonePage?: boolean; // Отдельная страница /create-request — стиль как у сайта
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
  userCabinetRooms = [],
  isFullScreen = false,
  isStandalonePage = false,
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
  const [locationSource, setLocationSource] = useState<'office' | 'cabinet'>('office');
  const [selectedCabinetRoom, setSelectedCabinetRoom] = useState<{ id: number; name: string; office_id: number } | null>(null);

  // Состояния для нового функционала расположения в офисе
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [customLocation, setCustomLocation] = useState<string>("");
  const [customRoom, setCustomRoom] = useState<string>("");

  // Состояние для управления шагами
  const [currentStep, setCurrentStep] = useState(1);

  // Состояния для повторяющихся задач
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<Date>(new Date());

  // Отладочная информация


  // Состояние для геолокации
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasTriedLocationRef = useRef(false);

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
    setLocationSource("office");
    setSelectedCabinetRoom(null);
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
    setCurrentStep(1);
  };

  // На iOS вызов input.click() должен быть в том же жесте пользователя — запрашиваем разрешение заранее при переходе на шаг с фото
  useEffect(() => {
    if (currentStep !== 4) return;
    let cancelled = false;
    (async () => {
      try {
        const { ensureCameraPermission, iosBridge } = await import('@/lib/ios-bridge');
        const { androidBridge } = await import('@/lib/android-bridge');
        if (cancelled) return;
        if (iosBridge.isIOSWebView()) {
          await ensureCameraPermission();
        } else if (androidBridge.isAndroidWebView()) {
          await androidBridge.requestPermission('camera');
        }
      } catch (e) {
        if (!cancelled) console.error('Ошибка при запросе разрешения на камеру:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentStep]);

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

    // Валидация офиса или кабинета
    if (locationSource === 'cabinet') {
      if (!selectedCabinetRoom) newBasicFieldErrors.add('cabinet');
    } else {
      if (!selectedOfficeId) newBasicFieldErrors.add('office');
    }

    // Валидация блока, местонахождения и помещения (только при выборе офиса)
    if (locationSource === 'office' && !selectedBlock) {
      newBasicFieldErrors.add('block');
    }

    // Проверка местонахождения (только для офиса)
    if (locationSource === 'office' && selectedBlock && selectedOfficeId) {
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

    // Проверка помещения (только для офиса)
    if (locationSource === 'office' && selectedBlock && selectedLocation && selectedOfficeId) {
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

    // Фото опциональны — заявку можно создать без фото

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
  }, [requestType, selectedBlock, selectedLocation, selectedRoom, customLocation, customRoom, photos, afterPhotos, completionComment, selectedOfficeId, selectedCabinetRoom, locationSource, userRole, createMode, hasAttemptedSubmit, offices]);

  useEffect(() => {
    if (isOpen && !hasTriedLocationRef.current) {
      hasTriedLocationRef.current = true;
      handleGetLocation();
    }
    if (!isOpen) {
      hasTriedLocationRef.current = false;
    }
  }, [isOpen]);

  const handleGetLocation = async () => {
    // Показываем индикатор загрузки
    setIsGettingLocation(true);

    try {
      // В приложении (iOS/Android) сначала запрашиваем разрешение через бриджи
      const { ensureLocationPermission, iosBridge } = await import('@/lib/ios-bridge');
      const { androidBridge } = await import('@/lib/android-bridge');
      if (iosBridge.isIOSWebView()) {
        // ensureLocationPermission сам проверит статус и:
        // - если notDetermined → покажет системный диалог
        // - если denied → React Native покажет алерт «Открыть Настройки»
        const hasPermission = await ensureLocationPermission();
        if (!hasPermission) {
          setIsGettingLocation(false);
          return;
        }
      } else if (androidBridge.isAndroidWebView()) {
        await androidBridge.requestPermission('location');
      }
    } catch (e) {
      console.error('Ошибка при запросе разрешения на локацию:', e);
    }

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
    } else {
      setIsGettingLocation(false);
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

    if (locationSource === 'cabinet') {
      if (!selectedCabinetRoom) basicFieldErrors.push('кабинет');
    } else {
      if (!selectedOfficeId) basicFieldErrors.push('офис');
      if (!selectedBlock) basicFieldErrors.push('блок');
    }

    const currentOffice = locationSource === 'office' ? offices.find(o => o.id === selectedOfficeId) : (selectedCabinetRoom ? { id: selectedCabinetRoom.office_id, name: '', lat: null, lon: null } : null);
    if (locationSource === 'office' && currentOffice && selectedBlock) {
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

    // Фото опциональны — заявку можно создать без фото

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
    const officeForLocation = locationSource === 'cabinet' && selectedCabinetRoom
      ? offices.find(o => o.id === selectedCabinetRoom.office_id)
      : currentOffice;
    formData.append('location', `Широта: ${officeForLocation?.lat ?? ''}, Долгота: ${officeForLocation?.lon ?? ''} (±${Math.round(1)} м)`);
    
    const locationParts: string[] = [];
    if (locationSource === 'cabinet' && selectedCabinetRoom) {
      locationParts.push(`Кабинет: ${selectedCabinetRoom.name}`);
    } else {
      locationParts.push(`Блок: ${selectedBlock}`);
    }
    
    // Добавляем местонахождение (только для офиса)
    if (locationSource === 'office' && currentOffice) {
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
    
    // Добавляем помещение (только для офиса)
    if (locationSource === 'office' && currentOffice) {
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
    const officeIdToSend = locationSource === 'cabinet' && selectedCabinetRoom ? selectedCabinetRoom.office_id : selectedOfficeId;
    if (officeIdToSend) {
      formData.append('office_id', String(officeIdToSend));
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

  // Функции для валидации шагов
  const validateStep1 = (): boolean => {
    if (locationSource === 'cabinet') return selectedCabinetRoom !== null;
    return selectedOfficeId !== null;
  };

  const validateStep2 = (): boolean => {
    if (locationSource === 'cabinet') return true;
    if (!selectedBlock) return false;
    const currentOffice = offices.find(o => o.id === selectedOfficeId);
    if (!currentOffice) return false;
    
    const hasLocations = hasLocationsForBlock(currentOffice.name, selectedBlock);
    if (hasLocations) {
      if (!selectedLocation || selectedLocation === "") return false;
      if (selectedLocation === "Другое" && !customLocation.trim()) return false;
    }
    
    const hasRooms = hasRoomsForLocation(
      currentOffice.name,
      selectedBlock,
      selectedLocation === "Другое" ? "" : selectedLocation
    );
    if (hasRooms) {
      if (!selectedRoom || selectedRoom === "") return false;
      if (selectedRoom === "Другое" && !customRoom.trim()) return false;
    } else if (selectedLocation !== "Другое" && selectedLocation !== "") {
      if (!customRoom.trim()) return false;
    }
    
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!requestType) return false;
    const subRequest = subRequests[0];
    if (!subRequest.title.trim() || !subRequest.category_id || subRequest.category_id === 0) {
      return false;
    }
    return true;
  };

  const validateStep4 = (): boolean => {
    const subRequest = subRequests[0];
    if (!subRequest.description.trim()) return false;
    return true;
  };

  // Функции для навигации
  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) {
      setHasAttemptedSubmit(true);
      return;
    }
    if (currentStep === 2 && !validateStep2()) {
      setHasAttemptedSubmit(true);
      return;
    }
    if (currentStep === 3 && !validateStep3()) {
      setHasAttemptedSubmit(true);
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Рендер шага 1: Выбор офиса или кабинета
  const renderStep1 = () => {
    const currentOffice = offices.find(o => o.id === selectedOfficeId);
    const isEmployee = ["admin-worker", "department-head", "executor", "manager"].includes(userRole);
    const showCabinetOption = isEmployee && userCabinetRooms.length > 0;

  return (
      <div className="space-y-4 sm:space-y-6">
        {showCabinetOption && (
          <div>
            <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-3 block text-white">Где находится заявка?</Label>
            <div className="flex rounded-xl overflow-hidden bg-[#1E1E1E] border border-[#2A2A2A] mb-4">
              <button
                type="button"
                onClick={() => {
                  setLocationSource("office");
                  setSelectedCabinetRoom(null);
                  setSelectedOfficeId(null);
                }}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  locationSource === "office" ? "bg-[#F35713] text-white" : "text-[#8E8E93] hover:text-white"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Офис
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocationSource("cabinet");
                  setSelectedOfficeId(null);
                  setSelectedBlock("");
                  setSelectedLocation("");
                  setSelectedRoom("");
                  setCustomLocation("");
                  setCustomRoom("");
                }}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  locationSource === "cabinet" ? "bg-[#F35713] text-white" : "text-[#8E8E93] hover:text-white"
                }`}
              >
                <Home className="w-4 h-4" />
                Кабинет (умный дом)
              </button>
            </div>
          </div>
        )}

        {locationSource === "cabinet" ? (
          <div>
            <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Выбрать кабинет</Label>
            <p className="text-sm text-[#8E8E93] mb-4">Кабинет, закреплённый за вами с умным домом</p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {userCabinetRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => {
                    setSelectedCabinetRoom(room);
                    setSelectedOfficeId(room.office_id);
                  }}
                  className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl cursor-pointer transition-all border-2 inline-flex items-center gap-2 ${
                    selectedCabinetRoom?.id === room.id
                      ? "bg-[#F35713] text-white border-[#F35713] shadow-md"
                      : "bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]"
                  }`}
                >
                  <Home className="w-4 h-4 shrink-0" />
                  {room.name}
                </div>
              ))}
            </div>
            {hasAttemptedSubmit && !selectedCabinetRoom && (
              <p className="text-xs text-red-500 mt-2">Пожалуйста, выберите кабинет</p>
            )}
          </div>
        ) : (
        <div>
          <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Выбрать офис</Label>
          
          {/* Маленькие кнопки-теги для быстрого выбора */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-5">
            {offices.map((office) => (
              <button
                key={office.id}
                type="button"
                onClick={() => setSelectedOfficeId(office.id)}
                className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  selectedOfficeId === office.id
                    ? 'bg-[#F35713] text-white shadow-md'
                    : 'bg-[#1E1E1E] text-white hover:bg-[#2A2A2A]'
                }`}
              >
                {office.name}
              </button>
            ))}
          </div>

          {/* Большие карточки офисов с изображениями */}
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2">
            {offices.map((office) => (
              <div
                key={office.id}
                onClick={() => setSelectedOfficeId(office.id)}
                className={`relative flex flex-col rounded-[10px] cursor-pointer transition-all overflow-hidden ${
                  selectedOfficeId === office.id
                    ? 'bg-[#212121] shadow-[0px_4px_4px_0px_rgba(243,87,19,0.25),inset_0px_2px_4px_0px_rgba(243,87,19,1),inset_0px_-2px_4px_0px_rgba(243,87,19,0.2)]'
                    : 'bg-[#212121] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25),inset_0px_2px_4px_0px_rgba(255,255,255,0.4),inset_0px_-2px_4px_0px_rgba(0,0,0,0.2)] hover:shadow-lg'
                }`}
                style={{ aspectRatio: '108/134' }}
              >
                {/* Изображение офиса */}
                <div className="w-full flex-[3] bg-gray-700 rounded-t-[10px] overflow-hidden flex-shrink-0">
                  {office.photo ? (
                    <img
                      src={office.photo}
                      alt={office.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#114A65] to-[#B8400E] flex items-center justify-center">
                      <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-50" />
                    </div>
                  )}
              </div>
                
                {/* Информация об офисе */}
                <div className="flex flex-col items-center p-2 sm:p-2.5 gap-1 flex-[1] flex-shrink-0">
                  <div className={`text-[8px] sm:text-[10px] font-medium text-center ${
                    selectedOfficeId === office.id ? 'text-white' : 'text-white'
                  }`}>
                    {office.name}
            </div>
                  <div className="flex flex-col items-center gap-0.5 w-full">
                    {office.city && (
                      <div className="text-[8px] sm:text-[10px] text-[#737373] text-center">
                        {office.city}
          </div>
                    )}
                    {office.address && (
                      <div className="text-[8px] sm:text-[10px] text-[#737373] text-center line-clamp-2">
                        {office.address}
            </div>
          )}
                  </div>
                </div>
              </div>
            ))}
          </div>

              {hasAttemptedSubmit && !selectedOfficeId && (
            <p className="text-xs text-red-500 mt-2">Пожалуйста, выберите офис</p>
          )}
          {isGettingLocation && (
            <div className="flex items-center justify-center mt-4 text-sm text-gray-600">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#114A65] mr-2"></div>
              Определение ближайшего офиса...
            </div>
          )}
        </div>
        )}
      </div>
    );
  };

  // Рендер шага 2: Блок, местонахождение, помещение (или сводка по кабинету)
  const renderStep2 = () => {
    if (locationSource === 'cabinet' && selectedCabinetRoom) {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1E1E1E] p-4 flex items-center gap-3">
            <Home className="w-6 h-6 text-[#F35713]" />
            <div>
              <p className="text-sm text-[#8E8E93]">Выбран кабинет</p>
              <p className="text-white font-medium">{selectedCabinetRoom.name}</p>
            </div>
          </div>
        </div>
      );
    }
    const currentOffice = offices.find(o => o.id === selectedOfficeId);
    if (!currentOffice) return null;
    
    const blocks = getBlocksForOffice(currentOffice.name);
    const hasLocations = selectedBlock ? hasLocationsForBlock(currentOffice.name, selectedBlock) : false;
    const locations = hasLocations && selectedBlock ? getLocationsForBlock(currentOffice.name, selectedBlock) : [];
    const hasRooms = selectedBlock && selectedLocation ? hasRoomsForLocation(
      currentOffice.name,
      selectedBlock,
      selectedLocation === "Другое" ? "" : selectedLocation
    ) : false;
    const rooms = hasRooms && selectedBlock && selectedLocation ? getRoomsForLocation(
      currentOffice.name,
      selectedBlock,
      selectedLocation === "Другое" ? "" : selectedLocation
    ) : [];

    return (
      <div className="space-y-4 sm:space-y-6">
            {/* Блок */}
            <div>
          <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Выбрать блок</Label>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {blocks.map((block) => (
              <div
                key={block}
                onClick={() => setSelectedBlock(block)}
                className={`px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[16px] border-2 inline-flex items-center justify-center ${
                  selectedBlock === block
                    ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                    : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                }`}
              >
                          {block}
              </div>
            ))}
          </div>
          {hasAttemptedSubmit && !selectedBlock && (
            <p className="text-xs text-red-500 mt-2">Пожалуйста, выберите блок</p>
              )}
            </div>

            {/* Местонахождение */}
        {selectedBlock && hasLocations && locations.length > 0 && (
                  <div>
            <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Местонахождение</Label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
                        {locations.map((location) => (
                <div
                  key={location}
                  onClick={() => setSelectedLocation(location)}
                  className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center ${
                    selectedLocation === location
                      ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                      : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                  }`}
                >
                            {location}
                </div>
              ))}
              <div
                onClick={() => setSelectedLocation("Другое")}
                className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center ${
                  selectedLocation === "Другое"
                    ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                    : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                }`}
              >
                Другое
              </div>
            </div>
                    {selectedLocation === "Другое" && (
              <div className="mt-3">
                        <Input
                          placeholder="Введите местонахождение"
                          value={customLocation}
                          onChange={(e) => setCustomLocation(e.target.value)}
                  className={`h-[42px] w-full max-w-xs bg-[#040404] border-2 rounded-lg text-white placeholder:text-[#6E6E6E] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${hasAttemptedSubmit && !customLocation.trim() ? 'border-red-500' : 'border-[#1E1E1E]'}`}
                        />
                {hasAttemptedSubmit && !customLocation.trim() && (
                          <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                        )}
                      </div>
                    )}
            {hasAttemptedSubmit && (!selectedLocation || selectedLocation === "") && (
              <p className="text-xs text-red-500 mt-2">Пожалуйста, выберите местонахождение</p>
                    )}
                  </div>
        )}

            {/* Помещение */}
        {selectedBlock && (hasLocations ? selectedLocation : true) && (
                  <div>
            <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Помещение</Label>
            {hasRooms && rooms.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                        {rooms.map((room) => (
                    <div
                      key={room}
                      onClick={() => setSelectedRoom(room)}
                      className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center ${
                        selectedRoom === room
                          ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                          : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                      }`}
                    >
                            {room}
                    </div>
                  ))}
                  <div
                    onClick={() => setSelectedRoom("Другое")}
                    className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center ${
                      selectedRoom === "Другое"
                        ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                        : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                    }`}
                  >
                    Другое
                  </div>
                </div>
                    {selectedRoom === "Другое" && (
                  <div className="mt-3">
                        <Input
                          placeholder="Введите помещение"
                          value={customRoom}
                          onChange={(e) => setCustomRoom(e.target.value)}
                      className={`h-[42px] w-full max-w-xs bg-[#040404] border-2 rounded-lg text-white placeholder:text-[#6E6E6E] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${hasAttemptedSubmit && !customRoom.trim() ? 'border-red-500' : 'border-[#1E1E1E]'}`}
                        />
                    {hasAttemptedSubmit && !customRoom.trim() && (
                          <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                        )}
                      </div>
                    )}
              </>
            ) : (
                  <div>
                    <Input
                      placeholder="Введите помещение"
                      value={customRoom}
                      onChange={(e) => setCustomRoom(e.target.value)}
                  className={`h-[42px] w-full max-w-xs bg-[#040404] border-2 rounded-lg text-white placeholder:text-[#6E6E6E] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${hasAttemptedSubmit && !customRoom.trim() ? 'border-red-500' : 'border-[#1E1E1E]'}`}
                    />
                {hasAttemptedSubmit && !customRoom.trim() && (
                      <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                )}
              </div>
            )}
            {hasAttemptedSubmit && hasRooms && (!selectedRoom || selectedRoom === "") && (
              <p className="text-xs text-red-500 mt-2">Пожалуйста, выберите помещение</p>
            )}
          </div>
                    )}
                  </div>
                );
  };

  // Рендер шага 3: Тип заявки, категория, название
  const renderStep3 = () => {
    const subRequest = subRequests[0];
    const selectedCategory = categories.find(c => c.id === subRequest.category_id);
    
    const requestTypes = [
      { value: "normal", label: "Обычная" },
      { value: "urgent", label: "Экстренная" },
    ];
    
    if (userRole === 'admin-worker' || userRole === 'department-head') {
      requestTypes.push({ value: "planned", label: "Плановая" });
    }
    if (userRole === 'admin-worker') {
      requestTypes.push({ value: "recurring", label: "Повторяющаяся задача" });
    }

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Тип заявки */}
          <div>
          <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Тип заявки</Label>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {requestTypes.map((type) => (
              <div
                key={type.value}
                onClick={() => {
                  setRequestType(type.value);
                  setIsRecurringTask(type.value === 'recurring');
                }}
                className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center ${
                  requestType === type.value
                    ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                    : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                }`}
              >
                {type.label}
              </div>
            ))}
          </div>
          {hasAttemptedSubmit && !requestType && (
            <p className="text-xs text-red-500 mt-2">Пожалуйста, выберите тип заявки</p>
            )}
          </div>

        {/* Планируемая дата для плановых заявок */}
          {requestType === "planned" && (userRole === 'admin-worker' || userRole === 'department-head') && (
              <div>
                <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Планируемая дата</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <div
                      className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]`}
                    >
                      <CalendarLucid className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#040404] border-[#1E1E1E]">
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
                        className="bg-[#040404] text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>
          )}

          {/* Поля для повторяющихся задач */}
          {isRecurringTask && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Тип повторения</Label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {[
                    { value: 'daily', label: 'Ежедневно' },
                    { value: 'weekly', label: 'Еженедельно' },
                    { value: 'monthly', label: 'Ежемесячно' },
                    { value: 'yearly', label: 'Ежегодно' }
                  ].map((type) => (
                    <div
                      key={type.value}
                      onClick={() => setRecurrenceType(type.value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
                      className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center ${
                        recurrenceType === type.value
                          ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                          : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                      }`}
                    >
                      {type.label}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Интервал</Label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 6, 12].map((interval) => (
                    <div
                      key={interval}
                      onClick={() => setRecurrenceInterval(interval)}
                      className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center ${
                        recurrenceInterval === interval
                          ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                          : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                      }`}
                    >
                      Каждые {interval}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Дата начала повторения</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <div
                      className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]`}
                    >
                      <CalendarLucid className="mr-2 h-4 w-4" />
                      {format(recurrenceStartDate, "PPP", { locale: ru })}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#040404] border-[#1E1E1E]">
                    <Calendar
                      mode="single"
                      selected={recurrenceStartDate}
                      onSelect={(newDate) => {
                        if (newDate) {
                          setRecurrenceStartDate(newDate);
                        }
                      }}
                      initialFocus
                      className="bg-[#040404] text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>
          </div>
        )}

        {/* Категория */}
        <div>
          <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Категория заявки</Label>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => {
                  const newSubRequests = [...subRequests];
                  newSubRequests[0] = {
                    ...newSubRequests[0],
                    category_id: category.id,
                    subcategory_id: 0,
                    title: ''
                  };
                  setSubRequests(newSubRequests);
                }}
                className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center ${
                  subRequest.category_id === category.id
                    ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                    : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                }`}
              >
                {category.name}
              </div>
            ))}
          </div>
          {hasAttemptedSubmit && (!subRequest.category_id || subRequest.category_id === 0) && (
            <p className="text-xs text-red-500 mt-2">Пожалуйста, выберите категорию</p>
          )}
        </div>

        {/* Название заявки (подкатегория) */}
        {subRequest.category_id > 0 && selectedCategory?.subcategories && selectedCategory.subcategories.length > 0 && (
          <div>
            <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Название заявки</Label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {selectedCategory.subcategories.map((subcategory) => (
                <div
                  key={subcategory.id}
                  onClick={() => {
                    const newSubRequests = [...subRequests];
                    newSubRequests[0] = {
                      ...newSubRequests[0],
                      title: subcategory.name,
                      subcategory_id: subcategory.id
                    };
                    setSubRequests(newSubRequests);
                  }}
                  className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center ${
                    subRequest.title === subcategory.name
                      ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                      : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                  }`}
                >
                  {subcategory.name}
                </div>
              ))}
            </div>
            {hasAttemptedSubmit && !subRequest.title.trim() && (
              <p className="text-xs text-red-500 mt-2">Пожалуйста, выберите название заявки</p>
            )}
          </div>
                )}
              </div>
    );
  };

  // Рендер шага 4: Описание и фото
  const renderStep4 = () => {
    const subRequest = subRequests[0];
    
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Описание */}
        <div>
          <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Описание заявки</Label>
          <Textarea
            placeholder="Опишите заявку подробно..."
            className={`min-h-[100px] bg-[#040404] border-2 rounded-lg text-white placeholder:text-[#6E6E6E] border-[#1E1E1E] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${hasAttemptedSubmit && !subRequest.description.trim() ? 'border-red-500' : ''}`}
            value={subRequest.description}
            onChange={(e) => updateSubRequest(0, 'description', e.target.value)}
          />
          {hasAttemptedSubmit && !subRequest.description.trim() && (
            <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
          )}
        </div>

          {/* Фотографии */}
          <div>
          <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Фотографии (до 3 шт.)</Label>
            <div className={`flex flex-wrap gap-4 ${
              hasAttemptedSubmit && basicFieldErrors.has('photos') ? 'border-2 border-red-500 border-dashed rounded-lg p-4' : ''
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
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photoPreviews.length < 3 && (
                <label
                  htmlFor="create-request-photo-input"
                  className="w-20 h-20 border-2 border-dashed border-[#1E1E1E] rounded-lg flex items-center justify-center hover:border-[#F35713]/50 transition-colors bg-[#040404] cursor-pointer"
                >
                  <input
                    id="create-request-photo-input"
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <Camera className="w-6 h-6 text-[#6E6E6E]" />
                </label>
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
                <Label className="flex items-center gap-1 text-white">
                  Дата выполнения
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={`w-full max-w-xs justify-start text-left font-normal h-[42px] bg-[#1E1E1E] border-2 border-[#1E1E1E] text-white hover:bg-[#2A2A2A] hover:border-[#F35713]/50 rounded-lg ${!completionDate && "text-[#6E6E6E]"}`}
                    >
                      <CalendarLucid className="mr-2 h-4 w-4" style={{ color: '#6E6E6E' }} />
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
                <Label className="flex items-center gap-1 text-white">
                  Комментарий о выполненной работе *
                </Label>
                <Textarea
                  placeholder="Опишите выполненную работу, использованные материалы, время выполнения и т.д."
                  value={completionComment}
                  onChange={(e) => setCompletionComment(e.target.value)}
                  className={`min-h-[100px] resize-none bg-[#040404] border-2 rounded-lg text-white placeholder:text-[#6E6E6E] border-[#1E1E1E] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                    hasAttemptedSubmit && !completionComment.trim() ? 'border-red-500' : ''
                  }`}
                />
                {hasAttemptedSubmit && !completionComment.trim() && (
                  <p className="text-xs text-red-500 mt-1">Обязательное поле</p>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-1 text-white">
                  Фотографии результата (до 3 шт.) *
                </Label>
                <div className={`grid grid-cols-2 gap-3 sm:gap-4 mt-2 ${
                  hasAttemptedSubmit && basicFieldErrors.has('фотографии результата') ? 'border-2 border-red-500 border-dashed rounded-lg p-4' : ''
                }`}>
                  {afterPhotoPreviews.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo || "/placeholder.svg"}
                        alt={`After Photo ${index + 1}`}
                        className="w-full h-32 sm:h-40 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeAfterPhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {afterPhotoPreviews.length < 3 && (
                    <label
                      htmlFor="after-photo-input"
                      className="w-full h-32 sm:h-40 border-2 border-dashed border-[#1E1E1E] rounded-lg flex items-center justify-center hover:border-[#F35713]/50 transition-colors bg-[#040404] cursor-pointer"
                    >
                      <input
                        id="after-photo-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAfterPhotoUpload}
                        className="sr-only"
                      />
                      <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-[#6E6E6E]" />
                    </label>
                  )}
                </div>
                {hasAttemptedSubmit && basicFieldErrors.has('фотографии результата') && (
                  <p className="text-xs text-red-500 mt-1">Добавьте хотя бы одну фотографию результата</p>
                )}
              </div>
            </>
          )}

        {/* Дополнительные поля для admin-worker и department-head */}
              {(userRole === 'admin-worker' || userRole === 'department-head') && (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Сложность</Label>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {[
                  { value: 'simple', label: 'Простая' },
                  { value: 'medium', label: 'Средняя' },
                  { value: 'complex', label: 'Сложная' }
                ].map((complexity) => (
                  <div
                    key={complexity.value}
                    onClick={() => updateSubRequest(0, 'complexity', complexity.value as 'simple' | 'medium' | 'complex')}
                    className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center ${
                      subRequest.complexity === complexity.value
                        ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                        : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                    }`}
                  >
                    {complexity.label}
                  </div>
                ))}
              </div>
              {hasAttemptedSubmit && !subRequest.complexity && (
                <p className="text-xs text-red-500 mt-2">Пожалуйста, выберите сложность</p>
              )}
            </div>

            <div>
              <Label className="text-lg sm:text-xl font-medium sm:font-semibold mb-4 sm:mb-5 block text-white">Время выполнения</Label>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {[
                  { value: '1h', label: '1 час' },
                  { value: '4h', label: '4 часа' },
                  { value: '8h', label: '8 часов' },
                  { value: '1d', label: '1 день' },
                  { value: '3d', label: '3 дня' },
                  { value: '1w', label: '1 неделя' }
                ].map((sla) => (
                  <div
                    key={sla.value}
                    onClick={() => updateSubRequest(0, 'sla', sla.value)}
                    className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center ${
                      subRequest.sla === sla.value
                        ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                        : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                    }`}
                  >
                    {sla.label}
                  </div>
                ))}
              </div>
              {hasAttemptedSubmit && !subRequest.sla && (
                <p className="text-xs text-red-500 mt-2">Пожалуйста, выберите время выполнения</p>
              )}
            </div>
          </div>
        )}

                        {/* Выбор исполнителей для department-head */}
                        {userRole === 'department-head' && userServiceCategoryId &&
                         subRequest.category_id === userServiceCategoryId && executors.length > 0 && (
                          <div className="space-y-4">
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
                                        const newExecutors = [...currentExecutors, { id: executorId, role: 'executor' as const }];
                        updateSubRequestExecutors(0, newExecutors);
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите исполнителя для добавления" />
                                  </SelectTrigger>
                                  <SelectContent position="popper" className="z-[110] max-h-[300px] w-[var(--radix-select-trigger-width)]">
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
                              updateSubRequestExecutors(0, updatedExecutors);
                                            }}
                                          >
                                            <SelectTrigger className="w-28 h-8 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent position="popper" className="z-[110] max-h-[200px]">
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
                                0,
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
                              </div>
                            )}
                          </div>
    );
  };

  if (!isOpen) return null;

  const overlayClass = isStandalonePage && isFullScreen
    ? "fixed inset-0 bg-transparent flex items-center justify-center z-[100]"
    : `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] ${isFullScreen ? "p-0" : "p-4"}`;

  return (
    <div
      className={overlayClass}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        resetForm();
      }}
    >
      <Card className={`w-full overflow-y-auto bg-[#040404] border-[#040404] ${
        isFullScreen 
          ? 'max-w-none max-h-none h-full rounded-none' 
          : 'max-w-4xl max-h-[90vh]'
      }`} onClick={(e) => e.stopPropagation()}>
        <CardHeader className="bg-[#040404] flex items-center justify-center" style={{ paddingTop: 'clamp(38px, 1.48vh, 44px)', paddingBottom: 'clamp(12px, 1.48vh, 16px)', paddingLeft: 'clamp(24px, 4.27vw, 30px)', paddingRight: 'clamp(24px, 4.27vw, 30px)' }}>
          <div className="flex items-center justify-center relative w-full" style={{ minHeight: 'clamp(44px, 5.4vh, 52px)' }}>
            {/* Кнопка назад слева */}
            {isFullScreen && (
              <Button
                variant="ghost"
                size="lg"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (currentStep > 1) {
                    handleBack();
                  } else {
                    onClose();
                    resetForm();
                  }
                }}
                className={`absolute left-0 hover:bg-transparent !p-0 ${isStandalonePage ? "text-[#E25B21] hover:text-[#E25B21]" : "text-white"}`}
                style={{ padding: 'clamp(4px, 0.5vh, 6px)' }}
              >
                <ChevronLeft className="!w-6 !h-6 sm:!w-8 sm:!h-8" style={{ width: 'clamp(24px, 4vw, 30px)', height: 'clamp(24px, 4vw, 30px)' }} />
              </Button>
            )}
            
            {/* Заголовок по центру */}
            <div className="flex-1 flex justify-center items-center" style={{ paddingLeft: 'clamp(36px, 9.6vw, 48px)', paddingRight: 'clamp(36px, 9.6vw, 48px)' }}>
              <CardTitle className="text-white text-center text-xl sm:text-2xl font-medium leading-[1.6em]">
                Создать заявку
              </CardTitle>
                                </div>
            
          </div>
        </CardHeader>
        <CardContent className="space-y-10 sm:space-y-6 pb-16 sm:pb-20 bg-[#040404] text-white" style={{ paddingLeft: 'clamp(20px, 5.33vw, 24px)', paddingRight: 'clamp(20px, 5.33vw, 24px)', paddingTop: 'clamp(12px, 12.8vh, 16px)' }}>
          {/* Описание выбранного офиса (для шага 2) */}
          {currentStep === 2 && selectedOfficeId && (
            <CardDescription className="text-left text-xs sm:text-sm -mb-8 sm:-mb-3" style={{ color: '#6E6E6E' }}>
              Выбрано офис: {offices.find(o => o.id === selectedOfficeId)?.name || ''}
            </CardDescription>
          )}
          {/* Выбор режима создания для executor */}
          {userRole === 'executor' && onModeChange && currentStep === 1 && (
            <div>
              <Label className="flex items-center gap-1 mb-3 text-white">Режим создания</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => onModeChange('create')}
                  className={`flex-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center gap-2 ${
                    createMode === 'create'
                      ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                      : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                  }`}
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Создать заявку</span>
                  <span className="sm:hidden">Обычная</span>
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('createAndComplete')}
                  className={`flex-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg cursor-pointer transition-all text-center font-medium text-[12px] sm:text-[14px] border-2 inline-flex items-center justify-center gap-2 ${
                    createMode === 'createAndComplete'
                      ? 'bg-[#F35713] text-white border-[#F35713] shadow-md'
                      : 'bg-[#1E1E1E] text-white border-[#1E1E1E] hover:border-[#F35713]/50 hover:bg-[#2A2A2A]'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Создать с завершением</span>
                  <span className="sm:hidden">С завершением</span>
                </button>
              </div>
              {createMode === 'createAndComplete' && (
                <p className="text-xs text-gray-400 mt-2">
                  Создайте заявку для уже выполненной работы с отчетом и фотографиями результата
                </p>
              )}
            </div>
          )}

          {/* Рендер текущего шага */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          {formErrors && <p className="text-sm text-red-500">{formErrors}</p>}

          {/* Навигационные кнопки */}
          <div className={`flex gap-3 mt-6 ${currentStep === 1 ? 'justify-end' : ''}`}>
            {currentStep < 4 ? (
              <>
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1 h-[42px] bg-[#1E1E1E] border-2 border-[#1E1E1E] hover:bg-[#2A2A2A] hover:border-[#F35713]/50 rounded-lg flex items-center justify-center gap-1.5"
                    style={{ color: '#6E6E6E' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" style={{ color: '#6E6E6E' }} />
                    <span>Назад</span>
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={`${currentStep === 1 ? 'w-[160px]' : 'flex-1'} h-[42px] bg-[#F35713] hover:bg-[#E04F0F] text-white rounded-lg px-2.5 py-2.5 flex items-center justify-center gap-1.5`}
                >
                  <span className="text-xs font-medium">Дальше</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
                                    </>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              onClick={handleSubmit}
              className="col-span-2 h-[42px] bg-[#F35713] hover:bg-[#E04F0F]"
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
                    ['client', 'executor'].includes(userRole) ? 'Отправить заявку' : 'Отправить заявку'
              )}
            </Button>
             <Button
                 variant="outline"
                 onClick={handleBack}
                 className="h-[42px] bg-[#1E1E1E] border-2 border-[#1E1E1E] hover:bg-[#2A2A2A] hover:border-[#F35713]/50 rounded-lg flex items-center justify-center gap-1.5"
                 style={{ color: '#6E6E6E' }}
               >
                 <ArrowLeft className="w-3.5 h-3.5" style={{ color: '#6E6E6E' }} />
                 <span>Назад</span>
            </Button>
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
                resetForm();
              }}
              className="h-[42px] bg-[#1E1E1E] border-2 border-[#1E1E1E] hover:bg-[#2A2A2A] hover:border-[#F35713]/50 rounded-lg flex items-center justify-center gap-1.5"
                 style={{ color: '#6E6E6E' }}
            >
              Отмена
            </Button>
              </div>
            )}
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
