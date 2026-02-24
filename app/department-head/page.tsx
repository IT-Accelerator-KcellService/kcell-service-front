"use client"

import React, {useCallback, useEffect, useState, useRef, useMemo} from "react"
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
  FileSpreadsheet,
  Building2,
  LayoutGrid,
  BarChart3,
} from "lucide-react"


import Header from "@/app/header/Header"
import api, { getOffices } from "@/lib/api";
import {useRouter, useSearchParams} from "next/navigation";
import Image from "next/image";
import {useNotificationStore} from "@/stores/notificationStore";
import { useToast } from "@/hooks/use-toast";
import {BottomNav} from "@/components/BottomNav";
import {useMediaQuery} from "@/hooks/use-media-query";
import {NotificationsSidebar} from "@/components/notification/NotificationsSidebar";
import {Request, RequestGroup, SubRequest, useRequestStore} from "@/stores/useRequestStore";
import PullToRefresh from "@/components/pull-to-refresh";
import Link from "next/link";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import {RoleBasedActionMenu} from "@/components/action-menu/RoleBasedActionMenu";
import {DeleteConfirmationModal} from "@/components/DeleteConfirmationModal";
import {MapModal} from "@/components/MapModal";
import {RatingModal} from "@/components/RatingModal";
import {RequestCard} from "@/components/RequestCard";
import {CreateRequestModal} from "@/components/CreateRequestModal";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {IconInfoModal} from "@/components/IconInfoModal";
import {getSubRequestDisplayId} from "@/lib/subRequestUtils";
import { getPreviewUrl } from "@/lib/imageOptimization";
import { createClickableRequestIds } from '@/lib/notificationUtils';
import { RequestNotFoundModal } from '@/components/RequestNotFoundModal';
import {CommentsModal} from "@/components/CommentsModal";
import {useRejectRequestModal} from "@/hooks/use-reject-modal";
import {RejectRequestModal} from "@/components/RejectRequestModal";
import {AssignExecutorsModal} from "@/components/AssignExecutorsModal";
import {ChangeExecutorsModal} from "@/components/ChangeExecutorsModal";
import {CompletedTaskReport} from "@/components/CompletedTaskReport";
import SubRequestInfo from "@/components/SubRequestInfo";
import Executors from "@/components/Executors";
import { RecurringTasksList, UpcomingTasksWidget } from "@/components/recurring-tasks";
import { ImportExcelModal } from "@/components/ImportExcelModal";
import PhotoModal from "@/components/photo/PhotoModal";
import { MeetingRoomsCatalog } from "@/components/meeting-rooms/MeetingRoomsCatalog";
import DepartmentHeadAnalytics from "@/components/DepartmentHeadAnalytics";

interface User {
  id: number
  full_name: string
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
    awaitingAssignment: number,
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
  const { toast } = useToast()
  const rejectModal = useRejectRequestModal()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("meeting-rooms")
  const [meetingRoomsTab, setMeetingRoomsTab] = useState<"book" | "my-bookings">("book")
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [showNotFoundModal, setShowNotFoundModal] = useState(false)
  const [notFoundRequestId, setNotFoundRequestId] = useState<string>('')

