"use client"

import React, {useCallback, useEffect, useRef, useState, useMemo} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Badge} from "@/components/ui/badge"
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
  Hourglass,
  ChevronUp,
  ChevronDown,
  Users,
  Calendar as CalendarLucid,
  Building2,
  BarChart3,
  Settings,
  Wrench,
  Bell,
  Ruler,
  Activity,
} from "lucide-react"
import Header from "@/app/header/Header";
import api, { getOffices } from "@/lib/api";
import {useRouter, useSearchParams} from "next/navigation";
import {useNotificationStore} from "@/stores/notificationStore";
import { useToast } from "@/hooks/use-toast";
import {useMediaQuery} from "@/hooks/use-media-query";
import {BottomNav} from "@/components/BottomNav";
import Link from "next/link";
import Image from "next/image";

import {useRequestStore} from "@/stores/useRequestStore";
import {RequestGroup, SubRequest} from '@/stores/useRequestStore'
import PullToRefresh from "@/components/pull-to-refresh";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import { RoleBasedActionMenu } from "@/components/action-menu/RoleBasedActionMenu";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import {RatingModal} from "@/components/RatingModal";
import {RequestCard} from "@/components/RequestCard";
import {IconInfoModal} from "@/components/IconInfoModal";
import {getSubRequestDisplayId} from "@/lib/subRequestUtils";
import { createClickableRequestIds } from '@/lib/notificationUtils';
import { RequestNotFoundModal } from '@/components/RequestNotFoundModal';
import { getPreviewUrl } from '@/lib/imageOptimization';
import {MapModal} from "@/components/MapModal";
import {CreateRequestModal} from "@/components/CreateRequestModal";
import {CommentsModal} from "@/components/CommentsModal";
import {useRejectRequestModal} from "@/hooks/use-reject-modal";
import {RejectRequestModal} from "@/components/RejectRequestModal";
import {NotificationsSidebar} from "@/components/notification/NotificationsSidebar";
import {CompletedTaskReport} from "@/components/CompletedTaskReport";
import SubRequestInfo from "@/components/SubRequestInfo";
import Executors from "@/components/Executors";
import PhotoModal from "@/components/photo/PhotoModal";
import { MeetingRoomsCatalog } from "@/components/meeting-rooms/MeetingRoomsCatalog";
import { MeetingRoomStatistics } from "@/components/meeting-rooms/MeetingRoomStatistics";
import { DeskHeightCalculator } from "@/components/meeting-rooms/DeskHeightCalculator";
import { ClientSmartHomeControl } from "@/components/yandex-smart-home/ClientSmartHomeControl";

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
  averageRating: string,
  totalRatings: number
}

export default function ClientDashboard() {
  // Optimized Zustand selectors to prevent unnecessary re-renders
  const role = useAuthStore(state => state.role)
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const categories = useCategoryStore(state => state.categories)
  const fetchCategories = useCategoryStore(state => state.fetchCategories)
  const clearCategories = useCategoryStore(state => state.clearCategories)
  const requests = useRequestStore(state => state.requests)
  const addRequests = useRequestStore(state => state.addRequests)
  const clearRequests = useRequestStore(state => state.clearRequests)
  const removeRequest = useRequestStore(state => state.removeRequest)
  
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const rejectModal = useRejectRequestModal()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("meeting-rooms")
  const [requestsTab, setRequestsTab] = useState<"create" | "my-requests">("create")
  const [showCreateRequest, setShowCreateRequest] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<RequestGroup | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showNotFoundModal, setShowNotFoundModal] = useState(false)
  const [notFoundRequestId, setNotFoundRequestId] = useState<string>('')
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<SubRequest | null>(null)
  const [ratingComment, setRatingComment] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [requestLocation, setRequestLocation] = useState("")
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({});
  const [clientRatings, setClientRatings] = useState<Record<number, any>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, created_at?: string} | null>(null);
  const notifications = useNotificationStore(state => state.notifications)
  const setNotifications = useNotificationStore(state => state.setNotifications)
  const setNotificationLoading = useNotificationStore(state => state.setNotificationLoading)
  const clearNotifications = useNotificationStore(state => state.clearNotifications)
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
  
  // Обработка query параметра tab для установки активной вкладки
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "requests" || tab === "statistics" || tab === "meeting-rooms") {
      setActiveTab(tab)
    }
    // По умолчанию остается meeting-rooms (бронирование)
  }, [searchParams])
  
  const [modalStack, setModalStack] = useState<string[]>([]);
  const [isClosingProgrammatically, setIsClosingProgrammatically] = useState(false);
  const [offices, setOffices] = useState<any[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<any | null>(null);
  const [meetingRoomsTab, setMeetingRoomsTab] = useState<"book" | "my-bookings" | "smart-home">("book");
  const [showDeskCalculator, setShowDeskCalculator] = useState(false);

  const lastRequestRef = useCallback((node: HTMLDivElement | null) => {
    lastElementRef.current = node;
  }, []);

  const filteredRequests = useMemo(() => requests
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
      }), [requests, filterStatus, filterType]);

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
  }, [loading, hasMore, page]);

