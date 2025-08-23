"use client"

import React, {useCallback, useEffect, useRef, useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Badge} from "@/components/ui/badge"
import { LeaderIndicator } from "@/components/ui/leader-indicator";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  Plus,
  Star,
  User,
  XCircle,
  Zap,
  Hourglass, ChevronUp, ChevronDown, Users, Calendar as CalendarLucid,
} from "lucide-react"
import Header from "@/app/header/Header";
import api from "@/lib/api";
import {useRouter, useSearchParams} from "next/navigation";
import {useNotificationStore} from "@/stores/notificationStore";
import {useSuccessModal} from "@/hooks/use-success-modal";
import {SuccessModal} from "@/components/success-model";
import {useMediaQuery} from "@/hooks/use-media-query";
import {BottomNav} from "@/components/BottomNav";
import Link from "next/link";
import {ProfileModal} from "@/components/ProfileModal";

import {useRequestStore} from "@/stores/useRequestStore";
import {RequestGroup, SubRequest} from '@/stores/useRequestStore'
import PullToRefresh from "@/components/pull-to-refresh";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import { RoleBasedActionMenu } from "@/components/action-menu";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import {RatingModal} from "@/components/RatingModal";
import {RequestCard} from "@/components/RequestCard";
import {IconInfoModal} from "@/components/IconInfoModal";
import {MapModal} from "@/components/MapModal";
import {CreateRequestModal} from "@/components/CreateRequestModal";
import {CommentsModal} from "@/components/CommentsModal";
import {useRejectRequestModal} from "@/hooks/use-reject-modal";
import {RejectRequestModal} from "@/components/RejectRequestModal";
import {NotificationsSidebar} from "@/components/notification/NotificationsSidebar";
import {CompletedTaskReport} from "@/components/CompletedTaskReport";
import SubRequestInfo from "@/components/SubRequestInfo";
import Executors from "@/components/Executors";

interface Rating {
  id: number;
  rating: number;
  request_id: number;
  created_at: string;
}



interface Stats {
  totalRequests: number,
  activeRequests: number,
  doneRequests: number,
  averageRating: string
}

export default function ClientDashboard() {
  const {role, token, clearAuth, user} = useAuthStore()
  const {categories, fetchCategories, clearCategories} = useCategoryStore()
  const searchParams = useSearchParams()
  const successModal = useSuccessModal()
  const rejectModal = useRejectRequestModal()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("requests")
  const [showCreateRequest, setShowCreateRequest] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<RequestGroup | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<SubRequest | null>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [requestLocation, setRequestLocation] = useState("")
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({});
  const { requests, addRequests, clearRequests, removeRequest } = useRequestStore();

  const [showProfile, setShowProfile] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const { notifications, setNotifications, setNotificationLoading, clearNotifications } = useNotificationStore()
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [requestToDelete, setRequestToDelete] = useState<RequestGroup | null>(null)
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null);
  const [expandedSubRequests, setExpandedSubRequests] = useState<Set<number>>(new Set());
  const [showComments, setShowComments] = useState<number | null>(null);
  const [showIconInfo, setShowIconInfo] = useState<{type: 'status' | 'longTerm', value: string} | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const [pageSize] = useState(10);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [modalStack, setModalStack] = useState<string[]>([]);
  const [isClosingProgrammatically, setIsClosingProgrammatically] = useState(false);

  const lastRequestRef = useCallback((node: HTMLDivElement) => {
    lastElementRef.current = node;
  }, []);

  const filteredRequests = requests
      .filter((request) => {
        const statusMatch = filterStatus === "all" || 
          (filterStatus === "long_term" ? request.requests.some(req => req.is_long_term) : request.status === filterStatus)
        const requestType = request.request_type
        const typeMatch = filterType === "all" || requestType === filterType
        return statusMatch && typeMatch
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_date).getTime();
        const dateB = new Date(b.created_date).getTime();
        // если дата невалидная, ставим приоритет 0
        const safeDateA = isNaN(dateA) ? 0 : dateA;
        const safeDateB = isNaN(dateB) ? 0 : dateB;
        return safeDateB - safeDateA;
      });

  useEffect(() => {
    if (loading) return;

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        fetchRequests(page + 1);
      }
    });

    if (lastElementRef.current) {
      observer.current.observe(lastElementRef.current);
    }
  }, [loading, hasMore, page, filteredRequests]); // добавил filteredRequests

