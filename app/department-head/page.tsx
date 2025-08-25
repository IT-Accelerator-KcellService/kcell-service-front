"use client"

import React, {useCallback, useEffect, useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Badge} from "@/components/ui/badge"
import { LeaderIndicator } from "@/components/ui/leader-indicator";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Input} from "@/components/ui/input"
import {
  AlertTriangle,
  Calendar as CalendarLucid,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Hourglass,
  MapPin,
  MessageCircle,
  Plus,
  Star,
  Trash2,
  User,
  Users,
  XCircle,
  Zap,
} from "lucide-react"


import Header from "@/app/header/Header"
import api from "@/lib/api";
import {useRouter, useSearchParams} from "next/navigation";
import {useNotificationStore} from "@/stores/notificationStore";
import {SuccessModal} from "@/components/success-model";
import {useSuccessModal} from "@/hooks/use-success-modal";
import {BottomNav} from "@/components/BottomNav";
import {useMediaQuery} from "@/hooks/use-media-query";
import {ProfileModal} from "@/components/ProfileModal";
import {NotificationsSidebar} from "@/components/notification/NotificationsSidebar";
import {Request, RequestGroup, SubRequest, useRequestStore} from "@/stores/useRequestStore";
import PullToRefresh from "@/components/pull-to-refresh";
import Link from "next/link";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import {RoleBasedActionMenu} from "@/components/action-menu";
import {DeleteConfirmationModal} from "@/components/DeleteConfirmationModal";
import {MapModal} from "@/components/MapModal";
import {RatingModal} from "@/components/RatingModal";
import {RequestCard} from "@/components/RequestCard";
import {CreateRequestModal} from "@/components/CreateRequestModal";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {IconInfoModal} from "@/components/IconInfoModal";
import {CommentsModal} from "@/components/CommentsModal";
import {useRejectRequestModal} from "@/hooks/use-reject-modal";
import {RejectRequestModal} from "@/components/RejectRequestModal";
import {AssignExecutorsModal} from "@/components/AssignExecutorsModal";
import {CompletedTaskReport} from "@/components/CompletedTaskReport";
import SubRequestInfo from "@/components/SubRequestInfo";
import Executors from "@/components/Executors";
import { RecurringTasksList, UpcomingTasksWidget } from "@/components/recurring-tasks";

interface User {
  id: number
  full_name: string
  email: string
  phone?: string
  role: string
}

interface Executor{
  id: number,
  executor_id: number
  user: User,
  specialty: string,
  rating: number,
  workload: number
}

interface Stats {
  totalRequests: number,
  statusCounts: {
    new: number,
    inWork: number,
    completed: number,
    overdue: number
  },
  requestTypeSummary: {
    urgent: number,
    planned: number,
    normal: number
  }
}