// При заходе на страницу сбросим пагинацию
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchRequests(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = useCallback((name: string) => {
    setModalStack(prev => [...prev, name]);
    window.history.pushState({ modal: name }, '', window.location.pathname);
  }, []);

  const closeModalWithHistory = useCallback(() => {
    setIsClosingProgrammatically(true);
    setModalStack(prev => {
      const newStack = prev.slice(0, -1);
      // Откатываем историю браузера назад
      window.history.back();
      return newStack;
    });
  }, []);


  // Функция для закрытия модалки без использования window.history.back()
  // Используется при закрытии через X кнопку, чтобы не выходить из сайта
  const closeModal = useCallback(() => {
    setIsClosingProgrammatically(true);
    setModalStack(prev => {
      if (prev.length === 0) return prev;
      
      const lastModal = prev[prev.length - 1];
      const newStack = prev.slice(0, -1);
      
      // Закрываем соответствующее модальное окно
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
          setRatingComment("");
          break;
        case 'mapModal':
          setShowMapModal(false);
          break;
        case 'photoPreview':
          setSelectedPhoto(null);
          break;
        case 'notification':
          setIsModalOpen(false);
          setSelectedNotification(null);
          break;
        case 'deleteRequest':
          setShowDeleteRequestModal(false);
          setRequestToDelete(null);
          break;
        default:
          break;
      }
      
      // Обновляем историю асинхронно, чтобы не вызывать обновление Router во время рендеринга
      setTimeout(() => {
        if (newStack.length > 0) {
          window.history.replaceState({ modal: newStack[newStack.length - 1] }, '', window.location.pathname);
        } else {
          window.history.replaceState({ modal: null }, '', window.location.pathname);
        }
        setIsClosingProgrammatically(false);
      }, 0);
      
      return newStack;
    });
  }, []);


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
            setRatingComment("");
            break;
          case 'mapModal':
            setShowMapModal(false);
            break;
          case 'photoPreview':
            setSelectedPhoto(null);
            break;
          case 'notification':
            setIsModalOpen(false);
            setSelectedNotification(null);
            break;
          case 'deleteRequest':
            setShowDeleteRequestModal(false);
            setRequestToDelete(null);
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
    if (modalName !== 'ratingModal') {
      setShowRatingModal(false);
      setRatingValue(0);
      setRequestToRate(null);
      setRatingComment("");
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
    fetchOffices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Сохраняем requestId в state при первой загрузке
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [pendingSubRequestId, setPendingSubRequestId] = useState<string | null>(null);

  // Обработка query параметров для открытия заявки
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestIdFromUrl = urlParams.get("requestId");
    const subRequestIdFromUrl = urlParams.get("subRequestId");
    
    const requestId = requestIdFromUrl || searchParams.get("requestId");
    const subRequestId = subRequestIdFromUrl || searchParams.get("subRequestId");

    // Сохраняем requestId в state, если он есть и еще не сохранен
    if (requestId && !pendingRequestId) {
      setPendingRequestId(requestId);
      if (subRequestId) {
        setPendingSubRequestId(subRequestId);
      }
    }

    // Ждем, пока заявки загрузятся
    if (loading) {
      return;
    }

    // Проверяем, что заявки загружены
    if (requests.length === 0) {
      return;
    }

    const idToUse = pendingRequestId || requestId;
    const subIdToUse = pendingSubRequestId || subRequestId;

    if (idToUse && !selectedRequest) {
      // Ищем заявку по ID
      const foundRequest = requests.find(r => r.id === parseInt(idToUse));
      
      if (foundRequest) {
        // Если указан subRequestId, фильтруем подзаявки
        if (subIdToUse) {
          const subRequest = foundRequest.requests.find((req: SubRequest) => req.id === parseInt(subIdToUse));
          if (subRequest) {
            setSelectedRequest(foundRequest);
            setExpandedSubRequests(new Set([subRequest.id]));
            openModal('requestDetails');
            setPendingRequestId(null);
            setPendingSubRequestId(null);
          } else {
            // Подзаявка не найдена
            setNotFoundRequestId(`${idToUse}/${subIdToUse}`);
            setShowNotFoundModal(true);
            setPendingRequestId(null);
            setPendingSubRequestId(null);
          }
        } else {
          // Открываем всю группу заявок
          setSelectedRequest(foundRequest);
          openModal('requestDetails');
          setPendingRequestId(null);
          setPendingSubRequestId(null);
        }
        
        // Очищаем query параметры из URL
        window.history.replaceState({}, '', window.location.pathname);
      } else if (idToUse) {
        // Заявка не найдена
        setNotFoundRequestId(idToUse);
        setShowNotFoundModal(true);
        setPendingRequestId(null);
        setPendingSubRequestId(null);
        // Очищаем query параметры из URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, requests, selectedRequest, loading, pendingRequestId, pendingSubRequestId, openModal]);

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

  const fetchOffices = async () => {
    try {
      const res = await getOffices();
      setOffices(res.data);
    } catch (error) {
      console.error('Ошибка при загрузке офисов:', error);
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
        ).filter(req => req.requests.length > 0)
        useRequestStore.getState().setRequests(updatedStoreRequests)

        // Если это была последняя под заявка в группе, закрываем модальное окно
        if (updatedRequests.length === 0) {
          setSelectedRequest(null);
          closeModalWithHistory();
        }
      }

      toast({
        title: "Под заявка удалена",
        description: "Под заявка была успешно удалена."
      })
    } catch (error) {
      console.error("Error deleting sub-request:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить под заявку.",
        variant: "destructive"
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
        toast({
          title: "Заявка удалена",
          description: "Заявка была успешно удалена."
        })
      } catch (error) {
        console.error("Failed to delete request group:", error)
        toast({
          title: "Ошибка",
          description: "Не удалось удалить заявку.",
          variant: "destructive"
        })
      } finally {
        setDeleteLoading(false)
      }
    }
  }

  const checkUserRating = useCallback(async (requestId: number) => {
    try {
      const response = await api.get(`/ratings/user/${requestId}`);
      if (response.data && response.data.length > 0) {
        const ratingData = response.data[0];
        setUserRatings(prev => ({
          ...prev,
          [requestId]: {
            ...ratingData,
            comments: ratingData.comment ? [ratingData.comment] : [] // Преобразуем в массив для совместимости
          }
        }));
      }
    } catch (error) {
      console.error("Failed to check user rating:", error);
    }
  }, []);

  // Функция для обработки рейтингов клиентов из ответа API
  const processClientRatings = useCallback((requestGroups: any[]) => {
    setClientRatings(prev => {
      const newRatingsData = { ...prev };
      requestGroups.forEach((requestGroup: any) => {
        if (requestGroup.clientRatings && requestGroup.clientRatings.length > 0) {
          // Сохраняем все рейтинги как массив
          newRatingsData[requestGroup.id] = requestGroup.clientRatings.map((rating: any) => ({
            id: rating.id,
            rating: rating.rating,
            comment: rating.comment,
            request_group_id: requestGroup.id,
            created_at: rating.created_at,
            ratedByUser: rating.ratedByUser
          }));
        }
      });
      return newRatingsData;
    });
  }, []);

  const fetchRequests = useCallback(async (pageToFetch = page) => {
    try {
      setLoading(true);
      const response = await api.get(`/request-groups?page=${pageToFetch}&pageSize=${pageSize}`);

      const newRequestGroups = response.data.requests ?? [];

      addRequests(newRequestGroups);

      // Обрабатываем рейтинги клиентов из ответа API
      processClientRatings(newRequestGroups);

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
  }, [page, pageSize, addRequests, checkUserRating, processClientRatings]);

  useEffect(() => {
    if (requests.length === 0) {
      fetchRequests(1)
    }
  }, [])

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
      case "Экстренная":
        return "bg-gradient-to-r from-[#B8400E] to-[#B8400E]/80"
      case "normal":
      case "regular":
      case "Обычная":
        return "bg-[#114A65]"
      case "planned":
      case "Плановая":
        return "bg-gradient-to-r from-[#114A65] to-[#114A65]/80"
      default:
        return "bg-[#C4C4CE]"
    }
  }
  const translateStatus = (status: string) => {
    switch (status) {
      case "draft": return "Черновик";
      case "in_progress": return "В обработке у Администратора";
      case "execution": return "Исполнение";
      case "completed": return "Завершено";
      case "rejected": return "Отклонено";
      case "awaiting_assignment": return "Ожидает назначения Исполнителя";
      case "awaiting_sla": return "Ожидание времени выполнения";
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
      toast({
        title: "Успешно",
        description: "Заявка создана"
      });

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
        // Оптимистичное обновление - сразу обновляем UI
        const { updateSubRequestRating } = useRequestStore.getState();
        
        // Находим группу заявок, к которой принадлежит подзаявка
        const allRequests = [
          ...useRequestStore.getState().requests,
          ...useRequestStore.getState().myRequests,
          ...useRequestStore.getState().incomingRequests,
          ...useRequestStore.getState().assignedRequests,
          ...useRequestStore.getState().completedRequests
        ];
        
        const requestGroup = allRequests.find(group => 
          group.requests.some(subReq => subReq.id === requestToRate.id)
        );
        
        if (requestGroup) {
          updateSubRequestRating(requestGroup.id, requestToRate.id, ratingValue);
        }
        
        // Обновляем локальное состояние рейтингов (для совместимости с существующим кодом)
        setUserRatings(prev => ({
          ...prev,
          [requestToRate.id]: { 
            id: 0, // временный ID
            rating: ratingValue,
            comment: ratingComment,
            comments: ratingComment ? [ratingComment] : [], // Преобразуем в массив для совместимости
            request_id: requestToRate.id,
            created_at: new Date().toISOString()
          }
        }));
        
        // Проверяем, существует ли уже рейтинг для этой заявки
        const existingRating = userRatings[requestToRate.id];
        const isUpdate = !!existingRating;
        
        // Отправляем запрос на сервер (POST для создания, PUT для обновления)
        const response = await api[isUpdate ? 'put' : 'post'](`/ratings`, {
          rating: ratingValue,
          request_id: requestToRate.id,
          comment: ratingComment
        })
        
        setShowRatingModal(false)
        setRatingValue(0)
        setRequestToRate(null)
        closeModalWithHistory()
      } catch (error) {
        // В случае ошибки откатываем изменения
        const { updateSubRequestRating } = useRequestStore.getState();
        
        const allRequests = [
          ...useRequestStore.getState().requests,
          ...useRequestStore.getState().myRequests,
          ...useRequestStore.getState().incomingRequests,
          ...useRequestStore.getState().assignedRequests,
          ...useRequestStore.getState().completedRequests
        ];
        
        const requestGroup = allRequests.find(group => 
          group.requests.some(subReq => subReq.id === requestToRate.id)
        );
        
        if (requestGroup) {
          updateSubRequestRating(requestGroup.id, requestToRate.id, 0);
        }
        
        // Откатываем изменения в userRatings при ошибке
        setUserRatings(prev => {
          const newRatings = { ...prev };
          delete newRatings[requestToRate.id];
          return newRatings;
        });
        
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
      clearNotifications()
      clearAuth()
      useStatsStore.getState().resetStats
      clearRequests()
      clearCategories()

      setIsLoggedIn(false)
      router.push("/login")
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
        return "bg-[#114A65] text-white border-[#114A65]"
      case "awaiting_assignment":
      case "awaiting_sla":
        return "bg-[#B8400E] text-white border-[#B8400E]"
      case "assigned":
        return "bg-[#114A65] text-white border-[#114A65]"
      case "rejected":
        return "bg-gradient-to-r from-[#B8400E] to-[#B8400E]/80 text-white border-[#B8400E] backdrop-blur-sm"
      default:
        return "bg-[#C4C4CE] text-white border-[#C4C4CE]"
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
        return "bg-[#B8400E] text-white border-[#B8400E]"
      case "medium":
        return "bg-[#B8400E]/80 text-white border-[#B8400E]"
      case "simple":
        return "bg-gradient-to-r from-[#B8400E] to-[#114A65] text-white border-[#B8400E]"
      default:
        return "bg-[#C4C4CE] text-white border-[#C4C4CE]"
    }
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
                <Hourglass className="w-3 h-3 text-[#114A65]" />
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
                <Hourglass className="w-3 h-3 text-[#114A65]" />
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
      setOffices([]);

      // 4. Параллельная загрузка всех данных
      await Promise.all([
        fetchRequests(1),
        fetchStats(),
        fetchCategories(token!),
        fetchNotifications(),
          fetchOffices(),
      ]);

    } catch (error) {
      console.error("Ошибка при обновлении:", error);
    }
  };

  const renderCardHeader = useCallback((requestGroup: RequestGroup) => {
    const isLongTerm = requestGroup.requests.some(req => req.is_long_term);
    // Убрали счетчик подзаявок - теперь показываем только один заявка

    return (
        <CardHeader className={`pb-3 px-5 pt-5`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-bold text-base leading-tight line-clamp-2 text-[#040404]`}>
                  Заявка #{requestGroup.id}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isLongTerm 
                    ? 'text-[#114A65] bg-[#114A65]/20' 
                    : requestGroup.request_type === 'urgent'
                      ? 'text-white bg-gradient-to-r from-[#B8400E] to-[#B8400E]/80'
                      : requestGroup.request_type === 'planned'
                        ? 'text-white bg-gradient-to-r from-[#114A65] to-[#114A65]/80'
                        : 'text-white bg-[#114A65]'
                }`}>
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
                    // Устанавливаем текущий рейтинг как начальное значение, если он существует
                    const currentRating = userRatings[subReq.id]?.rating || 0;
                    setRatingValue(currentRating);
                    setRatingComment(""); // Сбрасываем комментарий
                    setShowRatingModal(true)
                    openModal('ratingModal')
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
  }, [isDesktop, userRatings, openModal]);
  
  const handleCardClick = useCallback((request: RequestGroup) => {
    setSelectedRequest(request);
    openModal('requestDetails');
  }, [openModal]);

  return (
      <>
        {/* Header - только на десктопе */}
        {isDesktop && (
          <Header
              handleLogout={handleLogout}
              notificationCount={notifications.length}
              role="Клиент"
          />
        )}
      <PullToRefresh onRefresh={handleRefresh}>
      <div 
        className={`min-h-screen pb-safe ${!isDesktop && activeTab === "requests" ? "bg-black" : "bg-[#F3F3F3]"}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8">
        {/* Quick Stats */}
        {isDesktop && activeTab === "requests" ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-[#114A65]/10 rounded-lg">
                      <Clock className="w-6 h-6 text-[#114A65]" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#114A65]">Активные заявки</p>
                      <p className="text-2xl font-bold text-[#040404]">
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
                    <div className="p-2 bg-gradient-to-br from-[#114A65]/20 to-[#114A65]/10 rounded-lg backdrop-blur-sm border border-[#114A65]/20">
                      <CheckCircle className="w-6 h-6 text-[#114A65]" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#114A65]">Завершено</p>
                      <p className="text-2xl font-bold text-[#040404]">
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
                    <div className="p-2 bg-gradient-to-br from-[#B8400E]/20 to-[#B8400E]/10 rounded-lg backdrop-blur-sm border border-[#B8400E]/20">
                      <Star className="w-6 h-6 text-[#B8400E]" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-[#114A65]">Средняя оценка исполнителей</p>
                      <p className="text-2xl font-bold text-[#040404]">
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
                    <div className="p-2 bg-[#114A65]/10 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-[#114A65]" />
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
        ) : null}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Большие карточки на десктопе */}
            {isDesktop && (
              <div className="mb-8">
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <Card
                    className="cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] border-2 hover:border-[#B8400E] bg-gradient-to-br from-white via-[#F3F3F3] to-white backdrop-blur-sm"
                    onClick={() => {
                      setActiveTab("meeting-rooms");
                      setMeetingRoomsTab("book");
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                        <div className="mb-4 w-full h-32 bg-gradient-to-br from-[#114A65]/20 via-[#B8400E]/10 to-[#114A65]/20 rounded-lg flex items-center justify-center relative overflow-hidden backdrop-blur-md border border-[#114A65]/20 shadow-lg">
                          {/* Упрощенная иллюстрация комнаты */}
                          <div className="absolute inset-0">
                            {/* Окно */}
                            <div className="absolute top-2 left-4 right-4 h-8 bg-gradient-to-r from-[#114A65]/40 to-[#114A65]/20 rounded border-2 border-[#114A65]/30 backdrop-blur-sm">
                              <div className="grid grid-cols-2 h-full">
                                <div className="border-r-2 border-[#114A65]/30"></div>
                                <div></div>
                              </div>
                            </div>
                            {/* Стол */}
                            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-3 bg-gradient-to-r from-[#B8400E] to-[#B8400E]/80 rounded shadow-md"></div>
                            {/* Стулья */}
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-8">
                              <div className="w-4 h-4 bg-gradient-to-br from-[#114A65] to-[#114A65]/70 rounded-sm shadow-sm"></div>
                              <div className="w-4 h-4 bg-gradient-to-br from-[#114A65] to-[#114A65]/70 rounded-sm shadow-sm"></div>
                              <div className="w-4 h-4 bg-gradient-to-br from-[#114A65] to-[#114A65]/70 rounded-sm shadow-sm"></div>
                              <div className="w-4 h-4 bg-gradient-to-br from-[#114A65] to-[#114A65]/70 rounded-sm shadow-sm"></div>
                            </div>
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-[#040404]">Бронирование комнат</h3>
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] border-2 hover:border-[#B8400E] bg-gradient-to-br from-white via-[#F3F3F3] to-white backdrop-blur-sm"
                    onClick={() => setActiveTab("requests")}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                        <div className="mb-4 w-full h-32 bg-gradient-to-br from-[#B8400E]/20 via-[#114A65]/10 to-[#B8400E]/20 rounded-lg flex items-center justify-center gap-4 backdrop-blur-md border border-[#B8400E]/20 shadow-lg">
                          <Settings className="w-12 h-12 text-[#114A65]" strokeWidth={1.5} />
                          <Wrench className="w-12 h-12 text-[#B8400E]" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-semibold text-[#040404]">Сервисные заявки</h3>
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] border-2 hover:border-[#B8400E] bg-gradient-to-br from-white via-[#F3F3F3] to-white backdrop-blur-sm"
                    onClick={() => router.push('/client/statistics')}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                        <div className="mb-4 w-full h-32 bg-gradient-to-br from-[#114A65]/20 via-[#B8400E]/10 to-[#114A65]/20 rounded-lg flex items-center justify-center backdrop-blur-md border border-[#114A65]/20 shadow-lg">
                          <BarChart3 className="w-16 h-16 text-[#114A65]" />
                        </div>
                        <h3 className="text-lg font-semibold text-[#040404]">Статистика</h3>
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className="cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] border-2 hover:border-[#B8400E] bg-gradient-to-br from-white via-[#F3F3F3] to-white backdrop-blur-sm"
                    onClick={() => router.push('/activity-stats')}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                        <div className="mb-4 w-full h-32 bg-gradient-to-br from-[#114A65]/20 via-[#B8400E]/10 to-[#114A65]/20 rounded-lg flex items-center justify-center backdrop-blur-md border border-[#114A65]/20 shadow-lg">
                          <Activity className="w-16 h-16 text-[#114A65]" />
                        </div>
                        <h3 className="text-lg font-semibold text-[#040404]">Статистика активности</h3>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Кнопки и элементы для meeting-rooms на десктопе */}
                {activeTab === "meeting-rooms" && (
                  <div className="mb-6 space-y-4">
                    {/* Три кнопки */}
                    <div className="flex gap-4">
                      <Button
                        onClick={() => {
                          setMeetingRoomsTab("book");
                        }}
                        className={`flex-1 h-12 rounded-lg font-medium shadow-lg backdrop-blur-sm transition-all duration-300 ${
                          meetingRoomsTab === "book"
                            ? "bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#9a360c] text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                        }`}
                      >
                        Бронировать
                      </Button>
                      <Button
                        onClick={() => {
                          setMeetingRoomsTab("my-bookings");
                        }}
                        className={`flex-1 h-12 rounded-lg font-medium ${
                          meetingRoomsTab === "my-bookings"
                            ? "bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#9a360c] text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                        }`}
                      >
                        Мои бронирования
                      </Button>
                      <Button
                        onClick={() => {
                          setMeetingRoomsTab("smart-home");
                        }}
                        className={`flex-1 h-12 rounded-lg font-medium ${
                          meetingRoomsTab === "smart-home"
                            ? "bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#9a360c] text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                        }`}
                      >
                        Умный дом
                      </Button>
                    </div>

                    {/* Кнопка калькулятора и выбор офиса - показываются только для вкладки book */}
                    {meetingRoomsTab === "book" && (
                      <>
                        {/* Кнопка калькулятора */}
                        <Button
                          onClick={() => {
                            setShowDeskCalculator(!showDeskCalculator);
                          }}
                          variant="outline"
                          className="w-full h-12 bg-[#F3F3F3] border-[#C4C4CE] hover:bg-[#E8E8E8] rounded-lg flex items-center justify-center gap-2"
                        >
                          <Ruler className="h-5 w-5 text-[#040404]" />
                          <span className="font-medium text-[#040404]">Калькулятор высоты стола</span>
                        </Button>

                        {/* Калькулятор высоты стола */}
                        <DeskHeightCalculator
                          isOpen={showDeskCalculator}
                          onToggle={() => setShowDeskCalculator(!showDeskCalculator)}
                        />

                        {/* Секция выбора офиса */}
                        <div className="space-y-3">
                          <div>
                            <h2 className="text-lg font-semibold text-[#040404]">Выбрать офис</h2>
                            <p className="text-sm text-[#C4C4CE]">Выберите офис для бронирования переговорной комнаты</p>
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {offices.map((office: any) => (
                              <Card
                                key={office.id}
                                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
                                onClick={() => {
                                  setSelectedOffice(office);
                                  setActiveTab("meeting-rooms");
                                }}
                              >
                                <CardContent className="p-0">
                                  <div className="relative aspect-[4/3] bg-gradient-to-br from-[#114A65]/10 to-[#114A65]/5 overflow-hidden rounded-t-lg">
                                    {office.photo ? (
                                      <Image
                                        src={office.photo}
                                        alt={office.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Building2 className="w-16 h-16 text-[#114A65]" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-4">
                                    <h3 className="font-semibold text-[#040404]">{office.name}</h3>
                                    <p className="text-sm text-[#114A65] mt-1">{office.city}</p>
                                    <p className="text-sm text-[#C4C4CE]">{office.address}</p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Главная секция для мобильных - скрываем когда активна вкладка заявок */}
            {!isDesktop && activeTab !== "requests" && (
              <div className="mb-6 space-y-5">
                {/* Три карточки действий в одном ряду */}
                <div className="grid grid-cols-3 gap-2">
                  <Card
                    onClick={() => {
                      setActiveTab("meeting-rooms");
                      setMeetingRoomsTab("book");
                    }}
                    className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0 shadow-xl bg-gradient-to-br from-[#114A65] via-[#0d3a4f] to-[#B8400E] group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>
                    <CardContent className="p-3 relative z-10 flex flex-col items-center justify-center h-28">
                      <div className="mb-1 transform group-hover:scale-110 transition-transform duration-300">
                        <Building2 className="h-8 w-8 text-white drop-shadow-lg" />
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] font-bold text-white leading-tight drop-shadow-md">Бронирование</span>
                        <span className="text-[10px] font-bold text-white leading-tight drop-shadow-md">комнат</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    onClick={() => setActiveTab("requests")}
                    className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-2 border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50 group hover:border-[#114A65]/30"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#114A65]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardContent className="p-3 relative z-10 flex flex-col items-center justify-center h-28">
                      <div className="mb-1 transform group-hover:scale-110 transition-transform duration-300">
                        <Wrench className="h-8 w-8 text-[#114A65]" />
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] font-bold text-gray-900 leading-tight">Сервисные</span>
                        <span className="text-[10px] font-bold text-gray-900 leading-tight">заявки</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    onClick={() => router.push('/activity-stats')}
                    className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-2 border-gray-200 shadow-lg bg-gradient-to-br from-white to-gray-50 group hover:border-[#114A65]/30"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#114A65]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardContent className="p-3 relative z-10 flex flex-col items-center justify-center h-28">
                      <div className="mb-1 transform group-hover:scale-110 transition-transform duration-300">
                        <Activity className="h-8 w-8 text-[#114A65]" />
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] font-bold text-gray-900 leading-tight">Статистика</span>
                        <span className="text-[10px] font-bold text-gray-900 leading-tight">активности</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Три кнопки переключения - показываются только для meeting-rooms */}
                {activeTab === "meeting-rooms" && (
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      onClick={() => {
                        setMeetingRoomsTab("book");
                      }}
                      className={`h-12 text-xs px-2 rounded-xl font-semibold transition-all duration-300 shadow-md ${
                        meetingRoomsTab === "book"
                          ? "bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white shadow-lg scale-105"
                          : "bg-white border-2 border-gray-200 hover:border-[#114A65]/30 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Бронировать
                    </Button>
                    <Button
                      onClick={() => {
                        setMeetingRoomsTab("my-bookings");
                      }}
                      className={`h-12 text-xs px-2 rounded-xl font-semibold transition-all duration-300 shadow-md ${
                        meetingRoomsTab === "my-bookings"
                          ? "bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white shadow-lg scale-105"
                          : "bg-white border-2 border-gray-200 hover:border-[#114A65]/30 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Мои бронирования
                    </Button>
                    <Button
                      onClick={() => {
                        setMeetingRoomsTab("smart-home");
                      }}
                      className={`h-12 text-xs px-2 rounded-xl font-semibold transition-all duration-300 shadow-md ${
                        meetingRoomsTab === "smart-home"
                          ? "bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white shadow-lg scale-105"
                          : "bg-white border-2 border-gray-200 hover:border-[#114A65]/30 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Умный дом
                    </Button>
                  </div>
                )}

                {/* Кнопка калькулятора и выбор офиса - показываются только для meeting-rooms и вкладки book */}
                {activeTab === "meeting-rooms" && meetingRoomsTab === "book" && (
                  <>
                    {/* Кнопка калькулятора */}
                    <Card
                      onClick={() => {
                        setShowDeskCalculator(!showDeskCalculator);
                      }}
                      className="cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-[0.98] border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50/50 hover:border-[#114A65]/40"
                    >
                      <CardContent className="p-4 flex items-center justify-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#114A65]/10 to-[#B8400E]/10 rounded-lg">
                          <Ruler className="h-6 w-6 text-[#114A65]" />
                        </div>
                        <span className="font-semibold text-gray-900">Калькулятор высоты стола</span>
                      </CardContent>
                    </Card>

                    {/* Калькулятор высоты стола */}
                    <DeskHeightCalculator
                      isOpen={showDeskCalculator}
                      onToggle={() => setShowDeskCalculator(!showDeskCalculator)}
                    />

                    {/* Секция выбора офиса */}
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-[#114A65]/5 to-[#B8400E]/5 rounded-xl p-4 border border-[#114A65]/10">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Выбрать офис</h2>
                        <p className="text-sm text-gray-600">Выберите офис для бронирования переговорной комнаты</p>
                      </div>
                      <div className="overflow-x-auto -mx-2 px-2">
                        <div className="flex gap-4 pb-3" style={{ scrollbarWidth: 'thin' }}>
                          {offices.map((office: any) => (
                            <Card
                              key={office.id}
                              className="min-w-[300px] cursor-pointer transition-all duration-300 hover:shadow-xl active:scale-[0.97] flex-shrink-0 border-2 border-gray-200 hover:border-[#114A65]/40 overflow-hidden group"
                              onClick={() => {
                                setSelectedOffice(office);
                                setActiveTab("meeting-rooms");
                              }}
                            >
                              <CardContent className="p-0">
                                <div className="relative aspect-[4/3] bg-gradient-to-br from-[#114A65]/10 to-[#114A65]/5 overflow-hidden">
                                  {office.photo ? (
                                    <>
                                      <Image
                                        src={office.photo}
                                        alt={office.name}
                                        fill
                                        sizes="300px"
                                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </>
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#114A65]/10 to-[#B8400E]/10">
                                      <Building2 className="w-20 h-20 text-[#114A65] opacity-50" />
                                    </div>
                                  )}
                                  <div className="absolute top-3 right-3">
                                    <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-md">
                                      <span className="text-xs font-semibold text-[#114A65]">Выбрать</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-5 bg-white">
                                  <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-[#114A65] transition-colors">{office.name}</h3>
                                  <div className="flex items-center gap-2 mb-1">
                                    <MapPin className="w-4 h-4 text-[#114A65]" />
                                    <p className="text-sm font-medium text-[#114A65]">{office.city}</p>
                                  </div>
                                  <p className="text-sm text-gray-600 leading-relaxed">{office.address}</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="requests">
                <div className="space-y-4">
                  {/* Мобильная версия */}
                  {!isDesktop && (
                    <div className="space-y-4">
                      {/* Заголовок Сервисные заявки */}
                      <h1 className="text-2xl font-bold text-white">Сервисные заявки</h1>
                      
                      {/* Переключатель вкладок */}
                      <div className="flex rounded-xl overflow-hidden bg-[#3D3D3D]">
                        <button
                          onClick={() => setRequestsTab("create")}
                          className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                            requestsTab === "create"
                              ? "bg-[#5A5A5A] text-white"
                              : "bg-transparent text-gray-400"
                          }`}
                        >
                          Создать заявку
                        </button>
                        <button
                          onClick={() => setRequestsTab("my-requests")}
                          className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                            requestsTab === "my-requests"
                              ? "bg-[#5A5A5A] text-white"
                              : "bg-transparent text-gray-400"
                          }`}
                        >
                          Мои заявки
                        </button>
                      </div>

                      {/* Контент в зависимости от выбранной вкладки */}
                      {requestsTab === "create" ? (
                        <div className="space-y-4">
                          <h2 className="text-lg font-bold text-white">Все сценарий</h2>
                          <Button
                            onClick={() => router.push('/create-request')}
                            className="w-full h-14 bg-[#F35713] hover:bg-[#E04A0A] text-white font-semibold rounded-2xl text-base"
                          >
                            Создать заявку
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h2 className="text-lg font-bold text-white">Все заявки</h2>
                          
                          {/* Фильтры */}
                          <div className="flex gap-2">
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                              <SelectTrigger className="flex-1 bg-[#2C2C2E] border-gray-700 text-white">
                                <SelectValue placeholder="Статус" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2C2C2E] border-gray-700">
                                <SelectItem value="all" className="text-white">Все</SelectItem>
                                <SelectItem value="in_progress" className="text-white">В обработке</SelectItem>
                                <SelectItem value="awaiting_assignment" className="text-white">Ожидает</SelectItem>
                                <SelectItem value="execution" className="text-white">Исполнение</SelectItem>
                                <SelectItem value="completed" className="text-white">Завершено</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={filterType} onValueChange={setFilterType}>
                              <SelectTrigger className="flex-1 bg-[#2C2C2E] border-gray-700 text-white">
                                <SelectValue placeholder="Тип" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#2C2C2E] border-gray-700">
                                <SelectItem value="all" className="text-white">Все</SelectItem>
                                <SelectItem value="normal" className="text-white">Обычная</SelectItem>
                                <SelectItem value="urgent" className="text-white">Экстренная</SelectItem>
                                <SelectItem value="planned" className="text-white">Плановая</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-4 pb-24" style={{ contain: 'layout style paint' }}>
                            {filteredRequests.slice(0, 50).map((requestGroup, index) => {
                              const isLast = index === filteredRequests.length - 1;
                              return (
                                <RequestCard
                                  key={`incoming-${index}`}
                                  request={requestGroup}
                                  onCardClick={handleCardClick}
                                  renderCardHeader={renderCardHeader}
                                  isLast={isLast}
                                  lastElementRef={lastRequestRef}
                                  clientRating={clientRatings[requestGroup.id]}
                                  userRole="client"
                                  variant="compact"
                                />
                              );
                            })}
                            {filteredRequests.length === 0 && (
                              <div className="text-center py-8 text-gray-400">
                                <p>У вас пока нет заявок</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Десктопная версия с фильтрами */}
                  {isDesktop && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4 flex-1">
                          <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="flex-1 sm:w-48">
                              <SelectValue placeholder="Статус" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все</SelectItem>
                              <SelectItem value="in_progress">В обработке</SelectItem>
                              <SelectItem value="awaiting_assignment">Ожидает назначение</SelectItem>
                              <SelectItem value="execution">Исполнение</SelectItem>
                              <SelectItem value="completed">Завершено</SelectItem>
                              <SelectItem value="long_term">Долгосрочные</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="flex-1 sm:w-48">
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
                        <Button
                          onClick={() => router.push('/create-request')}
                          className="bg-[#114A65] hover:bg-[#0d3a4f]"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Создать заявку
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ contain: 'layout style paint' }}>
                        {filteredRequests.slice(0, 50).map((requestGroup, index) => {
                          const isLast = index === filteredRequests.length - 1;
                          return (
                            <RequestCard
                              key={`incoming-desktop-${index}`}
                              request={requestGroup}
                              onCardClick={handleCardClick}
                              renderCardHeader={renderCardHeader}
                              isLast={isLast}
                              lastElementRef={lastRequestRef}
                              clientRating={clientRatings[requestGroup.id]}
                              userRole="client"
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

                  <TabsContent value="statistics">
                    <div className="space-y-6">
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
                              <span className="font-bold text-[#114A65]">
                                {stats && stats.doneRequests ? (stats.doneRequests) : 0}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Средняя оценка от исполнителей</span>
                              <span className="font-bold">
                                {stats && stats.averageRating ? (stats.averageRating) : 0}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Количество полученных оценок</span>
                              <span className="font-bold text-[#114A65]">
                                {stats && stats.totalRatings ? (stats.totalRatings) : 0}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <MeetingRoomStatistics />
                    </div>
                  </TabsContent>

                  <TabsContent value="meeting-rooms">
                    {meetingRoomsTab === "smart-home" ? (
                      <ClientSmartHomeControl />
                    ) : (
                      <MeetingRoomsCatalog 
                        initialOffice={selectedOffice} 
                        onOfficeChange={setSelectedOffice}
                        initialTab={meetingRoomsTab === "book" ? "book" : "my-bookings"}
                        onTabChange={(tab) => setMeetingRoomsTab(tab === "book" ? "book" : "my-bookings")}
                        showCalculator={showDeskCalculator}
                        onCalculatorToggle={setShowDeskCalculator}
                      />
                    )}
                  </TabsContent>
                </Tabs>
          </div>

          {/* Sidebar - скрываем на мобильном в разделе заявок */}
          {(isDesktop || activeTab !== "requests") && (
            <div className="space-y-6 mb-20 mt-6 lg:mt-0">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <NotificationsSidebar 
                    onNotificationClick={handleNotificationClick}
                    onRequestClick={(requestId) => {
                      // Парсим ID заявки (может быть в формате "123" или "123/1")
                      const parsedId = parseInt(requestId.split('/')[0]);
                      const request = requests.find(r => r.id === parsedId);
                      if (request) {
                        setSelectedRequest(request);
                        openModal('requestDetails');
                        return true;
                      }
                      return false;
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        </div>
      </div>
      </PullToRefresh>
  <BottomNav
      activeTab={activeTab === "requests" ? "requests" : activeTab === "meeting-rooms" ? "booking" : "home"}
      hidden={showCreateRequest || !!selectedRequest || showMapModal || showRatingModal || isModalOpen || !!selectedPhoto || showDeleteRequestModal}
  />
        {/* Request Details Modal */}
        {selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => {
              setSelectedRequest(null)
              setShowComments(null)
              closeModal();
            }}>
              <Card className={`w-full ${isDesktop ? 'max-w-2xl' : 'max-w-full h-full'} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <CardTitle className="font-medium text-gray-900">Заявка #{selectedRequest.id}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-16">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium text-gray-900">Тип заявки </Label>
                      <Badge className={getTypeColor(selectedRequest.request_type)}>{translateType(selectedRequest.request_type)}</Badge>
                    </div>
                    <div>
                      <Label className="font-medium text-gray-900">Статус </Label>
                      <Badge className={getStatusColor(selectedRequest.status)}>{translateStatus(selectedRequest.status)}</Badge>
                    </div>
                  </div>

                  {/* Показываем запланированное время для плановых заявок */}
                  {selectedRequest.request_type === 'planned' && selectedRequest.planned_date && (
                      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-[#114A65]/15 to-[#B8400E]/10 border border-[#114A65]/30 rounded-lg backdrop-blur-sm shadow-sm">
                        <CalendarLucid className="w-4 h-4 text-[#114A65]" />
                  <div>
                          <Label className="text-sm font-medium text-[#114A65]">Запланировано на: </Label>
                          <span className="text-sm text-[#040404]">
                          {new Date(selectedRequest.planned_date).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                  </div>
                      </div>
                  )}

                  {/* Заявка (теперь показываем только первый подзаявка как полноценный заявка) */}
                  <div>
                    <Label className={isDesktop ? '' : 'text-base font-medium'}>Заявка</Label>
                    <div className={`space-y-3 mt-2 ${isDesktop ? '' : 'space-y-4'}`}>
                      {selectedRequest.requests.slice(0, 1).map((subRequest: SubRequest) => {
                        const isExpanded = expandedSubRequests.has(subRequest.id);
                        const hasComments = showComments === subRequest.id;

                        return (
                            <div key={subRequest.id} className={`border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200 will-change-transform ${isDesktop ? 'border-gray-200' : 'border-gray-200'}`}>
                              {/* Заголовок под заявки */}
                              <div className={`p-5 ${isDesktop ? '' : 'p-5'}`}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className={`font-semibold text-gray-900 ${isDesktop ? 'text-base' : 'text-md'}`}>{subRequest.title}</h4>
                                    </div>
                                    <div className={`${isDesktop ? 'flex items-center gap-3' : 'flex flex-col gap-1'} text-gray-600 ${isDesktop ? 'text-sm' : 'text-base'}`}>
                                      <span className={`${isDesktop ? 'truncate' : ''} flex items-center gap-1`}>
                                        <span className="w-2 h-2 bg-[#B8400E] rounded-full"></span>
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
                                        className={`${isDesktop ? 'h-8 w-8' : 'h-10 w-10'} p-0 hover:bg-[#B8400E]/10`}
                                        onClick={() => {
                                          if (hasComments) {
                                            setShowComments(null);
                                          } else {
                                            setShowComments(subRequest.id);
                                          }
                                        }}
                                    >
                                      <MessageCircle className={`${isDesktop ? 'h-4 w-4' : 'h-5 w-5'} ${hasComments ? 'text-[#114A65]' : 'text-gray-500'}`} />
                                    </Button>

                                    <RoleBasedActionMenu
                                        request={subRequest}
                                        requestGroup={selectedRequest}
                                        isDesktop={isDesktop}
                                        userRole="client"
                                        isSubRequest={true}
                                                                                  onRateRequest={(subReq) => {
                                            setRequestToRate(subReq)
                                            // Устанавливаем текущий рейтинг как начальное значение, если он существует
                                            const currentRating = userRatings[subReq.id]?.rating || 0;
                                            setRatingValue(currentRating);
                                            setRatingComment(""); // Сбрасываем комментарий
                                            setShowRatingModal(true)
                                            openModal('ratingModal')
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
                                {subRequest.status !== 'in_progress' && subRequest.status !== 'rejected' && (
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
                                    <Executors subRequest={subRequest} userRatings={userRatings} />

                                    {/* Отчет о выполнении для завершенных подзаявок */}
                                    {subRequest.status === "completed" && (
                                        <CompletedTaskReport
                                            subRequest={subRequest}
                                            isDesktop={isDesktop}
                                            onPhotoClick={(photoUrl) => {
                                              setSelectedPhoto({url: photoUrl});
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
                                          src={getPreviewUrl(photo.photo_url)}
                                      alt={`Фото ${index + 1}`}
                                      className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-[#B8400E] transition-border duration-150"
                                      loading="lazy"
                                      decoding="async"
                                      onClick={() => {
                                        setSelectedPhoto({url: photo.photo_url, created_at: photo.created_at});
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
                              .slice(0, 10) // Ограничиваем количество для производительности
                              .map((photo: any, index: number) => (
                                    <img
                                        key={index}
                                        src={getPreviewUrl(photo.photo_url)}
                                      alt={`Фото ${index + 1}`}
                                      className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-[#B8400E] transition-border duration-150"
                                      loading="lazy"
                                      decoding="async"
                                      onClick={() => {
                                        setSelectedPhoto({url: photo.photo_url, created_at: photo.created_at});
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

                  {/* Отображение рейтингов клиента */}
                  {selectedRequest.status === "completed" && clientRatings[selectedRequest.id] && selectedRequest.client?.role === "client" && (
                    <div className="p-4 bg-[#114A65]/10 border border-[#114A65]/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-5 h-5 text-[#114A65]" />
                        <h4 className="font-semibold text-[#114A65]">
                          Оценки от исполнителей ({clientRatings[selectedRequest.id].length})
                        </h4>
                      </div>
                      
                      {Array.isArray(clientRatings[selectedRequest.id]) ? (
                        // Показываем все оценки
                        clientRatings[selectedRequest.id].map((rating: any, index: number) => (
                          <div key={rating.id} className={`mb-3 ${index > 0 ? 'pt-3 border-t border-[#114A65]/20' : ''}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span key={star} className={`text-xl ${star <= rating.rating ? 'text-[#B8400E]' : 'text-gray-300'}`}>
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="text-sm text-[#114A65]">
                                {rating.rating} из 5
                              </span>
                            </div>
                            {rating.comment && (
                              <div className="mt-2">
                                <p className="text-sm text-[#114A65] break-words">
                                  "{rating.comment}"
                                </p>
                              </div>
                            )}
                            <div className="mt-2 text-xs text-[#114A65]">
                              Оценка от: {rating.ratedByUser?.full_name || 'Исполнитель'}
                            </div>
                          </div>
                        ))
                      ) : (
                        // Обратная совместимость для старого формата (один рейтинг)
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={`text-xl ${star <= clientRatings[selectedRequest.id].rating ? 'text-[#B8400E]' : 'text-gray-300'}`}>
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-sm text-[#114A65]">
                            {clientRatings[selectedRequest.id].rating} из 5
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => {
                      setSelectedRequest(null);
                      closeModal();
                    }}>
                      Закрыть
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
        )}

        {/* Модальное окно фото */}
        {selectedPhoto && selectedPhoto?.url && (
            <PhotoModal
                selectedPhoto={selectedPhoto}
                onClose={() => {
                  setSelectedPhoto(null);
                  closeModal();
                }}
            />
        )}

        {/* Map Modal */}
        <MapModal
          isOpen={showMapModal}
          onClose={() => {
            setShowMapModal(false);
            closeModal();
          }}
          mapLocation={mapLocation}
        />
        {/* Rating Modal */}
        <RatingModal
            isOpen={showRatingModal && !!requestToRate}
            onClose={() => {
              setShowRatingModal(false);
              closeModal();
              setRatingValue(0);
              setRequestToRate(null);
              setRatingComment("");
            }}
            ratingValue={ratingValue}
            onRatingChange={setRatingValue}
            onSubmit={handleRateExecutor}
            currentRating={requestToRate ? userRatings[requestToRate.id]?.rating : undefined}
            comment={ratingComment}
            onCommentChange={setRatingComment}
        />

        {/* Модалка */}
        {isModalOpen && selectedNotification && (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                onClick={closeModal}
            >
              <div
                  className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
                  onClick={(e) => e.stopPropagation()} // Останавливаем всплытие только внутри моталки
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">{selectedNotification.title}</h2>
                  <button
                      className="text-gray-500 hover:text-black text-2xl focus:outline-none"
                      onClick={closeModal}
                      aria-label="Закрыть модальное окно"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-line">
                  {createClickableRequestIds(selectedNotification.content, (requestId) => {
                    // Парсим ID заявки (может быть в формате "123" или "123/1")
                    const parsedId = parseInt(requestId.split('/')[0]);
                    const request = requests.find(r => r.id === parsedId);
                    if (request) {
                      setSelectedRequest(request);
                      openModal('requestDetails');
                      setIsModalOpen(false); // Закрываем модалку уведомления
                    } else {
                      // Заявка не найдена, показываем модалку предупреждения
                      setNotFoundRequestId(requestId);
                      setShowNotFoundModal(true);
                    }
                  })}
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
          offices={offices}
        />

        {/* Delete Request Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteRequestModal && !!requestToDelete}
          onClose={() => {
            setShowDeleteRequestModal(false);
            closeModal();
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
            className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-14 h-14 bg-[#114A65]/10 text-[#114A65] rounded-full shadow-lg hover:bg-[#114A65]/20 transition"
        >
          <MessageCircle className="w-7 h-7" />

        </Link>}

        {/* Модалка для случая, когда заявка не найдена */}
        <RequestNotFoundModal
          isOpen={showNotFoundModal}
          onClose={() => setShowNotFoundModal(false)}
          requestId={notFoundRequestId}
        />
  </>
  )
}