// При заходе на страницу сбросим пагинацию
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchRequests(1);
  }, []);

  const openModal = (name: string) => {
    setModalStack(prev => [...prev, name]);
    window.history.pushState({ modal: name }, '', window.location.pathname);
  };

  const closeModalWithHistory = () => {
    setIsClosingProgrammatically(true);
    const newStack = modalStack.slice(0, -1);
    setModalStack(newStack);

    // Откатываем историю браузера назад
    window.history.back();
  };


  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true); // сработает только на клиенте
  }, []);

  useEffect(() => {
    if (!hydrated) return; // ждём восстановления данных

    if (!user || user.role !== "client") {
      Promise.all([
        clearNotifications,
        clearAuth,
        useStatsStore.getState().resetStats,
        clearRequests,
        clearCategories,
      ])
      router.push("/login");
    } else {
      // пользователь валидный
      setIsLoggedIn(true);
      setCurrentUserId(user.id);
    }
  }, [hydrated, user, router]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Если закрытие происходит программно, сбрасываем флаг и не обрабатываем событие
      if (isClosingProgrammatically) {
        setIsClosingProgrammatically(false);
        return;
      }

      if (modalStack.length > 0) {
        e.preventDefault();
        const lastModal = modalStack[modalStack.length - 1];

        switch (lastModal) {
          case 'createRequest':
            setShowCreateRequest(false);
            break;
          case 'requestDetails':
            setSelectedRequest(null);
            break;
          case 'ratingModal':
            setShowRatingModal(false);
            setRatingValue(0);
            setRequestToRate(null);
            break;
          case 'mapModal':
            setShowMapModal(false);
            break;
          case 'photoPreview':
            setSelectedPhoto(null);
            break;
          case 'notification':
            setIsModalOpen(false);
            break;

          default:
            break;
        }

        // Просто обновляем стек модальных окон без вызова closeModalWithHistory
        setModalStack(prev => prev.slice(0, -1));
      }
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state?.modal) {
      window.history.replaceState({ modal: null }, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [modalStack, isClosingProgrammatically]);
  const closeAllModalsExcept = (modalName: string) => {
    if (modalName !== 'createRequest') {
      setShowCreateRequest(false);
    }
    if (modalName !== 'requestDetails') {
      setSelectedRequest(null);
    }
    if (modalName !== 'mapModal') {
      setShowMapModal(false);
    }
    if (modalName !== 'photoPreview') {
      setSelectedPhoto(null);
    }
    if (modalName !== 'notification') {
      setIsModalOpen(false);
    }


    setModalStack([modalName]);
    // Используем pushState вместо replaceState для правильной работы истории
    window.history.pushState({ modal: modalName }, '', window.location.pathname);
  };

  useEffect(() => {
    if (notifications.length > 0) {
      setNotificationLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      setNotificationLoading(true)
      fetchNotifications()
    }
  }, [isLoggedIn])

  const fetchStats = async () => {
    try {
      const res = await api.get("/analytics/stats/client");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (!stats) {
      fetchStats()
    }
  }, []);

  useEffect(() => {
    const create = searchParams.get("createRequest")

    if (create === "true") {
      // Всегда добавляем createRequest в стек и историю
      setModalStack(['createRequest']);
      window.history.pushState({ modal: 'createRequest' }, '', window.location.pathname);
      setShowCreateRequest(true);
    }
    if(create === "false") {
      setShowCreateRequest(false)
      // Просто обновляем стек модальных окон
      setModalStack(prev => prev.filter(modal => modal !== 'createRequest'));
    }
  }, [searchParams])

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/me?page=1&pageSize=5')
      setNotifications(res.data.notifications)
    } catch (error) {
      console.error('Ошибка при загрузке уведомлений:', error)
    } finally {
      setNotificationLoading(false)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    setSelectedNotification(notification)
    setIsModalOpen(true);
    openModal('notification');
    if (!notification.is_read) {
      try {
        const updatedNotifications = notifications.map((n:any) =>
            n.id === notification.id ? { ...n, is_read: true } : n
        )
        setNotifications(updatedNotifications)
        await api.patch(`/notifications/${notification.id}/read`)
      } catch (error) {
        const updatedNotifications = notifications.map((n:any) =>
            n.id === notification.id ? { ...n, is_read: false } : n
        )
        setNotifications(updatedNotifications)
        console.error("Ошибка при пометке уведомления как прочитано", error)
      }
    }
  }

  const handleDeleteRequest = (request: RequestGroup) => {
    setRequestToDelete(request)
    setShowDeleteRequestModal(true);
    openModal('deleteRequest');
  }

  const handleDeleteSubRequest = async (subRequest: SubRequest) => {
    try {
      await api.delete(`/requests/${subRequest.id}`)

      // Обновляем состояние - удаляем под заявку из группы
      if (selectedRequest) {
        const updatedRequests = selectedRequest.requests.filter(req => req.id !== subRequest.id)
        const updatedRequestGroup = {
          ...selectedRequest,
          requests: updatedRequests
        }
        setSelectedRequest(updatedRequestGroup)

        // Обновляем в store
        const currentRequests = useRequestStore.getState().requests
        const updatedStoreRequests = currentRequests.map(req =>
          req.id === selectedRequest.id ? updatedRequestGroup : req
        )
        useRequestStore.getState().setRequests(updatedStoreRequests)

        // Если это была последняя под заявка в группе, закрываем модальное окно
        if (updatedRequests.length === 0) {
          setSelectedRequest(null);
          closeModalWithHistory();
        }
      }

      successModal.showSuccess({
        title: "Под заявка удалена",
        message: "Под заявка была успешно удалена."
      })
    } catch (error) {
      console.error("Error deleting sub-request:", error)
      successModal.showSuccess({
        title: "Ошибка",
        message: "Не удалось удалить под заявку."
      })
    }
  }

  const confirmDeleteRequest = async () => {
    if (requestToDelete) {
      setDeleteLoading(true)
      try {
        await api.delete(`/request-groups/${requestToDelete.id}`)
        
        // Удаляем заявку из локального состояния сразу
        removeRequest(requestToDelete.id);
        
        // Закрываем все модальные окна
        setSelectedRequest(null);
        setRequestToDelete(null);
        setShowDeleteRequestModal(false);
        successModal.showSuccess({
          title: "Заявка удалена",
          message: "Заявка была успешно удалена."
        })
      } catch (error) {
        console.error("Failed to delete request group:", error)
        successModal.showSuccess({
          title: "Ошибка",
          message: "Не удалось удалить заявку."
        })
      } finally {
        setDeleteLoading(false)
      }
    }
  }

  const fetchRequests = async (pageToFetch = page) => {
    try {
      setLoading(true);
      const response = await api.get(`/request-groups?page=${pageToFetch}&pageSize=${pageSize}`);

      const newRequestGroups = response.data.requests ?? [];

      addRequests(newRequestGroups);

      if (newRequestGroups.length < pageSize) {
        setHasMore(false);
      }

      setPage(pageToFetch);

      // Проверка оценки для каждой под заявки
      newRequestGroups.forEach((requestGroup: RequestGroup) => {
        requestGroup.requests.forEach((subRequest: SubRequest) => {
          if (subRequest.status === "completed") {
            checkUserRating(subRequest.id);
          }
        });
      });

    } catch (error) {
      console.error("Failed to fetch request groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserRating = async (requestId: number) => {
    try {
      const response = await api.get(`/ratings/user/${requestId}`);
      if (response.data) {
        setUserRatings(prev => ({
          ...prev,
          [requestId]: response.data[0]
        }));
      }
    } catch (error) {
      console.error("Failed to check user rating:", error);
    }
  };

  useEffect(() => {
    if (requests.length === 0) {
      fetchRequests(1)
    }
  }, [])

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
      case "Экстренная":
        return "bg-red-500"
      case "normal":
      case "regular":
      case "Обычная":
        return "bg-blue-500"
      case "planned":
      case "Плановая":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }
  const translateStatus = (status: string) => {
    switch (status) {
      case "draft": return "Черновик";
      case "in_progress": return "В обработке";
      case "execution": return "Исполнение";
      case "completed": return "Завершено";
      case "rejected": return "Отклонено";
      case "awaiting_assignment": return "Ожидание назначения";
      case "assigned": return "назначенный";
      default: return status;
    }
  };

  const translateComplexity = (complexity: string) => {
    switch (complexity) {
      case "complex": return "комплексный";
      case "simple": return "простой";
      case "medium": return "средний";
      default: return complexity;
    }
  };

  const translateType = (type: string) => {
    switch (type) {
      case "urgent": return "Экстренная";
      case "normal": return "Обычная";
      case "planned": return "Плановая";
      default: return type;
    }
  };

  const handleOpenCreateRequest = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            setRequestLocation(`Широта: ${latitude.toFixed(5)}, Долгота: ${longitude.toFixed(5)} (±${Math.round(accuracy)} м)`);
          },
          (error: GeolocationPositionError) => {
            console.error("Ошибка геолокации:", {
              code: error.code,
              message: error.message
            });

            switch (error.code) {
              case error.PERMISSION_DENIED:
                setRequestLocation("Доступ к геолокации запрещён");
                break;
              case error.POSITION_UNAVAILABLE:
                setRequestLocation("Информация о местоположении недоступна");
                break;
              case error.TIMEOUT:
                setRequestLocation("Превышено время ожидания определения местоположения");
                break;
              default:
                setRequestLocation("Не удалось определить местоположение");
            }
          }
          ,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
      );
    } else {
      setRequestLocation("Ваш браузер не поддерживает геолокации");
    }

    setShowCreateRequest(true);
    openModal('createRequest');
  };
  const getRatingLabel = (doneRequests: number): string => {
    if (doneRequests >= 20) return "Platinum"
    if (doneRequests >= 10) return "Gold"
    if (doneRequests >= 5) return "Silver"
    return "Bronze"
  }

  const handleCreateRequest = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors(null);

    try {
      const response = await api.post('/request-groups', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newRequestGroup = response.data;

      // Обновляем состояние
      addRequests([newRequestGroup]);
      successModal.showSuccess();

      // Сброс формы
      resetForm();
    } catch (error: any) {
      console.error("Ошибка при создании группы заявок:", error);
      setFormErrors(
          error.response?.data?.error || "Не удалось создать заявку. Повторите попытку."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowCreateRequest(false);
    closeModalWithHistory()
    setRequestLocation("");
    setFormErrors(null);
  };

  const handleRateExecutor = async () => {
    if (requestToRate && ratingValue > 0) {
      try {
        const response = await api.post(`/ratings`, {
          rating: ratingValue,
          request_id: requestToRate.id
        })
        setUserRatings(prev => ({
          ...prev,
          [requestToRate.id]: response.data
        }));
        setShowRatingModal(false)
        setRatingValue(0)
        setRequestToRate(null)
        closeModalWithHistory()
      } catch (error) {
        rejectModal.showReject({
          title: "Ошибка",
          message: "Недоступно для оценки"
        })
        console.error("Failed to rate executor:", error);
        setShowRatingModal(false);
        closeModalWithHistory();
        setRatingValue(0)
        setRequestToRate(null)
      }
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoggedIn(false)
      router.push("/login")

      Promise.all([
        clearNotifications,
        clearAuth,
        useStatsStore.getState().resetStats,
        clearRequests,
        clearCategories,
      ])
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-emerald-500 text-white border-emerald-500"
      case "in_progress":
      case "execution":
        return "bg-purple-500 text-white border-purple-500"
      case "awaiting_assignment":
      case "awaiting_sla":
        return "bg-amber-400 text-gray-900 border-amber-400"
      case "assigned":
        return "bg-violet-500 text-white border-violet-500"
      case "rejected":
        return "bg-red-500 text-white border-red-500"
      default:
        return "bg-gray-400 text-white border-gray-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="w-3 h-3" />
      case "in_progress":
      case "execution":
        return <Zap className="w-3 h-3" />
      case "awaiting_assignment":
      case "awaiting_sla":
        return <Clock className="w-3 h-3" />
      case "assigned":
        return <User className="w-3 h-3" />
      case "rejected":
        return <XCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity?.toLowerCase()) {
      case "complex":
        return "bg-gradient-to-r from-red-500 to-pink-500 text-white border-red-500"
      case "medium":
        return "bg-gradient-to-r from-orange-400 to-yellow-400 text-gray-900 border-orange-400"
      case "simple":
        return "bg-gradient-to-r from-purple-400 to-violet-400 text-white border-purple-400"
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-400"
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < rating ? "fill-purple-400 text-purple-400" : "text-gray-300"}`} />
    ))
  }

  const renderStatusWithTooltip = (status: string) => {
    const icon = getStatusIcon(status);
    const text = translateStatus(status);

    if (isDesktop) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                {icon}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{text}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      return (
        <div
          className="flex items-center gap-1 cursor-pointer p-1 rounded"
          onClick={() => setShowIconInfo({type: 'status', value: text})}
        >
          {icon}
        </div>
      );
    }
  };

  const renderLongTermWithTooltip = (isLongTerm: boolean) => {
    if (!isLongTerm) return null;

    if (isDesktop) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                <Hourglass className="w-3 h-3 text-blue-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Долгосрочная задача</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
    return (
      <div
          className="flex items-center gap-1 cursor-pointer p-1 rounded"
          onClick={() => setShowIconInfo({type: 'longTerm', value: 'Долгосрочная задача'})}
        >
          <Hourglass className="w-3 h-3 text-blue-600" />
      </div>
    );
    }
  };

  const handleRefresh = async () => {
    try {
      setPage(1);
      setHasMore(true);
      setFilterStatus("all");
      setFilterType("all");

      clearRequests();
      clearNotifications()
      setStats(null);
      setUserRatings({});

      // 4. Параллельная загрузка всех данных
      await Promise.all([
        fetchRequests(1),
        fetchStats(),
        fetchCategories(token!),
        fetchNotifications(),
      ]);

    } catch (error) {
      console.error("Ошибка при обновлении:", error);
    }
  };

  const renderCardHeader = (requestGroup: RequestGroup) => {
    const isLongTerm = requestGroup.requests.some(req => req.is_long_term);
    const totalSubRequests = requestGroup.requests.length;

    return (
        <CardHeader className={`pb-3 px-5 pt-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-bold text-base leading-tight line-clamp-2 text-gray-900`}>
                  Заявка #{requestGroup.id}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-purple-600 bg-purple-50`}>
                {totalSubRequests} под заявок
              </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isLongTerm ? 'text-indigo-700 bg-indigo-100' : 'text-gray-600 bg-gray-100'}`}>
                {requestGroup.request_type === 'urgent' ? 'Экстренная' : requestGroup.request_type === 'planned' ? 'Плановая' : 'Обычная'}
              </span>
              </div>
            </div>
            <div className="flex gap-1 items-center">
              {renderStatusWithTooltip(requestGroup.status)}
              {isLongTerm && renderLongTermWithTooltip(true)}
              <RoleBasedActionMenu
                  request={requestGroup}
                  isDesktop={isDesktop}
                  userRole="client"
                  isSubRequest={false}
                  onViewDetails={(request) => {
                    setSelectedRequest(request);
                    openModal('requestDetails');
                  }}
                  onRateRequest={(subReq) => {
                    setRequestToRate(subReq)
                    setShowRatingModal(true)
                    openModal('ratingModal')
                    setSelectedRequest(null);
                    closeModalWithHistory()
                  }}
                  onDelete={(request) => {
                    handleDeleteRequest(request);
                    setShowDeleteRequestModal(true);
                  }}
              />
            </div>
          </div>
        </CardHeader>
    );
  };

  return (
      <>
        {/* Header */}
        <Header
            setShowProfile={setShowProfile}
            handleLogout={handleLogout}
            notificationCount={notifications.length}
            role="Клиент"
        />
        <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8">
        {/* Quick Stats */}
        {isDesktop ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Активные заявки</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats && stats.activeRequests? (
                            stats.activeRequests
                        ): 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Завершено</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats && stats.doneRequests ? (
                            stats.doneRequests
                        ): 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Star className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Средняя оценка исполнителей</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats && stats.averageRating ? (
                            stats.averageRating
                        ): 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Рейтинг</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {getRatingLabel(stats && stats.doneRequests ? (
                            stats.doneRequests
                        ): 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
        ): null}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="mb-6">
                {/* на телефоне кнопка сверху */}
                <div className="flex flex-col sm:hidden gap-3 mb-4">
                  {isDesktop ? (
                      <Button
                          onClick={() => router.push('/create-request')}
                          className="bg-violet-600 hover:bg-violet-700 w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Создать заявку
                      </Button>
                  ): null}
                  <TabsList>
                    <TabsTrigger value="requests">Мои заявки</TabsTrigger>
                    <TabsTrigger value="statistics">Статистика</TabsTrigger>
                  </TabsList>
                </div>

                {/* на больших экранах как было */}
                <div className="hidden sm:flex justify-between items-center">
                  <TabsList>
                    <TabsTrigger value="requests">Мои заявки</TabsTrigger>
                    <TabsTrigger value="statistics">Статистика</TabsTrigger>
                  </TabsList>
                  <Button
                      onClick={() => router.push('/create-request')}
                      className="bg-violet-600 hover:bg-violet-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать заявку
                  </Button>
                </div>
              </div>

              <TabsContent value="requests">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="in_progress">В обработке</SelectItem>
                        <SelectItem value="awaiting_assignment">Ожидает назначение</SelectItem>
                        <SelectItem value="assigned">Назначен</SelectItem>
                        <SelectItem value="execution">Исполнение</SelectItem>
                        <SelectItem value="completed">Завершено</SelectItem>
                        <SelectItem value="long_term">Долгосрочные</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Тип заявки" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="normal">Обычная</SelectItem>
                        <SelectItem value="urgent">Экстренная</SelectItem>
                        <SelectItem value="planned">Плановая</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRequests.map((requestGroup, index) => {
                      const isLast = index === filteredRequests.length - 1;
                      return (
                          <RequestCard
                              key={`incoming-${requestGroup.id}`}
                              request={requestGroup}
                              onCardClick={(request) => {
                                setSelectedRequest(request);
                                openModal('requestDetails');
                              }}
                              renderCardHeader={renderCardHeader}
                              isLast={isLast}
                              lastElementRef={lastRequestRef}
                          />
                      );})}
                  </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="statistics">
                    <Card>
                      <CardHeader>
                        <CardTitle>Статистика по заявкам</CardTitle>
                        <CardDescription>Ваша активность</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Всего подано заявок</span>
                            <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests): 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Завершено успешно</span>
                            <span className="font-bold text-green-600">
                              {stats && stats.doneRequests ? (stats.doneRequests) : 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Средняя оценка исполнителей</span>
                            <span className="font-bold">
                              {stats && stats.averageRating ? (stats.averageRating) : 0}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>


            {/* Sidebar */}
            <div className="space-y-6 mb-20">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <NotificationsSidebar onNotificationClick={handleNotificationClick} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
    </div>
      </PullToRefresh>
  <BottomNav

      activeTab ="history"
      hidden={showCreateRequest || !!selectedRequest || showMapModal || showRatingModal || showProfile || isModalOpen || !!selectedPhoto || showDeleteRequestModal}
  />
        {/* Request Details Modal */}
        {selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => {
              setSelectedRequest(null)
              setShowComments(null)
            }}>
              <Card className={`w-full ${isDesktop ? 'max-w-2xl' : 'max-w-full h-full'} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle className="font-medium text-gray-900">Заявка #{selectedRequest.id}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-16">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium text-gray-900">Тип заявки</Label>
                      <Badge className={getTypeColor(selectedRequest.request_type)}>{translateType(selectedRequest.request_type)}</Badge>
                    </div>
                    <div>
                      <Label className="font-medium text-gray-900">Статус</Label>
                      <Badge className={getStatusColor(selectedRequest.status)}>{translateStatus(selectedRequest.status)}</Badge>
                    </div>
                  </div>

                  {/* Показываем запланированное время для плановых заявок */}
                  {selectedRequest.request_type === 'planned' && selectedRequest.planned_date && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <CalendarLucid className="w-4 h-4 text-blue-600" />
                  <div>
                          <Label className="text-sm font-medium text-blue-800">Запланировано на: </Label>
                          <span className="text-sm text-blue-700">
                          {new Date(selectedRequest.planned_date).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                  </div>
                      </div>
                  )}

                  {/* Под заявки */}
                  <div>
                    <Label className={isDesktop ? '' : 'text-base font-medium'}>Под заявки</Label>
                    <div className={`space-y-3 mt-2 ${isDesktop ? '' : 'space-y-4'}`}>
                      {selectedRequest.requests.map((subRequest: SubRequest) => {
                        const isExpanded = expandedSubRequests.has(subRequest.id);
                        const hasComments = showComments === subRequest.id;

                        return (
                            <div key={subRequest.id} className={`border rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 ${isDesktop ? 'border-gray-200' : 'border-gray-200'}`}>
                              {/* Заголовок под заявки */}
                              <div className={`p-5 ${isDesktop ? '' : 'p-5'}`}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className={`font-semibold text-gray-900 ${isDesktop ? 'text-base' : 'text-md'}`}>{subRequest.title}</h4>
                                    </div>
                                    <div className={`${isDesktop ? 'flex items-center gap-3' : 'flex flex-col gap-1'} text-gray-600 ${isDesktop ? 'text-sm' : 'text-base'}`}>
                                      <span className={`${isDesktop ? 'truncate' : ''} flex items-center gap-1`}>
                                        <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                        {subRequest.category?.name || 'Без категории'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {renderStatusWithTooltip(subRequest.status)}
                                    {renderLongTermWithTooltip(subRequest.is_long_term || false)}

                                    {/* Кнопка комментариев */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`${isDesktop ? 'h-8 w-8' : 'h-10 w-10'} p-0 hover:bg-purple-50`}
                                        onClick={() => {
                                          if (hasComments) {
                                            setShowComments(null);
                                          } else {
                                            setShowComments(subRequest.id);
                                          }
                                        }}
                                    >
                                      <MessageCircle className={`${isDesktop ? 'h-4 w-4' : 'h-5 w-5'} ${hasComments ? 'text-purple-600' : 'text-gray-500'}`} />
                                    </Button>

                                    <RoleBasedActionMenu
                                        request={subRequest}
                                        requestGroup={selectedRequest}
                                        isDesktop={isDesktop}
                                        userRole="client"
                                        isSubRequest={true}
                                        onRateRequest={(subReq) => {
                                          setRequestToRate(subReq)
                                          setShowRatingModal(true)
                                          openModal('ratingModal')
                                          setSelectedRequest(null);
                                          closeModalWithHistory()
                                        }}
                                        onDelete={(subReq) => {
                                          handleDeleteSubRequest(subReq);
                                        }}
                                    />
                                  </div>
                                </div>

                                {/* Краткое описание */}
                                <div className={`text-gray-600 mb-3 ${isDesktop ? 'text-sm' : 'text-base leading-relaxed'}`}>
                                  {isDesktop ? (
                                      <p className="line-clamp-2">{subRequest.description}</p>
                                  ) : (
                                      <p className="whitespace-pre-wrap break-words">{subRequest.description}</p>
                                  )}
                                </div>

                                {/* Кнопка раскрытия */}
                                {subRequest.status !== 'in_progress' && (
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      className={`w-full justify-center ${isDesktop ? 'text-sm' : 'text-base py-2'}`}
                                      onClick={() => {
                                        const newExpanded = new Set(expandedSubRequests);
                                        if (isExpanded) {
                                          newExpanded.delete(subRequest.id);
                                        } else {
                                          newExpanded.add(subRequest.id);
                                        }
                                        setExpandedSubRequests(newExpanded);
                                      }}
                                  >
                                      {isExpanded ? (
                                          <>
                                            <ChevronUp className="w-4 h-4 mr-2" />
                                            Свернуть
                                          </>
                                      ) : (
                                          <>
                                            <ChevronDown className="w-4 h-4 mr-2" />
                                            Подробнее
                                          </>
                                      )}
                                  </Button>
                                )}

                              </div>

                              {/* Раскрытая информация */}
                              {isExpanded && (
                                  <div className={`border-t bg-gradient-to-br from-gray-50 to-gray-100 ${isDesktop ? 'p-4' : 'p-5'}`}>
                                    {/* Основная информация */}
                                    <SubRequestInfo subRequest={subRequest} />

                                    {/* Исполнители */}
                                    <Executors subRequest={subRequest} />

                                    {/* Отчет о выполнении для завершенных подзаявок */}
                                    {subRequest.status === "completed" && (
                                        <CompletedTaskReport
                                            subRequest={subRequest}
                                            isDesktop={isDesktop}
                                            onPhotoClick={(photoUrl) => {
                                              setSelectedPhoto(photoUrl);
                                              openModal('photoPreview');
                                            }}
                                        />
                                    )}
                                  </div>
                              )}
                            </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">Локация в офисе</Label>
                    <p className="text-sm">{selectedRequest.location_detail}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const locText = selectedRequest.location;
                            const latMatch = locText.match(/Широта: (-?\d+\.\d+)/);
                            const lonMatch = locText.match(/Долгота: (-?\d+\.\d+)/);
                            const accMatch = locText.match(/±(\d+) м/);

                            if (latMatch && lonMatch && accMatch) {
                              setMapLocation({
                                lat: parseFloat(latMatch[1]),
                                lon: parseFloat(lonMatch[1]),
                                accuracy: parseInt(accMatch[1])
                              });
                              setShowMapModal(true);
                              openModal('mapModal');
                            } else {
                              alert("Не удалось определить координаты из локации");
                            }
                          }}
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        Показать на карте
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(selectedRequest.created_date).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>

                  {/* Фотографии группы заявок (только before) */}
                  {selectedRequest.photos && selectedRequest.photos.filter((photo: any) => photo.type === 'before').length > 0 && (
                        <div className="mt-4">
                        <Label className="font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">Фотографии (до выполнения)</Label>
                                <div className="flex space-x-2 mt-2 flex-wrap">
                          {selectedRequest.photos
                              .filter((photo: any) => photo.type === 'before')
                              .map((photo: any, index: number) => (
                                      <img
                                          key={index}
                                          src={photo.photo_url || "/placeholder.svg"}
                                      alt={`Фото ${index + 1}`}
                                      className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-purple-400 transition-colors"
                                      onClick={() => {
                                        setSelectedPhoto(photo.photo_url);
                                        openModal('photoPreview');
                                      }}
                                      onError={(e) => {
                                        e.currentTarget.src = "/placeholder.svg";
                                      }}
                                      />
                                  ))}
                                </div>
                      </div>
                  )}

                  {/* Фотографии группы заявок (только before) */}
                  {selectedRequest.photos && selectedRequest.photos.filter((photo: any) => photo.type === 'after').length > 0 && (
                      <div className="mt-4">
                        <Label className="font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">Фотографии (после выполнения)</Label>
                              <div className="flex space-x-2 mt-2 flex-wrap">
                          {selectedRequest.photos
                              .filter((photo: any) => photo.type === 'after')
                              .map((photo: any, index: number) => (
                                    <img
                                        key={index}
                                        src={photo.photo_url || "/placeholder.svg"}
                                      alt={`Фото ${index + 1}`}
                                      className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-purple-400 transition-colors"
                                      onClick={() => {
                                        setSelectedPhoto(photo.photo_url);
                                        openModal('photoPreview');
                                      }}
                                      onError={(e) => {
                                        e.currentTarget.src = "/placeholder.svg";
                                      }}
                                    />
                                ))}
                              </div>
                        </div>
                  )}

                  {/* Модальное окно */}
                  {selectedPhoto && (
                      <div
                          className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
                          onClick={() => {setSelectedPhoto(null); closeModalWithHistory(); }}
                      >
                        <img
                            src={selectedPhoto}
                            alt="Увеличенное фото"
                            className="max-w-full max-h-full rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                  )}




                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => {
                      setSelectedRequest(null);
                      closeModalWithHistory();
                    }}>
                      Закрыть
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
        )}

        {/* Map Modal */}
        <MapModal
          isOpen={showMapModal}
          onClose={() => {
            setShowMapModal(false);
            closeModalWithHistory();
          }}
          mapLocation={mapLocation}
        />
        {/* Rating Modal */}
        <RatingModal
            isOpen={showRatingModal && !!requestToRate}
            onClose={() => {
              setShowRatingModal(false);
              closeModalWithHistory();
              setRatingValue(0);
              setRequestToRate(null);
            }}
            ratingValue={ratingValue}
            onRatingChange={setRatingValue}
            onSubmit={handleRateExecutor}
        />

        {/* Модалка */}
        {isModalOpen && selectedNotification && (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                onClick={() => {
                  setIsModalOpen(false);
                  closeModalWithHistory();
                }}
            >
              <div
                  className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
                  onClick={(e) => e.stopPropagation()} // Останавливаем всплытие только внутри моталки
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">{selectedNotification.title}</h2>
                  <button
                      className="text-gray-500 hover:text-black text-2xl focus:outline-none"
                      onClick={() => {
                        setIsModalOpen(false);
                        closeModalWithHistory();
                      }}
                      aria-label="Закрыть модальное окно"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-line">
                  {selectedNotification.content}
                </p>
                <p className="text-xs text-gray-500 mt-4">
                  Получено: {new Date(selectedNotification.created_at).toLocaleString()}
                </p>
              </div>
            </div>
        )}

        {/* Create Request Modal */}
        <CreateRequestModal
          isOpen={showCreateRequest}
          onClose={() => {
            setShowCreateRequest(false);
            // Удаляем createRequest из стека модальных окон
            setModalStack(prev => prev.filter(modal => modal !== 'createRequest'));
          }}
          userRole="client"
          categories={categories}
          onSubmit={handleCreateRequest}
          isSubmitting={isSubmitting}
          formErrors={formErrors}
          clientLocation={requestLocation}
        />

        {/* Delete Request Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteRequestModal && !!requestToDelete}
          onClose={() => {
            setShowDeleteRequestModal(false);
            closeModalWithHistory();
            setRequestToDelete(null);
          }}
          isLoading={deleteLoading}
          onConfirm={confirmDeleteRequest}
          title={`Удалить заявку #${requestToDelete?.id}?`}
          description={`Вы уверены, что хотите удалить заявку "${requestToDelete?.requests[0]?.title || 'Заявка'}"? Это действие необратимо.`}
        />

        {/* Comments Modal */}
        <CommentsModal
          isOpen={!!showComments}
          onClose={() => {
            setShowComments(null);
          }}
          requestId={showComments}
          currentUserId={currentUserId}
          isDesktop={isDesktop}
        />

        <SuccessModal
            isOpen={successModal.isOpen}
            onClose={successModal.hideSuccess}
            title={successModal.title}
            message={successModal.message}
            duration={successModal.duration}
        />
        <RejectRequestModal
            isOpen={rejectModal.isOpen}
            onClose={rejectModal.hideReject}
            title={rejectModal.title}
            message={rejectModal.message}
            duration={rejectModal.duration}
        />
        {/* Модальное окно информации об иконках */}
        <IconInfoModal
          isOpen={!!showIconInfo}
          onClose={() => setShowIconInfo(null)}
          iconInfo={showIconInfo}
          isDesktop={isDesktop}
        />

        {isDesktop && <Link
            href="/chat-bot"
            className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-14 h-14 bg-purple-100 text-purple-600 rounded-full shadow-lg hover:bg-purple-200 transition"
        >
          <MessageCircle className="w-7 h-7" />

        </Link>}
  </>
  )
}
