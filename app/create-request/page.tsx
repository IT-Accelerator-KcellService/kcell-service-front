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
import { Loader2 } from "lucide-react";

interface ServiceCategory {
  id: number;
  name: string;
}

interface Office {
  id: number;
  name: string;
  city: string;
  address: string;
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
        
        // Загружаем офисы для manager
        if (user.role === 'manager') {
          await fetchOffices();
        }
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
    setIsSubmitting(true);
    setFormErrors(null);

    try {
      await api.post('/requests', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast({
        title: "Успешно!",
        description: "Заявка создана успешно",
      });

      handleClose();
    } catch (error: any) {
      console.error('Ошибка создания заявки:', error);
      setFormErrors(error.response?.data?.message || 'Произошла ошибка при создании заявки');
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
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm animate-fade-in">
        <Loader2 className="h-12 w-12 animate-spin text-violet-600" />
        <span className="sr-only">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
