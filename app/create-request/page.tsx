"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateRequestModal } from "@/components/CreateRequestModal";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCategoryStore } from "@/stores/useCategoryStore";
import { useRequestStore } from "@/stores/useRequestStore";
import { useMediaQuery } from "@/hooks/use-media-query";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import FullScreenLoading from "@/components/FullScreenLoading";

interface ServiceCategory {
  id: number;
  name: string;
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

export default function CreateRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  const { user, clearAuth, token } = useAuthStore();
  const { categories, fetchCategories } = useCategoryStore();
  
  const [isOpen, setIsOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [createMode, setCreateMode] = useState<'create' | 'createAndComplete'>('create');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchCategories(token || '');
        
        // Загружаем исполнителей для department-head
        if (user.role === 'department-head') {
          await fetchExecutors();
        }
        
        // Загружаем офисы для всех ролей
        await fetchOffices();
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить данные для создания заявки",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const fetchExecutors = async () => {
    try {
      const response = await api.get('/executors');
      setExecutors(response.data);
    } catch (error) {
      console.error('Ошибка загрузки исполнителей:', error);
    }
  };

  const fetchOffices = async () => {
    try {
      const response = await api.get('/offices');
      setOffices(response.data);
    } catch (error) {
      console.error('Ошибка загрузки офисов:', error);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    if (!user) {
      setFormErrors('Пользователь не авторизован');
      return;
    }

    setIsSubmitting(true);
    setFormErrors(null);

    try {
      let response;
      let newRequestGroup;

      // Ролевая логика создания заявок
      switch (user?.role) {
        case 'client':
          // Клиент: простая отправка заявки
          response = await api.post('/request-groups', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          newRequestGroup = response.data;
          
          toast({
            title: "Успешно!",
            description: "Заявка создана и отправлена на рассмотрение",
          });
          break;

        case 'admin-worker':
          // Админ-работник: создание заявки с уведомлением о назначении
          response = await api.post('/request-groups', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          newRequestGroup = response.data;
          
          toast({
            title: "Заявка создана!",
            description: "Заявка отправлена на назначение исполнителей",
          });
          break;

        case 'department-head':
          // Офис менеджер: создание с возможностью назначения исполнителей
          // Получаем данные из FormData
          const requestType = formData.get('request_type') as string;
          const location = formData.get('location') as string;
          const locationDetail = formData.get('location_detail') as string;
          const status = formData.get('status') as string;
          const subRequestsJson = formData.get('sub_requests') as string;
          const photos = formData.getAll('photos') as File[];
          
          // Парсим подзаявки
          const subRequests = JSON.parse(subRequestsJson);
          
          // Создаем новую FormData для API
          const apiFormData = new FormData();
          apiFormData.append('request_type', requestType);
          apiFormData.append('location', location);
          apiFormData.append('location_detail', locationDetail);
          apiFormData.append('status', status);
          
          // Добавляем подзаявки с исполнителями (статусы уже установлены в компоненте)
          apiFormData.append('sub_requests', JSON.stringify(subRequests));
          
          // Добавляем фото
          photos.forEach(photo => apiFormData.append('photos', photo));

          response = await api.post('/request-groups', apiFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          newRequestGroup = response.data;
          
          // Показываем соответствующее сообщение об успехе
          const hasExecutors = subRequests.some((subReq: any) => subReq.executors && subReq.executors.length > 0);
          if (hasExecutors) {
            toast({
              title: "Заявка создана и исполнители назначены!",
              description: "Заявка успешно создана и передана исполнителям",
            });
          } else {
            toast({
              title: "Заявка создана!",
              description: "Заявка отправлена на рассмотрение администратора",
            });
          }
          break;

        case 'executor':
          // Исполнитель: создание с возможностью завершения
          // Извлекаем after_photos и удаляем их из formData
          const afterPhotos = formData.getAll('after_photos');
          formData.delete('after_photos');

          // Отправляем основной запрос на создание заявки с фото
          response = await api.post('/request-groups', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          newRequestGroup = response.data;

          // Если есть after_photos, загружаем их отдельным запросом
          if (afterPhotos.length > 0) {
            const afterFormData = new FormData();
            afterPhotos.forEach(photo => afterFormData.append('photos', photo));
            afterFormData.append('type', 'after');
            try {
              await api.post(`/request-photos/${newRequestGroup.id}/photos`, afterFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
            } catch (photoError) {
              console.error("Ошибка при загрузке after_photos:", photoError);
            }
          }

          // Показываем сообщение в зависимости от режима
          if (createMode === 'createAndComplete') {
            toast({
              title: "Заявка создана и завершена!",
              description: "Заявка успешно создана, выполнена и закрыта с отчётом",
            });
          } else {
            toast({
              title: "Заявка создана!",
              description: "Заявка успешно создана и взята в работу",
            });
          }
          break;

        case 'manager':
          // Менеджер: создание заявки с полным контролем
          response = await api.post('/request-groups', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          newRequestGroup = response.data;
          
          toast({
            title: "Заявка создана!",
            description: "Заявка успешно создана",
          });
          break;

        default:
          // Стандартная логика для неизвестных ролей
          response = await api.post('/request-groups', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          newRequestGroup = response.data;
          
          toast({
            title: "Успешно!",
            description: "Заявка создана успешно",
          });
          break;
      }

      handleClose();
    } catch (error: any) {
      console.error('Ошибка создания заявки:', error);
      setFormErrors(error.response?.data?.error || error.response?.data?.message || 'Произошла ошибка при создании заявки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Возвращаемся на предыдущую страницу
    router.back();
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const translateType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'normal': 'Обычная',
      'urgent': 'Экстренная',
      'planned': 'Плановая'
    };
    return typeMap[type] || type;
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return <FullScreenLoading />;
  }

  return (
    <div className="min-h-screen bg-[#F3F3F3]">
      <CreateRequestModal
        isOpen={isOpen}
        onClose={handleClose}
        userRole={user.role as 'client' | 'admin-worker' | 'department-head' | 'executor' | 'manager'}
        categories={categories}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        formErrors={formErrors}
        clientLocation=""
        translateType={translateType}
        executors={executors}
        userServiceCategoryId={user.service_category_id}
        createMode={createMode}
        onModeChange={setCreateMode}
        offices={offices}
        isFullScreen={!isDesktop}
      />
    </div>
  );
}