export default function DepartmentHeadDashboard() {
  const {token, clearAuth, user} = useAuthStore()
  const {categories, fetchCategories, clearCategories} = useCategoryStore()
  const searchParams = useSearchParams()
  const successModal = useSuccessModal()
  const rejectModal = useRejectRequestModal()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("incoming")
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)

  const [showProfile, setShowProfile] = useState(false)
  const [showIconInfo, setShowIconInfo] = useState<{type: 'status' | 'longTerm', value: string} | null>(null);
  const [showComments, setShowComments] = useState<number | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<Request | null>(null)
  const {incomingRequests, setIncomingRequests, myRequests, setMyRequests, clearRequests} = useRequestStore()
  const [clientInfo, setClientInfo] = useState<Record<number, User>>({})
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 })
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [newExecutorEmail,setNewExecutorEmail]=useState("")
  const [newExecutorPhone, setNewExecutorPhone] = useState("")
  const [executors, setExecutors] = useState<Executor[]>([])
  const [newExecutorName, setNewExecutorName] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [expandedSubRequests, setExpandedSubRequests] = useState<Set<number>>(new Set());
  const { notifications, setNotifications, setNotificationLoading, clearNotifications } = useNotificationStore()
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [executorToDelete, setExecutorToDelete] = useState<Executor | null>(null)
  const [showDeleteExecutorModal, setShowDeleteExecutorModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterIncomingStatus, setFilterIncomingStatus] = useState("all")
  const [filterIncomingType, setFilterIncomingType] = useState("all")
  const [stats, setStats] = useState<Stats | null>(null);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [selectedRequestForRedirect, setSelectedRequestForRedirect] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [showAssignExecutorsModal, setShowAssignExecutorsModal] = useState(false);
  const [selectedSubRequestForAssignment, setSelectedSubRequestForAssignment] = useState<any>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [modalStack, setModalStack] = useState<string[]>([]);
  const [isClosingProgrammatically, setIsClosingProgrammatically] = useState(false);

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

    if (!user || user.role !== "department-head") {
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
            setShowCreateRequestModal(false);
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
          case 'executorDelete':
            setExecutorToDelete(null);
            break;
          case 'redirectModal':
            handleCloseRedirectModal();
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
      setShowCreateRequestModal(false);
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
    if (modalName !== 'ratingModal') {
      setShowRatingModal(false);
      setRatingValue(0);
      setRequestToRate(null);
    }
    if (modalName !== 'executorDelete') {
      setExecutorToDelete(null);
    }
    if (modalName !== 'redirectModal') {
      handleCloseRedirectModal();
    }
    setModalStack([modalName]);
    // Используем pushState вместо replaceState для правильной работы истории
    window.history.pushState({ modal: modalName }, '', window.location.pathname);
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/analytics/stats/department-head");
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

  useEffect(() => {
    const create = searchParams.get("createRequest")

    if (create === "true") {
      // Всегда добавляем createRequest в стек и историю
      setModalStack(['createRequest']);
      window.history.pushState({ modal: 'createRequest' }, '', window.location.pathname);
      setShowCreateRequestModal(true)
    }
    if(create === "false") {
      setShowCreateRequestModal(false)
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


  const [errors, setErrors] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
  const validateFullName = (name: string) => {
    return /^([А-ЯӘӨҚҢҮҰҺІЁ][а-яәөқңүұһіё]+)\s([А-ЯӘӨҚҢҮҰҺІЁ][а-яәөқңүұһіё]+)$/.test(name.trim())
  }
  const filteredExecutors = executors.filter((executor) =>
      executor.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      executor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  )



  const handleAddExecutor = async () => {
    const name = newExecutorName.trim()
    const email = newExecutorEmail.trim()
    const phone = newExecutorPhone.trim()

    const newErrors = {
      name: name
          ? validateFullName(name)
              ? ""
              : "Введите корректное полное имя (например: Иван Иванов)"
          : "Введите имя",
      email: email
          ? validateEmail(email)
              ? ""
              : "Некорректный email"
          : "Введите email",
      phone: phone
          ? phone.length >= 10
              ? ""
              : "Некорректный номер телефона"
          : "Введите номер телефона",
    }

    setErrors(newErrors)

    if (Object.values(newErrors).some((err) => err !== "")) return

    try {
      await api.post('/executors', {
        full_name: name,
        email,
        phone,
      })
      fetchExecutors()
      setNewExecutorName("")
      setNewExecutorEmail("")
      setNewExecutorPhone("")
      setErrors({ name: "", email: "", phone: "" })
    } catch (error) {
      console.error("Failed to add executor:", error)
    }
  }


  const fetchRequests = useCallback(async () => {
    try {
      const response: any = await api.get('/request-groups');

      const otherRequests: Request[] = response.data.otherRequests;
      const myRequests: Request[] = response.data.myRequests;

      const sortedOtherRequests = otherRequests.sort((a, b) => {
        // 1. приоритет "waiting_for_assignment"
        if (a.status === "awaiting_assignment" && b.status !== "awaiting_assignment") return -1;
        if (b.status === "awaiting_assignment" && a.status !== "awaiting_assignment") return 1;

        // 2. приоритет "in_progress"
        if (a.status === "in_progress" && b.status !== "in_progress") return -1;
        if (b.status === "in_progress" && a.status !== "in_progress") return 1;

        // 3. среди одинаковых статусов — приоритет экстренным
        if (a.request_type === "urgent" && b.request_type !== "urgent") return -1;
        if (b.request_type === "urgent" && a.request_type !== "urgent") return 1;

        // 4. по дате (новые сверху)
        const dateA = new Date(a.created_date).getTime();
        const dateB = new Date(b.created_date).getTime();
        return dateB - dateA;
      });
      setIncomingRequests(sortedOtherRequests);
      setMyRequests(myRequests);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    }
  }, []);
  const fetchExecutors = useCallback(async () => {
    try {
      const response = await api.get('/executors')
      setExecutors(response.data)
    } catch (error) {
      console.error("Failed to fetch executors:", error)
    }
  }, []);

  useEffect(() => {
    // Инициализация данных при первом рендере
    fetchRequests();
    fetchExecutors();
  }, [])

  const fetchClientInfo = async (userId: number) => {
    if (clientInfo[userId]) return

    try {
      const response = await api.get(`/users/${userId}`)
      setClientInfo(prev => ({
        ...prev,
        [userId]: response.data
      }))
    } catch (error) {
      console.error("Failed to fetch client info:", error)
    }
  }

  useEffect(() => {
    if (selectedRequest?.client_id) {
      fetchClientInfo(selectedRequest.client_id)
    }
  }, [selectedRequest])

  // Фильтрация входящих заявок
  const filteredIncomingRequests = incomingRequests.filter((request) => {
    const statusMatch = filterIncomingStatus === "all"   ||
        (filterIncomingStatus === "long_term" ? request.requests.some(req => req.is_long_term) : request.status === filterIncomingStatus);
    const typeMatch = filterIncomingType === "all" || request.request_type === filterIncomingType;
    return statusMatch && typeMatch;
  });

  const handleCreateDepartmentRequest = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors(null);

    try {
      // Проверяем, является ли это повторяющейся задачей
      const requestType = formData.get('request_type');
      const isRecurring = requestType === 'recurring';
      console.log('Department head - request_type:', requestType, 'isRecurring:', isRecurring);
      
      if (isRecurring) {
        // Создаем повторяющуюся задачу
        const recurringData = {
          location: formData.get('location'),
          location_detail: formData.get('location_detail'),
          recurrence_type: formData.get('recurrence_type'),
          recurrence_interval: parseInt(formData.get('recurrence_interval') as string),
          start_date: formData.get('start_date'),
          category_id: user?.service_category_id || 1, // Добавляем категорию department-head
        };
        
        const response = await api.post('/recurring-tasks', recurringData);
        
        // Добавляем новую повторяющуюся задачу в список
        const newRecurringTask = response.data;
        setMyRequests(prev => [newRecurringTask, ...prev]);
        
        successModal.showSuccess({
          title: "Повторяющаяся задача создана!",
          message: "Задача будет автоматически создавать экземпляры согласно расписанию."
        });
      } else {
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

        const response = await api.post('/request-groups', apiFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const newRequestGroup = response.data;
        setMyRequests(prev => [newRequestGroup, ...prev]);
        
        // Показываем соответствующее сообщение об успехе
        const hasExecutors = subRequests.some((subReq: any) => subReq.executors && subReq.executors.length > 0);
        if (hasExecutors) {
          successModal.showSuccess({
            title: "Заявка создана и исполнители назначены!",
            message: "Заявка успешно создана и передана исполнителям."
          });
        } else {
          successModal.showSuccess({
            title: "Заявка создана!",
            message: "Заявка отправлена на рассмотрение администратора."
          });
        }
      }
      
      setShowCreateRequestModal(false);
      closeModalWithHistory();
    } catch (error: any) {
      console.error("Ошибка при создании:", error);
      setFormErrors(error.response?.data?.error || "Не удалось создать.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateExecutor = async () => {
    if (requestToRate && ratingValue > 0) {
      try {
        const response = await api.post(`/ratings`, {
          rating: ratingValue,
          request_id: requestToRate.id
        })
        setShowRatingModal(false);
        closeModalWithHistory();
        setRatingValue(0)
        setRequestToRate(null)
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
      clearNotifications()
      clearAuth()
      useStatsStore.getState().resetStats()
      clearRequests()
      clearCategories()

      setIsLoggedIn(false)
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleRemoveExecutor = async (executorId: number) => {
    try {
      await api.delete(`/users/${executorId}`);
      fetchExecutors()
    } catch (error) {
      console.error("Failed to remove executor:", error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-red-500"
      case "normal":
        return "bg-blue-500"
      case "planned":
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

  const translateType = (type: string) => {
    switch (type) {
      case "urgent": return "Экстренная"
      case "normal": return "Обычная"
      case "planned": return "Плановая"
      default: return type
    }
  }

  const translateComplexity = (complexity: string) => {
    switch (complexity) {
      case "complex": return "комплексный";
      case "simple": return "простой";
      case "medium": return "средний";
      default: return complexity;
    }
  };

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

  const handleToggleLongTerm = async (requestId: number, requestGroupId: number, currentStatus: boolean) => {
    try {
      await api.patch(`/requests/${requestId}/long-term`, {
        is_long_term: !currentStatus
      });

      // Обновляем состояние в UI - обновляем под заявку внутри группы заявок
      const updateRequestGroups = (prev: RequestGroup[]) =>
          prev.map(group => {
            if (group.id === requestGroupId) {
              return {
                ...group,
                requests: group.requests.map(subRequest =>
                    subRequest.id === requestId
                        ? { ...subRequest, is_long_term: !currentStatus }
                        : subRequest
                )
              };
            }
            return group;
          });

      // Обновляем selectedRequest если он открыт и это та же группа заявок
      if (selectedRequest && selectedRequest.id === requestGroupId) {
        setSelectedRequest((prev: RequestGroup | null) => {
          if (prev) {
            return {
              ...prev,
              requests: prev.requests.map(subRequest =>
                  subRequest.id === requestId
                      ? { ...subRequest, is_long_term: !currentStatus }
                      : subRequest
              )
            };
          }
          return prev;
        });
      }

      // Обновляем все списки заявок
      setIncomingRequests(updateRequestGroups);
      setMyRequests(updateRequestGroups);

      // Показываем сообщение об успехе
      successModal.showSuccess({
        title: currentStatus ? "Задача снята с долгосрочных" : "Задача помечена как долгосрочная",
        message: currentStatus 
          ? "Задача больше не отображается как долгосрочная" 
          : "Задача помечена как долгосрочная и будет выделена синим цветом"
      });

    } catch (error: any) {
      console.error("Ошибка при изменении статуса долгосрочной задачи:", error);
      successModal.showSuccess({
        title: "Ошибка",
        message: error.response?.data?.error || "Не удалось изменить статус задачи"
      });
    }
  };

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
              userRole="department-head"
                  isSubRequest={false}
              onViewDetails={(request) => {
                setSelectedRequest(request);
                    openModal('requestDetails');
                  }}
            />
          </div>
        </div>
      </CardHeader>
    );
  };

  const handleRefresh = async () => {
    try {
      setRatingValue(0)
      setClientInfo({})
      setFormErrors(null)
      setCurrentUserId(null)
      setStats(null)
      setExecutors([])
      setNewExecutorName("")

      clearRequests();
      clearNotifications()

      await Promise.all([
        fetchRequests(),
        fetchStats(),
        fetchCategories(token!),
        fetchNotifications(),
        fetchExecutors(),
      ]);

    } catch (error) {
      console.error("Ошибка при обновлении:", error);
    }
  };

  const handleOpenRedirectModal = async (request: any) => {
    setSelectedRequestForRedirect(request);
    setRedirectError(null);
    setShowRedirectModal(true);
    openModal('redirectModal');
  };

  const handleCloseRedirectModal = () => {
    setShowRedirectModal(false);
    setSelectedRequestForRedirect(null);
    setSelectedCategoryId(null);
    setRedirectError(null);
    closeModalWithHistory();
  };

  const handleRedirectRequest = async () => {
    if (!selectedRequestForRedirect || !selectedCategoryId) return;

    setIsRedirecting(true);
    setRedirectError(null);

    try {
      // Используем выбранную категорию для перенаправления
      await api.patch(`/requests/${selectedRequestForRedirect.id}`, {
        status: "awaiting_assignment",
        executor_id: null,
        actual_completion_date: null,
        category_id: selectedCategoryId,
        patch_code: 1
      });

      // Проверяем, есть ли в главной заявке другие подзаявки с нашей категорией
      const requestGroup = selectedRequestForRedirect.requestGroup || selectedRequestForRedirect;
      const hasOtherSubRequestsWithOurCategory = requestGroup.requests?.some((subReq: any) => 
        subReq.id !== selectedRequestForRedirect.id && 
        subReq.category_id === user?.service_category_id
      );

      if (hasOtherSubRequestsWithOurCategory) {
        // Если есть другие подзаявки с нашей категорией, просто обновляем данные
        fetchRequests();
        successModal.showSuccess({
          title: "Подзаявка перенаправлена",
          message: `Подзаявка успешно перенаправлена руководителям категории "${categories.find(c => c.id === selectedCategoryId)?.name}"`
        });
      } else {
        // Если нет других подзаявок с нашей категорией, удаляем заявку из UI
        setMyRequests(prev => 
          prev.filter(req => req.id !== requestGroup.id)
        );
      setIncomingRequests(prev =>
          prev.filter(req => req.id !== requestGroup.id)
      );
      successModal.showSuccess({
        title: "Заявка перенаправлена",
          message: `Заявка успешно перенаправлена руководителям категории "${categories.find(c => c.id === selectedCategoryId)?.name}"`
        });
      }

      // Закрываем все модальные окна
      handleCloseRedirectModal();
      if (selectedRequest) {
        setSelectedRequest(null);
        closeModalWithHistory();
      }

    } catch (error: any) {
      console.error("Ошибка при перенаправлении заявки:", error);
      setRedirectError(error.response?.data?.error || "Не удалось перенаправить заявку");
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleAssignExecutors = (subRequest: any) => {
    setSelectedSubRequestForAssignment(subRequest);
    setShowAssignExecutorsModal(true);
    openModal('assignExecutorsModal');
  };

  const handleCloseAssignExecutorsModal = () => {
    setShowAssignExecutorsModal(false);
    setSelectedSubRequestForAssignment(null);
    closeModalWithHistory();
  };

  const handleAssignExecutorsSuccess = () => {
    // Обновляем данные после успешного назначения
    fetchRequests();
    successModal.showSuccess({
      title: "Исполнители назначены",
      message: "Исполнители успешно назначены на подзаявку"
    });
  };

  return (
      <>
        <Header
            setShowProfile={setShowProfile}
            handleLogout={handleLogout}
            notificationCount={3}
            role="Руководитель направления"
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
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Новые заявки</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats && stats.statusCounts && stats.statusCounts.new ? (stats.statusCounts.new) : 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">В работе</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats && stats.statusCounts && stats.statusCounts.inWork ? (stats.statusCounts.inWork) : 0}
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
                          {stats && stats.statusCounts && stats.statusCounts.completed ? (stats.statusCounts.completed) : 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Просрочено</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats && stats.statusCounts && stats.statusCounts.overdue ? (stats.statusCounts.overdue) : 0}
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
                  {isDesktop ? (
                      <div className="order-1 sm:order-2 w-full sm:w-auto">
                        <Button
                            onClick={() => router.push('/create-request')}
                            className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Создать заявку
                        </Button>
                      </div>
                  ): null}
                  {/* табы */}
                  <div className="order-2 sm:order-1 w-full sm:w-auto flex justify-center sm:justify-start">
                    <TabsList className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                      <TabsTrigger value="incoming" className="text-sm px-3 py-2 whitespace-nowrap">
                        <span className="hidden sm:inline">Входящие заявки</span>
                        <span className="sm:hidden">Входящие</span>
                      </TabsTrigger>
                      <TabsTrigger value="my-requests" className="text-sm px-3 py-2 whitespace-nowrap">
                        <span className="hidden sm:inline">Мои заявки</span>
                        <span className="sm:hidden">Мои</span>
                      </TabsTrigger>
                      <TabsTrigger value="recurring-tasks" className="text-sm px-3 py-2 whitespace-nowrap">
                        <span className="hidden sm:inline">Повторяющиеся</span>
                        <span className="sm:hidden">Повторяющиеся</span>
                      </TabsTrigger>
                      <TabsTrigger value="statistics" className="text-sm px-3 py-2 whitespace-nowrap">
                        Статистика
                      </TabsTrigger>
                      <TabsTrigger value="management" className="text-sm px-3 py-2 whitespace-nowrap">
                        <span className="hidden sm:inline">Управление</span>
                        <span className="sm:hidden">Управление</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>


                <TabsContent value="my-requests" className="pt-6 sm:pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myRequests.map((request, index: number) => (
                      <RequestCard
                          key={index}
                          request={request}
                          onCardClick={(request) => {
                              setSelectedRequest(request);
                            openModal('requestDetails');
                          }}
                          renderCardHeader={renderCardHeader}
                      />
                  ))}
            </div>
                </TabsContent>

                <TabsContent value="recurring-tasks">
                  <RecurringTasksList 
                    userRole="department-head" 
                    isDesktop={isDesktop}
                    onRateRequest={(subReq) => {
                      setRequestToRate(subReq)
                      setShowRatingModal(true)
                      openModal('ratingModal')
                      setSelectedRequest(null);
                      closeModalWithHistory()
                    }}
                    onRedirectToOtherDepartment={handleOpenRedirectModal}
                    onAssignExecutor={handleAssignExecutors}
                    onToggleLongTerm={handleToggleLongTerm}
                  />
                </TabsContent>

                <TabsContent value="incoming" className="pt-6 sm:pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-4">
                      <Select value={filterIncomingStatus} onValueChange={setFilterIncomingStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="in_progress">В обработке</SelectItem>
                          <SelectItem value="awaiting_assignment">Ожидает назначения</SelectItem>
                          <SelectItem value="execution">Исполнение</SelectItem>
                          <SelectItem value="completed">Завершено</SelectItem>
                          <SelectItem value="long_term">Долгосрочные</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterIncomingType} onValueChange={setFilterIncomingType}>
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
                      {filteredIncomingRequests.map((request, index: number) => (
                          <RequestCard
                              key={index}
                              request={request}
                              onCardClick={(request) => {
                                setSelectedRequest(request);
                                openModal('requestDetails');
                              }}
                              renderCardHeader={renderCardHeader}
                          />
                    ))}
                  </div>
                  </div>
                </TabsContent>

                <TabsContent value="statistics" className="pt-6 sm:pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="w-full">
                      <CardHeader>
                        <CardTitle className="text-base sm:text-lg break-words">Статистика по заявкам</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 text-sm sm:text-base">
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Всего заявок</span>
                            <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests) : 0}</span>
                          </div>
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Завершено</span>
                            <span className="font-bold text-green-600">
                              {stats && stats.statusCounts && stats.statusCounts.completed ? (stats.statusCounts.completed) : 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">В работе</span>
                            <span className="font-bold text-blue-600">
                              {stats && stats.statusCounts && stats.statusCounts.inWork ? (stats.statusCounts.inWork) : 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Просрочено</span>
                            <span className="font-bold text-red-600">
                              {stats && stats.statusCounts && stats.statusCounts.overdue ? (stats.statusCounts.overdue) : 0}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="w-full">
                      <CardHeader>
                        <CardTitle className="text-base sm:text-lg break-words">По типам заявок</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 text-sm sm:text-base">
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Обычные</span>
                            <span className="font-bold">
                              {stats && stats.requestTypeSummary && stats.requestTypeSummary.normal ? (stats.requestTypeSummary.normal) : 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Экстренные</span>
                            <span className="font-bold">
                              {stats && stats.requestTypeSummary && stats.requestTypeSummary.urgent ? (stats.requestTypeSummary.urgent) : 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center flex-wrap gap-1">
                            <span className="break-words">Плановые</span>
                            <span className="font-bold">
                              {stats && stats.requestTypeSummary && stats.requestTypeSummary.planned ? (stats.requestTypeSummary.planned) : 0}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>


                <TabsContent value="management" className="pt-6 sm:pt-0">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Управление сотрудниками</CardTitle>
                        <CardDescription>Добавление и просмотр исполнителей</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                              placeholder="Имя и Фамилия исполнителя"
                              value={newExecutorName}
                              onChange={(e) => setNewExecutorName(e.target.value)}
                          />
                          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}

                          <Input
                              placeholder="Email"
                              value={newExecutorEmail}
                              onChange={(e) => setNewExecutorEmail(e.target.value)}
                          />
                          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                              placeholder="Номер телефона"
                              value={newExecutorPhone}
                              onChange={(e) => setNewExecutorPhone(e.target.value)}
                          />
                          {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                        </div>
                        <Button
                            onClick={handleAddExecutor}
                            disabled={!newExecutorName.trim() || !newExecutorEmail.trim() || !newExecutorPhone.trim()}
                        >
                          Добавить исполнителя
                        </Button>
                        {/* Поиск исполнителей */}
                        <div className="mt-4">
                          <Input
                              placeholder="Поиск по имени"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>

                        {/* Список исполнителей */}
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                          {filteredExecutors.length === 0 ? (
                              <p className="text-sm text-gray-500">Нет подходящих исполнителей.</p>
                          ) : (
                              filteredExecutors.map((executor) => (
                                  <div
                                      key={executor.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                                  >
                                    <div>
                                      <p className="font-medium">{executor.user.full_name}</p>
                                      <p className="text-sm text-gray-600">{executor.specialty}</p>
                                      {executor.user.phone && (
                                        <p className="text-sm text-gray-500">{executor.user.phone}</p>
                                      )}
                                      <div className="flex items-center mt-1">
                                        {[...Array(5)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-3 h-3 rounded-full mr-1 ${
                                                    i < Math.floor(executor.rating)
                                                        ? "bg-yellow-400"
                                                        : "bg-gray-300"
                                                }`}
                                            />
                                        ))}
                                        <span className="text-sm text-gray-600 ml-2">
                                          {Number(executor.rating).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex flex-col items-end space-y-2">
                                      <div
                                          className={`px-2 py-1 rounded-full text-xs ${
                                              executor.workload <= 2
                                                  ? "bg-green-100 text-green-800"
                                                  : executor.workload <= 4
                                                      ? "bg-yellow-100 text-yellow-800"
                                                      : "bg-red-100 text-red-800"
                                          }`}
                                      >
                                        {executor.workload} задач
                                      </div>

                                          <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setExecutorToDelete(executor);
                                            setShowDeleteExecutorModal(true);
                                              }}
                                              className="text-red-500 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                    </div>
                                  </div>
                              ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6 mb-20">
              <UpcomingTasksWidget />
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
                  onClick={(e) => e.stopPropagation()} // Останавливаем всплытие только внутри модалки
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
                      <Label>Тип заявки</Label>
                      <Badge className={getTypeColor(selectedRequest.request_type)}>{translateType(selectedRequest.request_type)}</Badge>
                    </div>
                    <div>
                      <Label>Статус</Label>
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
                                        userRole="department-head"
                                        isSubRequest={true}
                                        onRateRequest={(subReq) => {
                                          setRequestToRate(subReq)
                                          setShowRatingModal(true)
                                          openModal('ratingModal')
                                          setSelectedRequest(null);
                                          closeModalWithHistory()
                                        }}
                                        onRedirectToOtherDepartment={handleOpenRedirectModal}
                                        onAssignExecutor={handleAssignExecutors}
                                        onToggleLongTerm={handleToggleLongTerm}
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

        {/* Create Request Modal */}
        <CreateRequestModal
          isOpen={showCreateRequestModal}
          onClose={() => {
            setShowCreateRequestModal(false);
            // Удаляем createRequest из стека модальных окон
            setModalStack(prev => prev.filter(modal => modal !== 'createRequest'));
          }}
          userRole="department-head"
          categories={categories}
          onSubmit={handleCreateDepartmentRequest}
          isSubmitting={isSubmitting}
          formErrors={formErrors}
          executors={executors}
          userServiceCategoryId={user?.service_category_id}
          
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
            title={"Оценить клиента"}
            description={`Пожалуйста, оцените взаимодействие по заявке #${requestToRate?.id}`}
        />

        {/* Map Modal */}
        <MapModal
            isOpen={showMapModal}
            onClose={() => {
              setShowMapModal(false);
              closeModalWithHistory();
            }}
            mapLocation={mapLocation}
        />
        {/* Redirect Modal */}
        {showRedirectModal && selectedRequestForRedirect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Перенаправить подзаявку #{selectedRequestForRedirect.id}</CardTitle>
                <CardDescription>
                  Выберите категорию, к которой нужно перенаправить подзаявку
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="category">Категория</Label>
                  <Select
                    value={selectedCategoryId?.toString() || ""}
                    onValueChange={(value) => setSelectedCategoryId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(category => category.id !== selectedRequestForRedirect.category_id)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Подзаявка будет перенаправлена всем руководителям с категорией "{categories.find(c => c.id === selectedCategoryId)?.name || 'выбранная категория'}"
                    </span>
                  </div>
                </div>
                {redirectError && (
                  <p className="text-sm text-red-500">{redirectError}</p>
                )}
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseRedirectModal}
                  >
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleRedirectRequest} 
                    disabled={!selectedCategoryId || isRedirecting}
                  >
                    {isRedirecting ? "Перенаправление..." : "Перенаправить"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <RejectRequestModal
            isOpen={rejectModal.isOpen}
            onClose={rejectModal.hideReject}
            title={rejectModal.title}
            message={rejectModal.message}
            duration={rejectModal.duration}
        />

        <SuccessModal
            isOpen={successModal.isOpen}
            onClose={successModal.hideSuccess}
            title={successModal.title}
            message={successModal.message}
            duration={successModal.duration}
        />

        {/* Unified Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteExecutorModal && !!executorToDelete}
          onClose={() => {
            setShowDeleteExecutorModal(false);
            setExecutorToDelete(null);
          }}
          onConfirm={() => {
            if (executorToDelete) {
              handleRemoveExecutor(executorToDelete.user.id);
              setExecutorToDelete(null);
              setShowDeleteExecutorModal(false);
            }
          }}
          title="Удалить исполнителя?"
          description={`Это действие нельзя отменить. Вы действительно хотите удалить исполнителя ${executorToDelete?.user.full_name}?`}
        />

        <BottomNav

            activeTab="history"
            hidden={showCreateRequestModal || !!selectedRequest || showMapModal || showRatingModal || showProfile || isModalOpen || !!selectedPhoto || showRedirectModal || showAssignExecutorsModal}
        />
        {isDesktop && <Link
            href="/chat-bot"
            className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-14 h-14 bg-purple-100 text-purple-600 rounded-full shadow-lg hover:bg-purple-200 transition"
        >
          <MessageCircle className="w-7 h-7" />

        </Link>}

        {/* Модальное окно информации об иконках */}
        <IconInfoModal
            isOpen={!!showIconInfo}
            onClose={() => setShowIconInfo(null)}
            iconInfo={showIconInfo}
            isDesktop={isDesktop}
        />

        {/* Модальное окно назначения исполнителей */}
        <AssignExecutorsModal
            isOpen={showAssignExecutorsModal}
            onClose={handleCloseAssignExecutorsModal}
            subRequest={selectedSubRequestForAssignment}
            executors={executors}
            userServiceCategoryId={user?.service_category_id}
            onSuccess={handleAssignExecutorsSuccess}
        />
      </>
  )
}