  const [showIconInfo, setShowIconInfo] = useState<{type: 'status' | 'longTerm', value: string} | null>(null);
  const [showComments, setShowComments] = useState<number | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<Request | null>(null)
  const [ratingComment, setRatingComment] = useState("")
  const {incomingRequests, setIncomingRequests, myRequests, setMyRequests, clearRequests} = useRequestStore()
  const [clientInfo, setClientInfo] = useState<Record<number, User>>({})
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 })
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, created_at?: string} | null>(null)
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
  const prevFilterStatus = useRef("all")
  const isInitialized = useRef(false)
  const [stats, setStats] = useState<Stats | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false); // Защита от дублирования запросов
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Throttle для observer
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [selectedRequestForRedirect, setSelectedRequestForRedirect] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [showAssignExecutorsModal, setShowAssignExecutorsModal] = useState(false);
  const [selectedSubRequestForAssignment, setSelectedSubRequestForAssignment] = useState<any>(null);
  const [showChangeExecutorsModal, setShowChangeExecutorsModal] = useState(false);
  const [selectedSubRequestForChange, setSelectedSubRequestForChange] = useState<any>(null);
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [upcomingTasksRefreshTrigger, setUpcomingTasksRefreshTrigger] = useState(0);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)

  const [modalStack, setModalStack] = useState<string[]>([]);
  const [userRatings, setUserRatings] = useState<Record<number, any>>({});
  const [isClosingProgrammatically, setIsClosingProgrammatically] = useState(false);
  const [offices, setOffices] = useState<any[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<any>(null);

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
          setShowCreateRequestModal(false);
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
          break;
        case 'executorDelete':
          setExecutorToDelete(null);
          break;
        case 'redirectModal':
          setShowRedirectModal(false);
          setSelectedRequestForRedirect(null);
          setSelectedCategoryId(null);
          setRedirectError(null);
          break;
        case 'recurringTaskDetails':
          // Закрытие модального окна повторяющихся задач обрабатывается в RecurringTasksList
          break;
        case 'taskHistory':
          // Закрытие модального окна истории задач обрабатывается в RecurringTasksList
          break;
        case 'deleteRequestModal':
          setShowDeleteRequestModal(false);
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
            break;
          case 'executorDelete':
            setExecutorToDelete(null);
            break;
          case 'redirectModal':
            handleCloseRedirectModal();
            break;
          case 'recurringTaskDetails':
            // Закрытие модального окна повторяющихся задач обрабатывается в RecurringTasksList
            break;
          case 'taskHistory':
            // Закрытие модального окна истории задач обрабатывается в RecurringTasksList
            break;
          case 'deleteRequestModal':
            setShowDeleteRequestModal(false);
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
      setRatingComment("");
    }
    if (modalName !== 'executorDelete') {
      setExecutorToDelete(null);
    }
    if (modalName !== 'redirectModal') {
      handleCloseRedirectModal();
    }
    if (modalName !== 'deleteRequestModal') {
      setShowDeleteRequestModal(false);
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
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")

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

    // Обработка параметров фильтров из URL (только если уже инициализирован)
    // При первой загрузке это обрабатывается в INITIAL LOAD
    if (isInitialized.current) {
      if (status && filterIncomingStatus !== status) {
        setFilterIncomingStatus(status);
      }
      
      if (priority && filterIncomingType !== priority) {
        setFilterIncomingType(priority);
      }
    }
    // Если еще не инициализирован, фильтры будут установлены в INITIAL LOAD
  }, [searchParams, filterIncomingStatus, filterIncomingType])

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

    // Проверяем, что заявки загружены
    if (incomingRequests.length === 0 && myRequests.length === 0) {
      return;
    }

    const idToUse = pendingRequestId || requestId;
    const subIdToUse = pendingSubRequestId || subRequestId;

    if (idToUse && !selectedRequest) {
      // Объединяем все списки заявок
      const allRequests = [...incomingRequests, ...myRequests];
      const foundRequest = allRequests.find(r => r.id === parseInt(idToUse));
      
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
  }, [searchParams, incomingRequests, myRequests, selectedRequest, pendingRequestId, pendingSubRequestId, openModal]);

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
    phone: "",
  })

  const validateFullName = (name: string) => {
    return /^([А-ЯӘӨҚҢҮҰҺІЁ][а-яәөқңүұһіё]+)\s([А-ЯӘӨҚҢҮҰҺІЁ][а-яәөқңүұһіё]+)$/.test(name.trim())
  }
  const filteredExecutors = executors.filter((executor) =>
      executor.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      executor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  )



  const handleAddExecutor = async () => {
    const name = newExecutorName.trim()
    const phone = newExecutorPhone.trim()

    const newErrors = {
      name: name
          ? validateFullName(name)
              ? ""
              : "Введите корректное полное имя (например: Иван Иванов)"
          : "Введите имя",
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
        phone,
      })
      fetchExecutors()
      setNewExecutorName("")
      setNewExecutorEmail("")
      setNewExecutorPhone("")
      setErrors({ name: "", phone: "" })
    } catch (error) {
      console.error("Failed to add executor:", error)
    }
  }

  const checkUserRating = useCallback(async (requestId: number) => {
    try {
      const response = await api.get(`/ratings/request/${requestId}`);
      if(response.data.success && response.data.data.length > 0) {
          const ratingData = response.data.data[0];
          setUserRatings(prev => ({
            ...prev,
            [requestId]: {
              ...ratingData,
              comments: ratingData.comments || [] // Используем comments из ответа API
            }
          }));
      }
    } catch (error) {
      console.error("Failed to check user rating:", error);
    }
  }, []);

  const fetchRequests = useCallback(async (currentPage = 1, pageSize = 10) => {
    // Защита от множественных одновременных запросов (включая страницу 1)
    if (isLoadingRef.current) {
      console.log('Fetch already in progress, skipping page', currentPage);
      return;
    }

    console.log('fetchRequests called:', { currentPage, filterIncomingStatus });

    isLoadingRef.current = true;
    setLoading(true);

    try {
      // Создаем параметры запроса
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString()
      });

      // Добавляем фильтр статуса если он не "all"
      if (filterIncomingStatus !== "all" && filterIncomingStatus !== "long_term") {
        params.append('status', filterIncomingStatus);
      }

      // Добавляем фильтр приоритета если он не "all"
      if (filterIncomingType !== "all") {
        params.append('priority', filterIncomingType);
      }

      const response: any = await api.get(`/request-groups?${params.toString()}`);

      const otherRequests: Request[] = response.data.otherRequests || [];
      const myRequests: Request[] = response.data.myRequests || [];

      console.log('=== FETCH REQUESTS DEPARTMENT-HEAD ===');
      console.log('Current page:', currentPage);
      console.log('Page size:', pageSize);
      console.log('Other requests count:', otherRequests.length);
      console.log('My requests count:', myRequests.length);
      console.log('Total received:', otherRequests.length + myRequests.length);
      console.log('Note: Sorting is done on backend');

      // Проверяем рейтинги для завершенных заявок (до обновления состояния)
      const allRequests = [...otherRequests, ...myRequests];
      allRequests.forEach((requestGroup) => {
        requestGroup.requests.forEach((subRequest) => {
          if (subRequest.status === "completed") {
            checkUserRating(subRequest.id);
          }
        });
      });

      // Обновляем состояние с учетом пагинации
      // Бэкенд уже отсортировал данные, используем их напрямую
      setIncomingRequests((prev) => {
        const newItems = currentPage === 1
          ? otherRequests
          : [...prev, ...otherRequests.filter(item => !prev.some(p => p.id === item.id))];
        console.log('Incoming requests - previous:', prev.length, 'new:', newItems.length);
        return newItems;
      });

      setMyRequests((prev) => {
        const newItems = currentPage === 1
          ? myRequests
          : [...prev, ...myRequests.filter(item => !prev.some(p => p.id === item.id))];
        console.log('My requests - previous:', prev.length, 'new:', newItems.length);
        return newItems;
      });

      // Обновляем флаг hasMore
      // Проверяем, есть ли еще данные - если хотя бы один массив вернул полный pageSize, значит есть еще
      const otherRequestsLength = otherRequests.length;
      const myRequestsLength = myRequests.length;

      // Более точная логика: если текущая страница 1 и данные меньше pageSize, то точно нет следующих страниц
      // Если данные равны pageSize, возможно есть еще
      let hasMoreData = false;
      if (currentPage === 1) {
        // На первой странице: если данные меньше pageSize, значит больше нет
        // Если данные равны pageSize, возможно есть еще
        hasMoreData = otherRequestsLength >= pageSize || myRequestsLength >= pageSize;
      } else {
        // На последующих страницах: если данные меньше pageSize, значит это последняя страница
        // Если данные равны pageSize, возможно есть еще
        hasMoreData = otherRequestsLength >= pageSize || myRequestsLength >= pageSize;
      }

      console.log('Has more data:', hasMoreData, '(other:', otherRequestsLength, 'my:', myRequestsLength, 'pageSize:', pageSize, 'page:', currentPage, ')');
      setHasMore(hasMoreData);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [filterIncomingStatus, checkUserRating]);

  const fetchExecutors = useCallback(async () => {
    try {
      const response = await api.get('/executors')
      setExecutors(response.data)
    } catch (error) {
      console.error("Failed to fetch executors:", error)
    }
  }, []);

  const fetchOffices = async () => {
    try {
      const res = await getOffices();
      setOffices(res.data);
    } catch (error) {
      console.error('Ошибка при загрузке офисов:', error);
    }
  }

  const lastRequestRef = useCallback((node: HTMLDivElement | null) => {
    lastElementRef.current = node;
  }, []);

  useEffect(() => {
    if (loading) return;

    // Не создаем observer если нет данных или пагинация отключена
    if (!hasMore && page === 1 && incomingRequests.length === 0) return;

    // Не создаем observer если данные еще загружаются или запрос в процессе
    if (isLoadingRef.current) return;

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver((entries) => {
      // Проверяем все условия перед загрузкой следующей страницы
      if (entries[0].isIntersecting && hasMore && !loading && !isLoadingRef.current) {
        // Throttle: предотвращаем множественные вызовы при быстром скролле
        if (throttleTimeoutRef.current) {
          return;
        }

        // Проверяем еще раз перед установкой throttle (race condition protection)
        if (isLoadingRef.current || loading || !hasMore) {
          return;
        }

        throttleTimeoutRef.current = setTimeout(() => {
          throttleTimeoutRef.current = null;
        }, 500); // 500ms throttle

        // Проверяем еще раз все условия (race condition protection)
        if (isLoadingRef.current || loading || !hasMore) {
          return;
        }

        setPage((prevPage) => {
          const nextPage = prevPage + 1;
          console.log('Observer triggered: loading page', nextPage);
          // fetchRequests сам установит isLoadingRef.current = true
          fetchRequests(nextPage);
          return nextPage;
        });
      }
    }, {
      // Опции для лучшей производительности
      rootMargin: '100px', // Начинаем загрузку за 100px до конца
    });

    // Добавляем небольшую задержку перед подключением observer
    // чтобы избежать немедленного срабатывания после загрузки данных
    const timeoutId = setTimeout(() => {
      if (lastElementRef.current && !loading && !isLoadingRef.current) {
        observer.current?.observe(lastElementRef.current);
      }
    }, 100);

    // Cleanup функция для observer
    return () => {
      clearTimeout(timeoutId);
      if (observer.current) {
        observer.current.disconnect();
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
    };
  }, [loading, hasMore, page, fetchRequests]);

  useEffect(() => {
    // Инициализация данных при первом рендере
    if (isLoggedIn && !isInitialized.current) {
      // Читаем параметры из URL перед загрузкой
      const status = searchParams.get("status");
      const priority = searchParams.get("priority");
      
      // Устанавливаем фильтры из URL
      if (status) {
        setFilterIncomingStatus(status);
        prevFilterStatus.current = status;
      }
      if (priority) {
        setFilterIncomingType(priority);
      }
      
      // Загружаем данные с учетом фильтров из URL
      // Используем параметры напрямую из searchParams, а не из состояния
      const params = new URLSearchParams({
        page: '1',
        pageSize: '10'
      });
      
      if (status && status !== "all" && status !== "long_term") {
        params.append('status', status);
      }
      if (priority && priority !== "all") {
        params.append('priority', priority);
      }
      
      // Загружаем данные с правильными фильтрами из URL
      setLoading(true);
      isLoadingRef.current = true;
      api.get(`/request-groups?${params.toString()}`)
        .then((response) => {
          const otherRequests: Request[] = response.data.otherRequests || [];
          const myRequests: Request[] = response.data.myRequests || [];
          
          // Проверяем рейтинги для завершенных заявок
          const allRequests = [...otherRequests, ...myRequests];
          allRequests.forEach((requestGroup) => {
            requestGroup.requests.forEach((subRequest) => {
              if (subRequest.status === "completed") {
                checkUserRating(subRequest.id);
              }
            });
          });
          
          // Бэкенд уже отсортировал данные, используем их напрямую
          setIncomingRequests(otherRequests);
          setMyRequests(myRequests);
          setHasMore(otherRequests.length === 10);
          setPage(1);
          isInitialized.current = true;
        })
        .catch((error: any) => {
          console.error("Ошибка при загрузке заявок:", error);
          if (error.response?.status === 401) {
            clearAuth();
            router.push("/login");
          }
        })
        .finally(() => {
          setLoading(false);
          isLoadingRef.current = false;
        });
      
      fetchExecutors();
      fetchOffices();
    }
  }, [isLoggedIn, searchParams, checkUserRating]);

  // Перезагружаем данные при изменении фильтров (только если уже инициализирован)
  useEffect(() => {
    if (isInitialized.current && filterIncomingStatus !== prevFilterStatus.current) {
      // Отключаем observer перед сбросом
      if (observer.current) {
        observer.current.disconnect();
      }

      // Сбрасываем все состояния пагинации
      setPage(1);
      setHasMore(true);
      setIncomingRequests([]);
      setMyRequests([]);
      isLoadingRef.current = false; // Сбрасываем флаг загрузки

      // Очищаем throttle
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }

      // Обновляем prevFilterStatus
      prevFilterStatus.current = filterIncomingStatus;

      // Загружаем данные без задержки
      fetchRequests(1);
    }
  }, [filterIncomingStatus, fetchRequests])

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

  // Фильтрация входящих заявок (мемоизировано для производительности)
  const filteredIncomingRequests = useMemo(() => {
    return incomingRequests.filter((request) => {
      const statusMatch = filterIncomingStatus === "all"   ||
          (filterIncomingStatus === "long_term" ? request.requests.some(req => req.is_long_term && request.request_type !== 'recurring') :
           filterIncomingStatus === "overdue" ? true : request.status === filterIncomingStatus);
      const typeMatch = filterIncomingType === "all" || request.request_type === filterIncomingType;
      return statusMatch && typeMatch;
    });
  }, [incomingRequests, filterIncomingStatus, filterIncomingType]);

  const handleCreateDepartmentRequest = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors(null);

    try {
      // Проверяем, является ли это повторяющейся задачей
      const requestType = formData.get('request_type');
      // Обрабатываем случай, когда request_type приходит как массив
      const finalRequestType = Array.isArray(requestType) ? requestType[0] : requestType;
      const isRecurring = finalRequestType === 'recurring';

      
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
        
        toast({
          title: "Повторяющаяся задача создана!",
          description: "Задача будет автоматически создавать экземпляры согласно расписанию."
        });
      } else {
        // Получаем данные из FormData
        const requestType = finalRequestType; // Используем уже обработанное значение
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
          toast({
            title: "Заявка создана и исполнители назначены!",
            description: "Заявка успешно создана и передана исполнителям."
          });
        } else {
          toast({
            title: "Заявка создана!",
            description: "Заявка отправлена на рассмотрение администратора."
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

        setShowRatingModal(false);
        closeModalWithHistory();
        setRatingValue(0)
        setRequestToRate(null)
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
        return "bg-[#E25B21] text-white border-[#E25B21]"
      case "awaiting_assignment":
      case "awaiting_sla":
        return "bg-amber-400 text-gray-900 border-amber-400"
      case "assigned":
        return "bg-[#E25B21] text-white border-[#E25B21]"
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
        return "bg-[#E25B21] text-white border-[#E25B21]"
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
      toast({
        title: currentStatus ? "Задача снята с долгосрочных" : "Задача помечена как долгосрочная",
        description: currentStatus 
          ? "Задача больше не отображается как долгосрочная" 
          : "Задача теперь отображается как долгосрочная"
      });

    } catch (error: any) {
      console.error("Ошибка при изменении статуса долгосрочной задачи:", error);
      toast({
        title: "Ошибка",
        description: error.response?.data?.error || "Не удалось изменить статус задачи",
        variant: "destructive"
      });
    }
  };

  const handleDeleteRecurringTask = async (taskId: number) => {
    try {
      await api.delete(`/recurring-tasks/${taskId}`);

      // Обновляем виджет предстоящих задач
      setUpcomingTasksRefreshTrigger(prev => prev + 1);

      toast({
        title: "Успешно",
        description: "Повторяющаяся задача удалена"
      });
    } catch (error) {
      console.error("Failed to delete recurring task:", error);
      rejectModal.showReject({
        title: "Ошибка",
        message: "Не удалось удалить повторяющуюся задачу"
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

  const handleDeleteRequest = async (request: Request) => {
    try {
      await api.delete(`/request-groups/${request.id}`)
      fetchRequests()
      toast({
        title: "Заявка удалена",
        description: "Заявка была успешно удалена."
      })
    } catch (error) {
      console.error("Failed to delete request:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить заявку.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteSubRequest = async (subRequest: SubRequest) => {
    try {
      await api.delete(`/requests/${subRequest.id}`)

      // Обновляем состояние - удаляем под заявку из группы
      if (selectedRequest) {
        const updatedRequests = selectedRequest.requests.filter((req: { id: number }) => req.id !== subRequest.id)
        const updatedRequestGroup = {
          ...selectedRequest,
          requests: updatedRequests
        }
        setSelectedRequest(updatedRequestGroup)

        // Обновляем в store
        const currentMyRequests = useRequestStore.getState().myRequests
        const updatedStoreMyRequests = currentMyRequests.map(req =>
            req.id === selectedRequest.id ? updatedRequestGroup : req
        ).filter(req => req.requests.length > 0)
        const currentIncomingRequests = useRequestStore.getState().incomingRequests
        const updatedStoreIncomingRequests = currentIncomingRequests.map(req =>
            req.id === selectedRequest.id ? updatedRequestGroup : req
        ).filter(req => req.requests.length > 0)
        useRequestStore.getState().setMyRequests(updatedStoreMyRequests)
        useRequestStore.getState().setIncomingRequests(updatedStoreIncomingRequests)

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

  const renderCardHeader = (requestGroup: RequestGroup) => {
    const isLongTerm = requestGroup.requests.some(req => req.is_long_term);
    // Убрали счетчик подзаявок - теперь показываем только один заявка

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
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                isLongTerm 
                  ? 'text-white bg-[#1A9A8A]' 
                  : requestGroup.request_type === 'urgent'
                    ? 'text-white bg-[#D94F15]'
                    : requestGroup.request_type === 'planned'
                      ? 'text-white bg-[#1A9A8A]'
                      : 'text-white bg-[#E25B21]'
              }`}>
                {requestGroup.request_type === 'urgent' ? 'Экстренная' : requestGroup.request_type === 'planned' ? 'Плановая' : 'Обычная'}
              </span>
            </div>
          </div>
          <div className="flex gap-1 items-center">
              {renderStatusWithTooltip(requestGroup.status)}
              {isLongTerm && requestGroup.request_type !== 'recurring' && renderLongTermWithTooltip(true)}
            <RoleBasedActionMenu
                  request={requestGroup}
                  isDesktop={isDesktop}
                  userRole="department-head"
                  isSubRequest={false}
                  onViewDetails={(request) => {
                    setSelectedRequest(request);
                    openModal('requestDetails');
                  }}
                  onDelete={(requestGroup) => {
                    setSelectedRequest(requestGroup);
                    setShowDeleteRequestModal(true);
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
      setOffices([])

      clearRequests();
      clearNotifications()

      await Promise.all([
        fetchRequests(),
        fetchStats(),
        fetchCategories(token!),
        fetchNotifications(),
        fetchExecutors(),
          fetchOffices()
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
        toast({
          title: "Подзаявка перенаправлена",
          description: `Подзаявка успешно перенаправлена руководителям категории "${categories.find(c => c.id === selectedCategoryId)?.name}"`
        });
      } else {
        // Если нет других подзаявок с нашей категорией, удаляем заявку из UI
        setMyRequests(prev => 
          prev.filter(req => req.id !== requestGroup.id)
        );
      setIncomingRequests(prev =>
          prev.filter(req => req.id !== requestGroup.id)
      );
      toast({
        title: "Заявка перенаправлена",
        description: `Заявка успешно перенаправлена руководителям категории "${categories.find(c => c.id === selectedCategoryId)?.name}"`
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
    setSelectedRequest(null);
    closeModalWithHistory();
  };

  const handleAssignExecutorsSuccess = () => {
    // Оптимистичное обновление уже выполнено в AssignExecutorsModal
    // Просто показываем сообщение об успехе
    toast({
      title: "Исполнители назначены",
      description: "Исполнители успешно назначены на заявку"
    });
  };

  const handleChangeExecutors = (subRequest: any) => {
    setSelectedSubRequestForChange(subRequest);
    setShowChangeExecutorsModal(true);
    openModal('changeExecutorsModal');
  };

  const handleCloseChangeExecutorsModal = () => {
    setShowChangeExecutorsModal(false);
    setSelectedSubRequestForChange(null);
    closeModalWithHistory();
  };

  const handleChangeExecutorsSuccess = () => {
    // Оптимистичное обновление уже выполнено в ChangeExecutorsModal
    // Просто показываем сообщение об успехе
    toast({
      title: "Исполнители изменены",
      description: "Исполнители успешно изменены для подзаявки"
    });
    setSelectedRequest(null);
    closeModalWithHistory();
  };

  return (
      <>
        <Header
            handleLogout={handleLogout}
            notificationCount={3}
            role="Офис менеджер"
        />
        <PullToRefresh onRefresh={handleRefresh}>
      <div 
        className="min-h-screen relative z-10"
        style={{ 
          background: 'linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 25%, #E25B21 45%, #E25B21 70%, #4A2510 90%, #1C1C1E 100%)',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-8">
          {/* Quick Stats */}
          <div 
            className="rounded-t-[32px] px-4 pt-6 pb-8 lg:px-8"
            style={{ 
              background: 'linear-gradient(180deg, #E25B21 0%, #E25B21 60%, #4A2510 85%, #1C1C1E 100%)',
              minHeight: isDesktop ? 'auto' : 'calc(100vh - 200px)',
            }}
          >
          {isDesktop ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="rounded-2xl p-6" style={{ background: '#D94F15' }}>
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-white/20">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-white/80">Новые заявки</p>
                      <p className="text-2xl font-bold text-white">
                        {stats && stats.statusCounts && stats.statusCounts.new ? (stats.statusCounts.new) : 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl p-6" style={{ background: '#1A9A8A' }}>
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-white/20">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-white/80">В работе</p>
                      <p className="text-2xl font-bold text-white">
                        {stats && stats.statusCounts && stats.statusCounts.inWork ? (stats.statusCounts.inWork) : 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl p-6" style={{ background: '#1A9A8A' }}>
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-white/20">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-white/80">Завершено</p>
                      <p className="text-2xl font-bold text-white">
                        {stats && stats.statusCounts && stats.statusCounts.completed ? (stats.statusCounts.completed) : 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl p-6" style={{ background: '#D94F15' }}>
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-white/20">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-white/80">Просрочено</p>
                      <p className="text-2xl font-bold text-white">
                        {stats && stats.statusCounts && stats.statusCounts.overdue ? (stats.statusCounts.overdue) : 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
          ): null}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="mb-3">
                  {/* на телефоне только табы */}
                  <div className="w-full mb-2 sm:hidden">
                    <div className="overflow-x-auto">
                      <TabsList className="flex w-max min-w-full bg-[#3A3A3C] p-1 rounded-xl gap-1">
                        <TabsTrigger value="meeting-rooms" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0 gap-2 data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                          <span className="sm:hidden flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            Переговорные
                          </span>
                          <span className="hidden sm:inline">Переговорные</span>
                        </TabsTrigger>
                        <TabsTrigger value="incoming" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0 gap-2 data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                          <span className="sm:hidden">Входящие</span>
                        </TabsTrigger>
                        <TabsTrigger value="my-requests" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0 gap-2 data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                          <span className="sm:hidden">Мои</span>
                        </TabsTrigger>
                        <TabsTrigger value="recurring-tasks" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0 gap-2 data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                          <span className="sm:hidden">Повторяющиеся</span>
                        </TabsTrigger>
                        <TabsTrigger value="statistics" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0 gap-2 data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                          <span className="sm:hidden">Аналитика</span>
                          <span className="hidden sm:inline">Аналитика</span>
                        </TabsTrigger>
                        <TabsTrigger value="management" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0 gap-2 data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                          <span className="sm:hidden flex items-center gap-1">
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Управление
                          </span>
                          <span className="hidden sm:inline">Управление</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </div>

                  {/* на больших экранах */}
                  <div className="hidden sm:flex justify-between items-center gap-3">
                    <div className="flex-1 overflow-x-auto">
                      <TabsList className="flex min-w-max gap-2 bg-[#3A3A3C] p-1 rounded-xl">
                        <TabsTrigger value="meeting-rooms" className="text-sm px-3 py-2 whitespace-nowrap flex items-center gap-2 data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                          <Building2 className="h-4 w-4" />
                          Переговорные
                        </TabsTrigger>
                      <TabsTrigger value="incoming" className="text-sm px-3 py-2 whitespace-nowrap data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                          Входящие заявки
                      </TabsTrigger>
                      <TabsTrigger value="my-requests" className="text-sm px-3 py-2 whitespace-nowrap data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                          Мои заявки
                      </TabsTrigger>
                      <TabsTrigger value="recurring-tasks" className="text-sm px-3 py-2 whitespace-nowrap data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                          Повторяющиеся
                      </TabsTrigger>
                      <TabsTrigger value="statistics" className="text-sm px-3 py-2 whitespace-nowrap data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                        Аналитика
                      </TabsTrigger>
                        <TabsTrigger value="management" className="text-sm px-3 py-2 whitespace-nowrap flex items-center gap-2 data-[state=active]:bg-[#E25B21] data-[state=active]:text-white text-white/80 rounded-lg">
                          <LayoutGrid className="h-4 w-4" />
                          Управление
                      </TabsTrigger>
                    </TabsList>
                    </div>
                    <Button
                        onClick={() => router.push('/create-request')}
                        className="bg-[#E25B21] hover:bg-[#D94F15] text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Создать заявку
                    </Button>
                  </div>
                </div>


                <TabsContent value="my-requests" className="pt-2 sm:pt-0">
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

                <TabsContent value="statistics" className="pt-2 sm:pt-0">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <h3 className="text-base font-bold text-white mb-3">Статистика по заявкам</h3>
                        <div className="space-y-2 text-sm text-white/90">
                          <div className="flex justify-between"><span>Ожидает назначения</span><span className="font-bold">{stats?.statusCounts?.awaitingAssignment ?? 0}</span></div>
                          <div className="flex justify-between"><span>Всего заявок</span><span className="font-bold">{stats?.totalRequests ?? 0}</span></div>
                          <div className="flex justify-between"><span>Завершено</span><span className="font-bold">{stats?.statusCounts?.completed ?? 0}</span></div>
                          <div className="flex justify-between"><span>В работе</span><span className="font-bold">{stats?.statusCounts?.inWork ?? 0}</span></div>
                          <div className="flex justify-between"><span>Просрочено</span><span className="font-bold">{stats?.statusCounts?.overdue ?? 0}</span></div>
                        </div>
                      </div>
                      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <h3 className="text-base font-bold text-white mb-3">По типам заявок</h3>
                        <div className="space-y-2 text-sm text-white/90">
                          <div className="flex justify-between"><span>Обычные</span><span className="font-bold">{stats?.requestTypeSummary?.normal ?? 0}</span></div>
                          <div className="flex justify-between"><span>Экстренные</span><span className="font-bold">{stats?.requestTypeSummary?.urgent ?? 0}</span></div>
                          <div className="flex justify-between"><span>Плановые</span><span className="font-bold">{stats?.requestTypeSummary?.planned ?? 0}</span></div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                      <h3 className="text-base sm:text-lg font-bold text-white mb-4">Аналитика</h3>
                      <DepartmentHeadAnalytics />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="recurring-tasks">
                  <RecurringTasksList 
                    userRole="department-head" 
                    isDesktop={isDesktop}
                    onRateRequest={(subReq) => {
                      setRequestToRate(subReq)
                      // Устанавливаем текущий рейтинг как начальное значение, если он существует
                      const currentRating = userRatings[subReq.id]?.rating || 0;
                      setRatingValue(currentRating);
                      setRatingComment(""); // Сбрасываем комментарий
                      setShowRatingModal(true)
                      openModal('ratingModal')
                    }}
                    onRedirectToOtherDepartment={handleOpenRedirectModal}
                    onAssignExecutor={handleAssignExecutors}
                    onToggleLongTerm={handleToggleLongTerm}
                    onDeleteTask={handleDeleteRecurringTask}
                    onShowMap={(location) => {
                      setMapLocation(location);
                      setShowMapModal(true);
                      openModal('mapModal');
                    }}
                    openModal={openModal}
                    closeModalWithHistory={closeModalWithHistory}
                  />
                </TabsContent>

                <TabsContent value="incoming" className="pt-2 sm:pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-2">
                      <Select value={filterIncomingStatus} onValueChange={setFilterIncomingStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="in_progress">В обработке</SelectItem>
                          <SelectItem value="awaiting_assignment">Ожидает назначения</SelectItem>
                          <SelectItem value="assigned">Назначен</SelectItem>
                          <SelectItem value="execution">Исполнение</SelectItem>
                          <SelectItem value="completed">Завершено</SelectItem>
                          <SelectItem value="overdue">Просрочено</SelectItem>
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
                      {filteredIncomingRequests.map((request, index: number) => {
                        const isLast = index === filteredIncomingRequests.length - 1;
                        return (
                          <RequestCard
                            key={`incoming-${request.id}`}
                            request={request}
                            onCardClick={(request) => {
                              setSelectedRequest(request);
                              openModal('requestDetails');
                            }}
                            renderCardHeader={renderCardHeader}
                            isLast={isLast}
                            lastElementRef={lastRequestRef}
                          />
                        );
                      })}
                  </div>
                  </div>
                </TabsContent>


                <TabsContent value="meeting-rooms" className="pt-2 sm:pt-0">
                  {/* Кнопки переключения между бронированием и моими бронированиями - всегда видны */}
                  <div className="mb-4 flex gap-2">
                    <Button
                      onClick={() => {
                        setMeetingRoomsTab("book");
                        // Если переключаемся на бронирование и офис не выбран, сбрасываем офис
                        if (!selectedOffice && meetingRoomsTab === "my-bookings") {
                          setSelectedOffice(null);
                        }
                      }}
                      className={`flex-1 h-10 rounded-lg font-medium transition-all duration-300 ${
                        meetingRoomsTab === "book"
                          ? "bg-[#D94F15] hover:bg-[#C44712] text-white"
                          : "bg-white/20 hover:bg-white/30 text-white"
                      }`}
                    >
                      Бронировать
                    </Button>
                    <Button
                      onClick={() => setMeetingRoomsTab("my-bookings")}
                      className={`flex-1 h-10 rounded-lg font-medium ${
                        meetingRoomsTab === "my-bookings"
                          ? "bg-[#D94F15] hover:bg-[#C44712] text-white"
                          : "bg-white/20 hover:bg-white/30 text-white"
                      }`}
                    >
                      Мои бронирования
                    </Button>
                  </div>

                  {meetingRoomsTab === "my-bookings" ? (
                    // Показываем мои бронирования без выбора офиса
                    <MeetingRoomsCatalog 
                      initialOffice={null}
                      onOfficeChange={(office) => setSelectedOffice(office)}
                      initialTab="my-bookings"
                      onTabChange={(tab) => setMeetingRoomsTab(tab === "book" ? "book" : "my-bookings")}
                    />
                  ) : (
                    // Для бронирования нужен выбор офиса
                    <>
                      {!selectedOffice ? (
                        <>
                          {/* Секция выбора офиса */}
                          <div className="space-y-3">
                            <div>
                              <h2 className="text-lg font-semibold text-white">Выбрать офис</h2>
                              <p className="text-sm text-white/80">Выберите офис для бронирования переговорной комнаты</p>
                            </div>
                            <div className="overflow-x-auto -mx-2 px-2">
                              <div className="flex gap-3 pb-2" style={{ scrollbarWidth: 'thin' }}>
                                {offices.map((office: any) => (
                                  <div
                                    key={office.id}
                                    className="min-w-[280px] cursor-pointer transition-all hover:shadow-md active:scale-95 flex-shrink-0 rounded-2xl overflow-hidden"
                                    style={{ background: '#D94F15' }}
                                    onClick={() => {
                                      setSelectedOffice(office);
                                    }}
                                  >
                                    <div className="relative aspect-[4/3] bg-white/10 overflow-hidden">
                                      {office.photo ? (
                                        <Image
                                          src={office.photo}
                                          alt={office.name}
                                          fill
                                          sizes="280px"
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <Building2 className="w-16 h-16 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-4">
                                      <h3 className="font-semibold text-white">{office.name}</h3>
                                      <p className="text-sm text-white/80 mt-1">{office.city}</p>
                                      <p className="text-sm text-white/60">{office.address}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <MeetingRoomsCatalog 
                          initialOffice={selectedOffice}
                          onOfficeChange={(office) => setSelectedOffice(office)}
                          initialTab="book"
                          onTabChange={(tab) => setMeetingRoomsTab(tab === "book" ? "book" : "my-bookings")}
                        />
                      )}
                    </>
                  )}
                </TabsContent>


                <TabsContent value="management" className="pt-2 sm:pt-0">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <Link
                      href="/department-head/management/users"
                      className="block"
                    >
                      <Card className="h-full transition-all hover:scale-[1.02] active:scale-[0.98] border-white/20 bg-white/10 hover:bg-white/15">
                        <CardContent className="p-4 flex flex-col">
                          <Users className="h-8 w-8 text-[#E25B21] mb-2" />
                          <h3 className="font-semibold text-white text-sm leading-tight">Пользователи</h3>
                          <p className="text-xs text-white/70 mt-1 line-clamp-2">Роли и запросы на регистрацию</p>
                        </CardContent>
                      </Card>
                    </Link>
                    <Link
                      href="/department-head/statistics"
                      className="block"
                    >
                      <Card className="h-full transition-all hover:scale-[1.02] active:scale-[0.98] border-white/20 bg-white/10 hover:bg-white/15">
                        <CardContent className="p-4 flex flex-col">
                          <BarChart3 className="h-8 w-8 text-[#E25B21] mb-2" />
                          <h3 className="font-semibold text-white text-sm leading-tight">Аналитика</h3>
                          <p className="text-xs text-white/70 mt-1 line-clamp-2">SLA, оценки, статистика по заявкам</p>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6 mb-20">
              <UpcomingTasksWidget refreshTrigger={upcomingTasksRefreshTrigger} variant="themed" />
              <div className="rounded-2xl overflow-hidden" style={{ background: '#D94F15' }}>
                <div className="p-0">
                  <NotificationsSidebar 
                    onNotificationClick={handleNotificationClick}
                    onRequestClick={(requestId) => {
                      // Парсим ID заявки (может быть в формате "123" или "123/1")
                      const parsedId = parseInt(requestId.split('/')[0]);
                      const allRequests = [...myRequests, ...incomingRequests];
                      const request = allRequests.find(r => r.id === parsedId);
                      if (request) {
                        setSelectedRequest(request);
                        openModal('requestDetails');
                        return true; // Заявка найдена
                      }
                      return false; // Заявка не найдена
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
      </PullToRefresh>

        {/* Black background extension for safe area */}
        <div
          className="fixed bottom-0 left-0 right-0 z-0"
          style={{
            height: 'calc(100px + env(safe-area-inset-bottom, 0px))',
            background: '#1C1C1E',
          }}
        />

        {/* Модалка */}
        {isModalOpen && selectedNotification && (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]"
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
                  {createClickableRequestIds(selectedNotification.content, (requestId) => {
                    // Парсим ID заявки (может быть в формате "123" или "123/1")
                    const parsedId = parseInt(requestId.split('/')[0]);
                    const allRequests = [...myRequests, ...incomingRequests];
                    const request = allRequests.find(r => r.id === parsedId);
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

        {/* Request Details Modal */}
        {selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]" onClick={() => {
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
                      <Label>Тип заявки </Label>
                      <Badge className={getTypeColor(selectedRequest.request_type)}>{translateType(selectedRequest.request_type)}</Badge>
                    </div>
                    <div>
                      <Label>Статус </Label>
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
                                        <span className="w-2 h-2 bg-[#E25B21] rounded-full"></span>
                                        {subRequest.category?.name || 'Без категории'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {renderStatusWithTooltip(subRequest.status)}
                                    {selectedRequest.request_type !== 'recurring' && renderLongTermWithTooltip(subRequest.is_long_term || false)}

                                    {/* Кнопка комментариев */}
                      <Button
                                        variant="ghost"
                          size="sm"
                                        className={`${isDesktop ? 'h-8 w-8' : 'h-10 w-10'} p-0 hover:bg-[#E25B21]/10`}
                          onClick={() => {
                                          if (hasComments) {
                                            setShowComments(null);
                            } else {
                                            setShowComments(subRequest.id);
                            }
                          }}
                      >
                                      <MessageCircle className={`${isDesktop ? 'h-4 w-4' : 'h-5 w-5'} ${hasComments ? 'text-[#E25B21]' : 'text-gray-500'}`} />
                      </Button>

                                    <RoleBasedActionMenu
                                        request={subRequest}
                                        requestGroup={selectedRequest}
                                        isDesktop={isDesktop}
                                        userRole="department-head"
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
                                        onRedirectToOtherDepartment={handleOpenRedirectModal}
                                        onAssignExecutor={handleAssignExecutors}
                                        onChangeExecutors={handleChangeExecutors}
                                        onToggleLongTerm={handleToggleLongTerm}
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
                                      className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-[#E25B21] transition-border duration-150"
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
                              .map((photo: any, index: number) => (
                                  <img
                                      key={index}
                                      src={getPreviewUrl(photo.photo_url)}
                                      alt={`Фото ${index + 1}`}
                                      className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-[#E25B21] transition-border duration-150"
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
          offices={offices}
        />

        {/* Request Delete Confirmation Modal */}
        <DeleteConfirmationModal
            key="request-delete-modal"
            isOpen={showDeleteRequestModal && !!selectedRequest}
            onClose={() => {
              setShowDeleteRequestModal(false);
            }}
            onConfirm={() => {
              if (selectedRequest) {
                handleDeleteRequest(selectedRequest);
                setSelectedRequest(null);
                setShowDeleteRequestModal(false);
              }
            }}
            title="Удалить заявку?"
            description={`Это действие необратимо. Вы точно хотите удалить заявку ${selectedRequest?.id}?`}
        />

        {/* Rating Modal */}
        <RatingModal
            isOpen={showRatingModal && !!requestToRate}
            onClose={() => {
                        setShowRatingModal(false);
              closeModalWithHistory();
              setRatingValue(0);
              setRequestToRate(null);
              setRatingComment("");
            }}
            ratingValue={ratingValue}
            onRatingChange={setRatingValue}
            onSubmit={handleRateExecutor}
            title={"Оценить клиента"}
            description={`Пожалуйста, оцените взаимодействие по заявке #${requestToRate?.id}`}
            currentRating={requestToRate ? userRatings[requestToRate.id]?.rating : undefined}
            comment={ratingComment}
            onCommentChange={setRatingComment}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Перенаправить заявку #{selectedRequestForRedirect.id}</CardTitle>
                <CardDescription>
                  Выберите категорию, к которой нужно перенаправить заявку
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
                    <SelectContent className="z-[110]">
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

        {!isDesktop && <BottomNav
            activeTab="history"
            hidden={showCreateRequestModal || !!selectedRequest || showMapModal || showRatingModal || isModalOpen || !!selectedPhoto || showRedirectModal || showAssignExecutorsModal || showChangeExecutorsModal}
        />}
        {isDesktop && <Link
            href="/chat-bot"
            className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-14 h-14 bg-[#E25B21]/10 text-[#E25B21] rounded-full shadow-lg hover:bg-[#E25B21]/20 transition"
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

        {/* Модальное окно изменения исполнителей */}
        <ChangeExecutorsModal
            isOpen={showChangeExecutorsModal}
            onClose={handleCloseChangeExecutorsModal}
            subRequest={selectedSubRequestForChange}
            executors={executors}
            userServiceCategoryId={user?.service_category_id}
            onSuccess={handleChangeExecutorsSuccess}
        />

        {/* Модал импорта Excel */}
        <ImportExcelModal
          isOpen={showImportExcelModal}
          onClose={() => setShowImportExcelModal(false)}
          onSuccess={() => {
            setShowImportExcelModal(false);
            // Обновляем список повторяющихся задач
            fetchRequests();
          }}
          userRole="department-head"
          isFullScreen={!isDesktop}
        />

        {/* Модалка для случая, когда заявка не найдена */}
        <RequestNotFoundModal
          isOpen={showNotFoundModal}
          onClose={() => setShowNotFoundModal(false)}
          requestId={notFoundRequestId}
        />
      </>
  )
}