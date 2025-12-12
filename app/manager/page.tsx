"use client"

import React, {useCallback, useEffect, useRef, useState, useMemo} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Input} from "@/components/ui/input"
import {Textarea} from "@/components/ui/textarea"
import {Label} from "@/components/ui/label"
import {useRouter, useSearchParams} from "next/navigation"


import {
  AlertTriangle,
  BarChart3,
  Calendar as CalendarLucid,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Hourglass,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  XCircle,
  Zap,
} from "lucide-react"
import axios from "axios";
import Header from "@/app/header/Header";
import api, { createServiceCategory, deleteServiceCategory, getExecutorsByCategory } from "@/lib/api";
import {CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip as TooltipForTabs} from "recharts";
import {format, isAfter, subDays, subMonths, subYears} from "date-fns";
import {useNotificationStore} from "@/stores/notificationStore";
import {SuccessModal} from "@/components/success-model";
import {useSuccessModal} from "@/hooks/use-success-modal";
import {BottomNav} from "@/components/BottomNav";
import {useMediaQuery} from "@/hooks/use-media-query";
import {AcceptRequestModal} from "@/components/AcceptRequestModal";
import {useAcceptRequestModal} from "@/hooks/use-approve-modal";
import {NotificationsSidebar} from "@/components/notification/NotificationsSidebar";
import {Request, RequestGroup, SubRequest, useRequestStore} from "@/stores/useRequestStore";
import PullToRefresh from "@/components/pull-to-refresh";
import Link from "next/link";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import {RoleBasedActionMenu} from "@/components/action-menu/RoleBasedActionMenu";
const LogsViewer = dynamic(() => import("@/components/logs-viewer").then(mod => ({ default: mod.LogsViewer })), {
  loading: () => <div className="text-center py-8">Загрузка логов...</div>
});
import {DeleteConfirmationModal} from "@/components/DeleteConfirmationModal";
import {IconInfoModal} from "@/components/IconInfoModal";
import {getSubRequestDisplayId} from "@/lib/subRequestUtils";
import { createClickableRequestIds } from '@/lib/notificationUtils';
import { RequestNotFoundModal } from '@/components/RequestNotFoundModal';
import {RejectRequestModal} from "@/components/RejectRequestModal";
import {CommentsModal} from "@/components/CommentsModal";
import {CreateRequestModal} from "@/components/CreateRequestModal";
import {MapModal} from "@/components/MapModal";
import {LeaderIndicator} from "@/components/ui/leader-indicator";
import {CompletedTaskReport} from "@/components/CompletedTaskReport";
import {RequestCard} from "@/components/RequestCard";
import { OfficeLocationsManager } from "@/components/OfficeLocationsManager";
import {useRejectRequestModal} from "@/hooks/use-reject-modal";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import dynamic from 'next/dynamic';

const ManagerAnalytics = dynamic(() => import("@/components/ManagerAnalytics"), {
  loading: () => <div className="text-center py-8">Загрузка аналитики...</div>
});
import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover"
import {Calendar} from "@/components/ui/calendar";
import {ru} from "date-fns/locale";
import SubRequestInfo from "@/components/SubRequestInfo";
import Executors from "@/components/Executors";
import PhotoModal from "@/components/photo/PhotoModal";
import {RatingModal} from "@/components/RatingModal";
import RegistrationRequestsManager from "@/components/RegistrationRequestsManager";
import { getPreviewUrl } from "@/lib/imageOptimization";

declare global {
  interface Window {
    androidApp?: {
      saveFileBase64: (fileName: string, base64: string, mimeType: string) => void;
      reloadPage: () => void;
      notifyReady: () => void;
    };
  }
}
const roleTranslations: Record<string, string> = {
  client: "Клиент",
  "admin-worker": "Администратор офиса",
  "department-head": "Руководитель направления",
  executor: "Испольнитель",
  manager: "Руководитель"
};

type OfficeType = {
  id: number
  name: string
  city: string
  address: string
}

type User = {
  id: number;
  full_name: string;
  phone?: string;
  office_id: number;
  role: string;
  service_category_id: number
}

interface Stats {
  officeId: number;
  data: {
    [date: string]: {
      totalRequests: number;
      completedRequests: number;
      overdueRequests: number;
      normalRequests: number,
      urgentRequests: number,
      plannedRequests: number
    };
  };
}

interface ChartData {
  date: string;
  count: number;
}

interface Category {
  id: number
  name: string
}

export default function ManagerDashboard() {
  // Optimized Zustand selectors
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const categories = useCategoryStore(state => state.categories)
  const fetchCategories = useCategoryStore(state => state.fetchCategories)
  const clearCategories = useCategoryStore(state => state.clearCategories)
  const searchParams = useSearchParams()
  const successModal = useSuccessModal()
  const approveModal = useAcceptRequestModal()
  const router = useRouter()
  const [showIconInfo, setShowIconInfo] = useState<{type: 'status' | 'longTerm', value: string} | null>(null);
  const rejectModal = useRejectRequestModal()
  const [showComments, setShowComments] = useState<number | null>(null);
  const [expandedSubRequests, setExpandedSubRequests] = useState<Set<number>>(new Set());
  const [period, setPeriod] = useState("month")
  const [office, setOffice] = useState("all")
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [notFoundRequestId, setNotFoundRequestId] = useState<string>('');
  const [tab, setTab] = useState("requests")
  const [offices, setOffices] = useState<any[]>([])
  const [newOfficeName, setNewOfficeName] = useState("")
  const [newOfficeCity, setNewOfficeCity] = useState("")
  const [newOfficeAddress, setNewOfficeAddress] = useState("")
  
  // Состояния для управления категориями
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null)
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [categoriesWithExecutors, setCategoriesWithExecutors] = useState<Set<number>>(new Set())
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const { notifications, setNotifications, setNotificationLoading, clearNotifications } = useNotificationStore()
  const [loading, setLoading] = useState(true)
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [requestLocation, setRequestLocation] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<RequestGroup | null>(null)
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, created_at?: string} | null>(null);
  const requests = useRequestStore(state => state.requests)
  const setRequests = useRequestStore(state => state.setRequests)
  const clearRequests = useRequestStore(state => state.clearRequests)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isInitialized, setIsInitialized] = useState(false)
  const filtersInitializedFromURL = useRef(false) // Флаг, что фильтры были инициализированы из URL
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [officeToDelete, setOfficeToDelete] = useState<OfficeType | null>(null)
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null)
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [showDeleteOfficeModal, setShowDeleteOfficeModal] = useState(false)
  
  // Состояния для редактирования заявок
  const [editableRequestType, setEditableRequestType] = useState<string>("")
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [subRequestSettings, setSubRequestSettings] = useState<{[key: number]: {category_id?: number, complexity?: string, sla?: string}}>({})
  const [isUpdatingRequest, setIsUpdatingRequest] = useState(false)
  const [editableLocationDetail, setEditableLocationDetail] = useState<string>("")
  const [editableSubRequestTitles, setEditableSubRequestTitles] = useState<{[key: number]: string}>({})
  const [editableSubRequestDescriptions, setEditableSubRequestDescriptions] = useState<{[key: number]: string}>({})
  const [editableSubRequestComplexity, setEditableSubRequestComplexity] = useState<{[key: number]: string}>({})
  const [editableSubRequestSla, setEditableSubRequestSla] = useState<{[key: number]: string}>({})
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false)
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  // Инициализация состояний редактирования при выборе заявки
  useEffect(() => {
    if (selectedRequest) {
      setEditableRequestType(selectedRequest.request_type);
      setEditableLocationDetail(selectedRequest.location_detail || "");
      setEditingCategoryId(null);
      setSubRequestSettings({});
      setFormErrors(null);
      setIsEditingMode(false);
      
      // Инициализируем поля подзаявок
      const titles: {[key: number]: string} = {};
      const descriptions: {[key: number]: string} = {};
      const complexity: {[key: number]: string} = {};
      const sla: {[key: number]: string} = {};
      selectedRequest.requests.forEach((subRequest: any) => {
        titles[subRequest.id] = subRequest.title || "";
        descriptions[subRequest.id] = subRequest.description || "";
        complexity[subRequest.id] = subRequest.complexity || "";
        sla[subRequest.id] = subRequest.sla || "";
      });
      setEditableSubRequestTitles(titles);
      setEditableSubRequestDescriptions(descriptions);
      setEditableSubRequestComplexity(complexity);
      setEditableSubRequestSla(sla);
    }
  }, [selectedRequest]);
  
  // Состояния для рейтинга
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [requestToRate, setRequestToRate] = useState<any>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingComment, setRatingComment] = useState("")
  const [userRatings, setUserRatings] = useState<{[key: number]: {rating: number, comment?: string}}>({})
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
  });

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [newUser, setNewUser] = useState({
    id: 0,
    full_name: "",
    phone: "",
    office_id: 0,
    role: "",
    category_id: 0,
  });
  const [searchInput, setSearchInput] = useState(''); // Отдельное состояние для input
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  
  // Фильтры для пользователей
  const [officeFilter, setOfficeFilter] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingOfficeId, setEditingOfficeId] = useState(null);
  const [editedOffice, setEditedOffice] = useState<Partial<OfficeType>>({
    name: "",
    city: "",
    address: "",
  })
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const lastRequestRef = useCallback((node: HTMLDivElement | null) => {
    lastElementRef.current = node;
  }, []);
  const [stats, setStats] = useState<Stats[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [kpi, setKpi] = useState({
    total: 0,
    completed: 0,
    overdue: 0,
    emergency: 0,
  });

  const [modalStack, setModalStack] = useState<string[]>([]);
  const [isClosingProgrammatically, setIsClosingProgrammatically] = useState(false);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const now = new Date();
      let periodStartDate: Date | null;

      switch (period) {
        case 'week':
          periodStartDate = subDays(now, 7);
          break;
        case 'month':
          periodStartDate = subMonths(now, 1);
          break;
        case 'year':
          periodStartDate = subYears(now, 1);
          break;
        default:
          periodStartDate = null;
      }
      const statusMatch = filterStatus === "all" ||
          (filterStatus === "long_term" ? request.requests.some(req => req.is_long_term && request.request_type !== 'recurring') : 
           filterStatus === "overdue" ? true : request.status === filterStatus);
      const requestType = request.request_type;
      // Для типа заявки используем бэкенд фильтрацию, поэтому фронтенд фильтрация не нужна
      const typeMatch = true; // Всегда true, так как бэкенд уже отфильтровал по типу
      const officeMatch = office === "all" || office == String(request.office_id);

      const createdDate = new Date(request.created_date);
      const periodMatch = !periodStartDate || isAfter(createdDate, periodStartDate);

      return statusMatch && typeMatch && officeMatch && periodMatch;
    })
  }, [requests, period, filterStatus, office])

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

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/analytics/stats/manager");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
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
    setModalStack(prev => {
      const newStack = prev.slice(0, -1);
      // Обновляем историю без навигации
      if (newStack.length > 0) {
        window.history.replaceState({ modal: newStack[newStack.length - 1] }, '', window.location.pathname);
      } else {
        window.history.replaceState({ modal: null }, '', window.location.pathname);
      }
      return newStack;
    });
  }, []);

  const checkUserRating = useCallback(async (requestId: number) => {
    try {
      const response = await api.get(`/ratings/user/${requestId}`);
      if (response.data && response.data.length > 0) {
        const ratingData = response.data[0];
        setUserRatings(prev => ({
          ...prev,
          [requestId]: {
            rating: ratingData.rating,
            comment: ratingData.comment
          }
        }));
      }
    } catch (error) {
      console.error("Failed to check user rating:", error);
    }
  }, []);

  useEffect(() => {
    if (!stats.length) {
      fetchStats();
    }
  }, []);

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

    // Обработка параметров фильтров из URL
    // Устанавливаем фильтры из URL только после инициализации, чтобы избежать конфликта с INITIAL LOAD
    if (isInitialized) {
      if (status) {
        // Если в URL есть параметр status, обновляем фильтр
        setFilterStatus(status);
        filtersInitializedFromURL.current = true;
      }
      // Если параметра нет, НЕ меняем filterStatus - сохраняем текущее значение

      if (priority) {
        // Если в URL есть параметр priority, обновляем фильтр
        setFilterType(priority);
        filtersInitializedFromURL.current = true;
      }
      // Если параметра нет, НЕ меняем filterType - сохраняем текущее значение
    }
    // Если еще не инициализирован, фильтры будут установлены в INITIAL LOAD
  }, [searchParams, isInitialized])

  useEffect(() => {
    if (stats.length) {
      setKpi(calculateKPI(stats, office, period));
      setChartData(prepareChartData(stats, office, period));
      setDistribution(getRequestsDistribution(stats, office, period));
    }
  }, [stats, office, period]);

  const getRequestsDistribution = (stats: Stats[], selectedOffice: string, selectedPeriod: string) => {
    let filteredStats = stats;

    if (selectedOffice !== "all") {
      const officeId = parseInt(selectedOffice);
      filteredStats = stats.filter(stat => stat.officeId === officeId);
    }

    const now = new Date();
    let startDate: Date = new Date(0); // По умолчанию - все время

    switch (selectedPeriod) {
      case "week":
        startDate = subDays(now, 7);
        break;
      case "month":
        startDate = subMonths(now, 1);
        break;
      case "year":
        startDate = subYears(now, 1);
        break;
    }

    let total = 0;
    let normal = 0;
    let urgent = 0;
    let planned = 0;

    filteredStats.forEach(stat => {
      Object.entries(stat.data).forEach(([date, data]) => {
        const entryDate = new Date(date);
        if (entryDate >= startDate) {
          total += data.totalRequests;
          normal += data.normalRequests || 0;
          urgent += data.urgentRequests || 0;
          planned += data.plannedRequests || 0;
        }
      });
    });

    return {
      total,
      normal,
      urgent,
      planned,
      normalPercent: total > 0 ? Math.round((normal / total) * 100) : 0,
      urgentPercent: total > 0 ? Math.round((urgent / total) * 100) : 0,
      plannedPercent: total > 0 ? Math.round((planned / total) * 100) : 0,
    };
  };

  const [distribution, setDistribution] = useState({
    total: 0,
    normal: 0,
    urgent: 0,
    planned: 0,
    normalPercent: 0,
    urgentPercent: 0,
    plannedPercent: 0,
  });

  const calculateKPI = (stats: Stats[], selectedOffice: string, selectedPeriod: string) => {
    let filteredStats = stats;

    if (selectedOffice !== "all") {
      const officeId = parseInt(selectedOffice);
      filteredStats = stats.filter(stat => stat.officeId === officeId);
    }

    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    let total = 0;
    let completed = 0;
    let overdue = 0;
    let emergency = 0;

    filteredStats.forEach(stat => {
      Object.entries(stat.data).forEach(([date, data]) => {
        const entryDate = new Date(date);
        if (entryDate >= startDate) {
          total += data.totalRequests;
          completed += data.completedRequests;
          overdue += data.overdueRequests;
          emergency += data.overdueRequests;
        }
      });
    });

    return { total, completed, overdue, emergency };
  };

  const prepareChartData = (stats: Stats[], selectedOffice: string, selectedPeriod: string, startDateParam?: Date, endDateParam?: Date) => {
    let filteredStats = stats;

    if (selectedOffice !== "all") {
      const officeId = parseInt(selectedOffice);
      filteredStats = stats.filter(stat => stat.officeId === officeId);
    }

    const now = new Date();
    let startDate: Date;

    // Если выбран интервал дат, показываем данные за этот интервал
    if (startDateParam && endDateParam) {
      const startDateStr = startDateParam.toISOString().split('T')[0];
      const endDateStr = endDateParam.toISOString().split('T')[0];
      const dataMap: Record<string, number> = {};

      filteredStats.forEach(stat => {
        Object.entries(stat.data).forEach(([date, data]) => {
          if (date >= startDateStr && date <= endDateStr) {
            if (!dataMap[date]) {
              dataMap[date] = 0;
            }
            dataMap[date] += data.totalRequests;
          }
        });
      });

      return Object.entries(dataMap)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // Иначе используем обычную логику по периодам
    switch (selectedPeriod) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    const dataMap: Record<string, number> = {};

    filteredStats.forEach(stat => {
      Object.entries(stat.data).forEach(([date, data]) => {
        const entryDate = new Date(date);
        if (entryDate >= startDate) {
          if (!dataMap[date]) {
            dataMap[date] = 0;
          }
          dataMap[date] += data.totalRequests;
        }
      });
    });

    return Object.entries(dataMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const fetchUsers = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      
      // Используем обычный endpoint для получения всех пользователей
      const params: any = {
        page,
        limit: pagination.itemsPerPage
      };
      
      if (officeFilter) {
        params.office_id = officeFilter;
      }
      
      if (roleFilter) {
        params.role = roleFilter;
      }
      
      const response = await api.get('/users', { params });
      
      if (response.data.success) {
        setUsers(response.data.users);
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalItems: response.data.total,
      }));
      } else {
        console.error('Ошибка при загрузке пользователей:', response.data.message);
        setUsers([]);
      }
    } catch (error) {
      setLoading(false);
      console.error('Ошибка при загрузке пользователей:', error);
      setUsers([]);
    }
  }, [pagination.itemsPerPage, officeFilter, roleFilter]);

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
          case 'taskDetails':
          case 'requestDetails':
            setSelectedRequest(null);
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
          case 'deleteRequest':
            setShowDeleteRequestModal(false);
            setRequestToDelete(null);
            break;
          case 'categoryDelete':
            setCategoryToDelete(null);
            break;
          case 'ratingModal':
            setShowRatingModal(false);
            setRequestToRate(null);
            setRatingValue(0);
            setRatingComment("");
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
    if (modalName !== 'taskDetails') {
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
    if (modalName !== 'categoryDelete') {
      setCategoryToDelete(null);
    }
    if (modalName !== 'deleteRequest') {
      setShowDeleteRequestModal(false);
      setRequestToDelete(null);
    }
    if (modalName !== 'ratingModal') {
      setShowRatingModal(false);
      setRequestToRate(null);
      setRatingValue(0);
      setRatingComment("");
    }
    setModalStack([modalName]);
    // Используем pushState вместо replaceState для правильной работы истории
    window.history.pushState({ modal: modalName }, '', window.location.pathname);
  };


  useEffect(() => {
    fetchUsers(1); // при загрузке
  }, []);

  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage); // при переключении
  };

  const handleExport = async (format: "xlsx" | "pbix") => {
    try {
      const now = new Date();
      let periodStartDate: Date | null;

      switch (period) {
        case 'week':
          periodStartDate = subDays(now, 7);
          break;
        case 'month':
          periodStartDate = subMonths(now, 1);
          break;
        case 'year':
          periodStartDate = subYears(now, 1);
          break;
        default:
          periodStartDate = null;
      }

      const params = new URLSearchParams();
      if (office && office !== 'all') params.append("office_id", String(office));
      if (periodStartDate) params.append("from", periodStartDate.toISOString());
      params.append("format", format);

      // Для Android WebView используем специальный обработчик
      if (window.androidApp) {
        const response = await fetch(`https://kcell-service.onrender.com/api/analytics/export?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = function() {
          const base64data = reader.result?.toString().split(',')[1] || '';
          const mimeType = blob.type ||
              (format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                  'application/octet-stream');

          window.androidApp?.saveFileBase64(
              `analytics.${format}`,
              base64data,
              mimeType
          );
        };

        reader.readAsDataURL(blob);
      } else {
        // Оригинальный код для веб-браузеров
        const res = await axios.get(`https://kcell-service.onrender.com/api/analytics/export?${params.toString()}`, {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Ошибка при экспорте файла:", error);
      alert("Не удалось экспортировать файл");
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUserId) return;

    try {
      setFormErrors(null);
      setLoading(true);

      // Валидация телефона
      if (newUser.phone && newUser.phone.length < 10) {
        setFormErrors("Номер телефона должен содержать минимум 10 символов");
        setLoading(false);
        return;
      }

      const payload = {
        full_name: newUser.full_name,
        phone: newUser.phone,
        office_id: newUser.office_id,
        role: newUser.role,
      };

      // Обновление пользователя
        const response = await api.put(`/users/${editingUserId}`, payload);
        setUsers((prev) =>
            prev.map((user) => (user.id === editingUserId ? response.data : user))
        );

      setNewUser({
        id: 0,
        full_name: "",
        phone: "",
        office_id: 0,
        role: "",
        category_id: 0,
      });
      setEditingUserId(null);
      setFormErrors(null);
    } catch (err) {
      setFormErrors("Ошибка при обновлении пользователя");
      console.error("Ошибка при обновлении пользователя:", err);
    } finally {
      setLoading(false);
    }
  };

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true); // сработает только на клиенте
  }, []);

  useEffect(() => {
    if (!hydrated) return; // ждём восстановления данных

    if (!user || user.role !== "manager") {
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

  const handleDeleteUser = async (userId: number) => {
    try {
      setLoading(true);
      const response = await api.delete(`/users/${userId}`);
      
      // Если успешно удален (статус 204)
      if (response.status === 204) {
      setUsers((prev) => prev.filter((user) => user.id !== userId));
        // Показываем уведомление об успехе
        successModal.showSuccess({
          title: "Успешно",
          message: "Пользователь успешно удален"
        });
      }
    } catch (err: any) {
      console.error("Ошибка при удалении пользователя:", err);
      
      // Показываем ошибку пользователю
      const errorMessage = err.response?.data?.message || 'Произошла ошибка при удалении пользователя';
      rejectModal.showReject({
        title: "Ошибка",
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const isValidUser =
      newUser.full_name.trim() &&
      newUser.office_id !== 0 &&
      newUser.role;

  const handleEditUser = (user: User) => {
    setNewUser({
      id: user.id,
      full_name: user.full_name,
      phone: user.phone || "",
      office_id: user.office_id,
      role: user.role,
      category_id: user.role === "department-head" ? Number(user.service_category_id) : 0,
    });
    setEditingUserId(user.id);
  };

  useEffect(() => {
    // Инициализация данных при первом рендере
    if (!isInitialized && token) {
      // Читаем параметры из URL перед загрузкой
      const status = searchParams.get("status");
      const priority = searchParams.get("priority");
      
      // Устанавливаем фильтры из URL
      if (status) {
        setFilterStatus(status);
      }
      if (priority) {
        setFilterType(priority);
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
      api.get(`/request-groups?${params.toString()}`)
        .then((response) => {
          const newRequests = response.data.data;
          setRequests(newRequests);
          setHasMore(1 < response.data.totalPages);
          setPage(1);
          
          // Загружаем оценки для завершенных заявок
          newRequests.forEach((requestGroup: any) => {
            requestGroup.requests.forEach((subRequest: any) => {
              if (subRequest.status === "completed") {
                checkUserRating(subRequest.id);
              }
            });
          });
          
          setIsInitialized(true);
        })
        .catch((error: any) => {
          console.error("Ошибка при загрузке заявок:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
    fetchNotifications();
    fetchOffices();
    if (token) {
      fetchCategories(token);
    }
  }, [token, searchParams, checkUserRating]);

  useEffect(() => {
    if (categories.length > 0) {
      checkCategoriesWithExecutors();
    }
  }, [categories]);

  // Автоматический поиск при изменении фильтров
  useEffect(() => {
    if (officeFilter !== null || roleFilter !== null) {
      handleSearch();
    }
  }, [officeFilter, roleFilter]);

  // Сбрасываем состояние при изменении фильтра типа
  useEffect(() => {
    if (isInitialized && filterType !== "all") {
      setPage(1);
      setHasMore(true);
      setRequests([]);
      // Не вызываем fetchRequests здесь - это сделает useEffect для фильтров
    }
  }, [filterType]);

  // Сбрасываем состояние при изменении фильтра статуса
  useEffect(() => {
    if (isInitialized && filterStatus !== "all") {
      setPage(1);
      setHasMore(true);
      setRequests([]);
      // Не вызываем fetchRequests здесь - это сделает useEffect для фильтров
    }
  }, [filterStatus]);

  // Перезагружаем данные при изменении фильтров (только если уже инициализирован)
  useEffect(() => {
    if (isInitialized) {
      fetchRequests(1); // Reset to first page when filter changes
    }
    // INITIAL LOAD теперь обрабатывается отдельно с учетом searchParams
  }, [filterStatus, filterType]);

  const fetchRequests = useCallback(async (pageToLoad = 1) => {
    try {
      setLoading(true);
      
      // Создаем параметры запроса
      const params = new URLSearchParams({
        page: pageToLoad.toString(),
        pageSize: '10'
      });

      // Добавляем фильтр статуса если он не "all"
      if (filterStatus !== "all" && filterStatus !== "long_term") {
        params.append('status', filterStatus);
      }

      // Добавляем фильтр приоритета если он не "all"
      if (filterType !== "all") {
        params.append('priority', filterType);
      }

      const queryString = params.toString();
      const url = `/request-groups?${queryString}`;
      
      const response = await api.get(url);
      const newRequests = response.data.data;
      if (pageToLoad === 1) {
        setRequests(newRequests);
      } else {
        setRequests(prev => [...prev, ...newRequests]);
      }
      setHasMore(pageToLoad < response.data.totalPages);
      setPage(pageToLoad);

      // Загружаем оценки для завершенных заявок
      newRequests.forEach((requestGroup: any) => {
        requestGroup.requests.forEach((subRequest: any) => {
          if (subRequest.status === "completed") {
            checkUserRating(subRequest.id);
          }
        });
      });

    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  }, [checkUserRating, filterStatus, filterType]);

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

  const handleDeleteRequest = (request: Request) => {
    setRequestToDelete(request)
    setShowDeleteRequestModal(true);
    openModal('deleteRequest');
  }

  const confirmDeleteRequest = async () => {
    if (requestToDelete) {
      setIsDeleteLoading(true);
      try {
        await api.delete(`/request-groups/${requestToDelete.id}`)
        setShowDeleteRequestModal(false);
        successModal.showSuccess({
          title: "Заявка удалена",
          message: "Заявка была успешно удалена."
        })
        fetchRequests()
        setRequestToDelete(null)
      } catch (error) {
        rejectModal.showReject({
          title: "Ошибка",
          message: "Не удалось удалить под заявку."
        })
        console.error("Failed to delete request:", error)
      } finally {
        setIsDeleteLoading(false);
      }
    }
  }

  const handleCreateRequest = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors(null);

    try {
      const response = await api.post('/request-groups', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newRequestGroup = response.data;
      setRequests(prev => [newRequestGroup, ...prev]);
      
      successModal.showSuccess({
        title: "Заявка создана!",
        message: "Заявка успешно создана."
      });
      
      resetForm();
    } catch (error: any) {
      console.error("Ошибка при создании заявки:", error);
      setFormErrors(error.response?.data?.error || "Не удалось создать заявку.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

      successModal.showSuccess({
        title: "Под заявка удалена",
        message: "Под заявка была успешно удалена."
      })
    } catch (error) {
      console.error("Error deleting sub-request:", error)
      rejectModal.showReject({
        title: "Ошибка",
        message: "Не удалось удалить под заявку."
      })
    }
  }

  const resetForm = () => {
    setShowCreateRequestModal(false);
    closeModalWithHistory();
  };

  const handleUpdateOffice = async (id:any) => {
    try {
      await api.put(`/offices/${id}`, editedOffice) // Передаём данные для обновления
      const updatedOffices = offices.map((office: any) =>
          office.id === id ? { ...office, ...editedOffice } : office
      )
      setOffices(updatedOffices)
      setEditingOfficeId(null)
    } catch (error) {
      console.error("Ошибка при обновлении офиса:", error)
    }
  }


  const handleOpenCreateRequest = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            setRequestLocation(`Широта: ${latitude.toFixed(5)}, Долгота: ${longitude.toFixed(5)} (±${Math.round(accuracy)} м)`);
          },
          (error) => {
            console.error("Ошибка геолокации:", error);
            setRequestLocation("Не удалось определить местоположение");
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
      );
    } else {
      setRequestLocation("Ваш браузер не поддерживает геолокацию");
    }

    router.push('/create-request');
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
    if (requests.length === 0) {
      return;
    }

    const idToUse = pendingRequestId || requestId;
    const subIdToUse = pendingSubRequestId || subRequestId;

    if (idToUse && !selectedRequest) {
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
  }, [searchParams, requests, selectedRequest, pendingRequestId, pendingSubRequestId, openModal]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications/me?page=1&pageSize=5')
      setNotifications(res.data.notifications)
    } catch (error) {
      console.error('Ошибка при загрузке уведомлений:', error)
    } finally {
      setNotificationLoading(false)
    }
  }, []);

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

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      
      // Если есть текстовый поиск, используем API поиска
      if (searchInput.trim()) {
        const response = await api.get('/users/search', {
          params: {
            q: searchInput.trim(),
            limit: 50
          }
        });

        if (response.data.success) {
          let filteredUsers = response.data.users;
          
          // Применяем дополнительные фильтры на фронтенде
          if (officeFilter) {
            filteredUsers = filteredUsers.filter((user: any) => user.office_id === officeFilter);
          }
          
          if (roleFilter) {
            filteredUsers = filteredUsers.filter((user: any) => user.role === roleFilter);
          }
          
          setUsers(filteredUsers);
        } else {
          console.error(response.data.message);
          setUsers([]);
        }
      } else {
        // Если нет текстового поиска, загружаем всех пользователей с фильтрами
        await fetchUsers(1);
      }
    } catch (error) {
      console.error('Ошибка при поиске пользователей:', error);
      setUsers([]);
    } finally {
      setIsSearching(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon,
    delta,
    positive = true,
    bg,
  }: {
    title: string
    value: string | number
    icon: React.ReactNode
    delta?: string
    positive?: boolean
    bg: string
  }) => (
    <Card className="min-w-0">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${bg} flex-shrink-0`}>{icon}</div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-gray-600 truncate">{title}</p>
            <p className="text-lg sm:text-2xl font-bold truncate">{value}</p>
            {delta && (
              <div className="flex items-center text-xs mt-1">
                {positive ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-green-500 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-red-500 flex-shrink-0" />
                )}
                <span className={positive ? "text-green-600" : "text-red-600"}>{delta}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

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

  const fetchOffices = useCallback(async () => {
    try {
      const response = await api.get('/offices')
      setOffices(response.data)
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }, []);

  const handleAddOffice = async () => {
    const city = newOfficeCity.trim();
    const address = newOfficeAddress.trim();
    const name = newOfficeName.trim();

    // Проверка заполненности всех полей
    if (!city || !address || !name) {
      alert("Пожалуйста, заполните все поля офиса");
      return;
    }

    try {
      const response = await api.post("/offices/", {
        city: city,
        address: address,
        name: name
      });

      // Обновляем список офисов
      setOffices((prev) => [...prev, response.data]);

      // Очищаем поля формы
      setNewOfficeName("");
      setNewOfficeAddress("");
      setNewOfficeCity("");
    } catch (err) {
      console.error("Error creating office:", err);
      alert("Не удалось создать офис. Пожалуйста, попробуйте снова.");
    }
  };

  const handleRemoveOffice = async (id: any) => {
    try {
      const response = await api.delete(`/offices/${id}`)
      console.log(response.data)
      setOffices((prev) => prev.filter((office:any) => office.id !== id))
    } catch (err) {
      console.log(err)
    }
  }

  // Функции для управления категориями
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsCreatingCategory(true);
    setCategoryError(null);

    try {
      await createServiceCategory({ name: newCategoryName.trim() });
      
      successModal.showSuccess({
        title: "Категория создана",
        message: `Категория "${newCategoryName}" успешно создана`
      });

      setNewCategoryName("");
      fetchCategories(token!);
    } catch (error: any) {
      console.error("Ошибка при создании категории:", error);
      setCategoryError(error.response?.data?.message || "Ошибка при создании категории");
    } finally {
      setIsCreatingCategory(false);
    }
  }

  const checkCategoriesWithExecutors = async () => {
    const categoriesWithExecs = new Set<number>();
    
    for (const category of categories) {
      try {
        const response = await getExecutorsByCategory(category.id);
        if (response.data && response.data.length > 0) {
          categoriesWithExecs.add(category.id);
        }
      } catch (error) {
        console.error(`Ошибка при проверке категории ${category.id}:`, error);
      }
    }
    
    setCategoriesWithExecutors(categoriesWithExecs);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsDeletingCategory(true);
    setCategoryError(null);

    try {
      await deleteServiceCategory(categoryToDelete!);
      
      successModal.showSuccess({
        title: "Категория удалена",
        message: "Категория успешно удалена"
      });

      setCategoryToDelete(null);
      fetchCategories(token!);
      checkCategoriesWithExecutors();
    } catch (error: any) {
      console.error("Ошибка при удалении категории:", error);
      setCategoryError(error.response?.data?.message || "Ошибка при удалении категории");
    } finally {
      setIsDeletingCategory(false);
    }
  }

  // Функция для обновления заявки
  const handleUpdateRequest = async () => {
    if (!selectedRequest) return;

    setIsUpdatingRequest(true);
    setFormErrors(null);

    try {
      const updateData: any = {};

      // Обновляем тип заявки если он изменился
      if (editableRequestType && editableRequestType !== selectedRequest.request_type) {
        updateData.request_type = editableRequestType;
      }

      // Обновляем расположение если изменилось
      if (editableLocationDetail && editableLocationDetail !== selectedRequest.location_detail) {
        updateData.location_detail = editableLocationDetail;
      }

      // Обновляем подзаявки
      const subRequestUpdates: any[] = [];
      
      // Добавляем изменения в настройки подзаявок
      Object.keys(subRequestSettings).forEach(subRequestId => {
        const settings = subRequestSettings[parseInt(subRequestId)];
        if (settings && (settings.category_id || settings.complexity || settings.sla)) {
          subRequestUpdates.push({
            id: parseInt(subRequestId),
            ...settings
          });
        }
      });

      // Добавляем изменения в названия и описания подзаявок
      Object.keys(editableSubRequestTitles).forEach(subRequestId => {
        const subRequestIdNum = parseInt(subRequestId);
        const originalSubRequest = selectedRequest.requests.find((r: any) => r.id === subRequestIdNum);
        if (originalSubRequest) {
          const hasChanges = 
            editableSubRequestTitles[subRequestIdNum] !== originalSubRequest.title ||
            editableSubRequestDescriptions[subRequestIdNum] !== originalSubRequest.description ||
            editableSubRequestComplexity[subRequestIdNum] !== originalSubRequest.complexity ||
            editableSubRequestSla[subRequestIdNum] !== originalSubRequest.sla;
          
          if (hasChanges) {
            const existingUpdate = subRequestUpdates.find(u => u.id === subRequestIdNum);
            if (existingUpdate) {
              existingUpdate.title = editableSubRequestTitles[subRequestIdNum];
              existingUpdate.description = editableSubRequestDescriptions[subRequestIdNum];
              existingUpdate.complexity = editableSubRequestComplexity[subRequestIdNum];
              existingUpdate.sla = editableSubRequestSla[subRequestIdNum];
            } else {
              subRequestUpdates.push({
                id: subRequestIdNum,
                title: editableSubRequestTitles[subRequestIdNum],
                description: editableSubRequestDescriptions[subRequestIdNum],
                complexity: editableSubRequestComplexity[subRequestIdNum],
                sla: editableSubRequestSla[subRequestIdNum]
              });
            }
          }
        }
      });

      if (subRequestUpdates.length > 0) {
        updateData.sub_requests = subRequestUpdates;
      }

      // Отправляем обновление только если есть изменения
      if (Object.keys(updateData).length > 0) {
        await api.put(`/request-groups/${selectedRequest.id}`, updateData);
        
        successModal.showSuccess({
          title: "Заявка обновлена",
          message: "Информация о заявке успешно обновлена"
        });

        // Обновляем локальное состояние
        const updateLocalState = (prev: any[]) => prev.map(request => {
          if (request.id === selectedRequest.id) {
            let updatedRequest = { ...request, ...updateData };
            
            // Обновляем подзаявки если они были изменены
            if (updateData.sub_requests && updateData.sub_requests.length > 0) {
              updatedRequest.requests = request.requests.map((subRequest: any) => {
                const update = updateData.sub_requests.find((u: any) => u.id === subRequest.id);
                return update ? { ...subRequest, ...update } : subRequest;
              });
            }
            
            return updatedRequest;
          }
          return request;
        });

        setRequests(updateLocalState);

        // Обновляем selectedRequest для отображения в модальном окне
        const updatedSelectedRequest = updateLocalState([selectedRequest])[0];
        setSelectedRequest(updatedSelectedRequest);

        // Сбрасываем состояния редактирования
        setEditableRequestType("");
        setEditableLocationDetail("");
        setEditingCategoryId(null);
        setSubRequestSettings({});
        setEditableSubRequestTitles({});
        setEditableSubRequestDescriptions({});
        setEditableSubRequestComplexity({});
        setEditableSubRequestSla({});
        setIsEditingMode(false);
      }
    } catch (error: any) {
      console.error("Ошибка при обновлении заявки:", error);
      setFormErrors(error.response?.data?.message || "Ошибка при обновлении заявки");
    } finally {
      setIsUpdatingRequest(false);
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
      setFormErrors("")
      setStats([])
      setChartData([])
      setPeriod("month")
      setOffice("all")
      setOffices([])
      setNewOfficeName("")
      setNewOfficeCity("")
      setNewOfficeAddress("")
      // Фильтры не сбрасываем при обновлении - сохраняем выбранные значения
      // setFilterStatus("all")
      // setFilterType("all")
      setNewUser({ id: 0, full_name: "", phone: "", office_id: 0, role: "", category_id: 0 });
      setSearchInput("")
      setEditedOffice({name: "", city: "", address: ""})
      setDistribution({
        total: 0,
        normal: 0,
        urgent: 0,
        planned: 0,
        normalPercent: 0,
        urgentPercent: 0,
        plannedPercent: 0,
      })
      setUsers([])

      clearRequests();
      clearNotifications()

      await Promise.all([
        fetchRequests(),
        fetchStats(),
        fetchCategories(token!),
        fetchNotifications(),
        fetchOffices(),
        fetchUsers()
      ]);

    } catch (error) {
      console.error("Ошибка при обновлении:", error);
    }
  };

  const resetDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleCardClick = useCallback((request: RequestGroup) => {
    setSelectedRequest(request);
    openModal('requestDetails');
  }, [openModal]);

  const renderCardHeader = useCallback((requestGroup: RequestGroup) => {
    const isLongTerm = requestGroup.requests.some(req => req.is_long_term);

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
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isLongTerm ? 'text-indigo-700 bg-indigo-100' : 'text-gray-600 bg-gray-100'}`}>
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
                  userRole="manager"
                  isSubRequest={false}
                  onViewDetails={(request) => {
                    setSelectedRequest(request);
                    openModal('requestDetails');
                    // Загружаем оценки для всех завершенных подзаявок
                    request.requests.forEach((subRequest: any) => {
                      if (subRequest.status === "completed") {
                        checkUserRating(subRequest.id);
                      }
                    });
                  }}
                  onDelete={(request) => {
                    handleDeleteRequest(request);
                  }}
                  onRateRequest={(request) => {
                    setRequestToRate(request);
                    setShowRatingModal(true);
                    openModal('ratingModal');
                    // Загружаем существующую оценку
                    checkUserRating(request.id);
                  }}
              />
            </div>
          </div>
        </CardHeader>
    );
  }, [isDesktop, openModal, checkUserRating]);


  const handleRateExecutor = async () => {
    if (!requestToRate || ratingValue === 0) return;

    try {
      const response = await api.post(`/ratings`, {
        request_id: requestToRate.id,
        rating: ratingValue,
        comment: ratingComment
      });

      if (response.status === 201) {
        // Обновляем локальное состояние
        setUserRatings(prev => ({
          ...prev,
          [requestToRate.id]: {
            rating: ratingValue,
            comment: ratingComment
          }
        }));

        // Показываем уведомление об успехе
        successModal.showSuccess({
          title: "Оценка отправлена",
          message: "Ваша оценка была успешно отправлена."
        });

        // Закрываем модалку и сбрасываем состояние
        setShowRatingModal(false);
        setRequestToRate(null);
        setRatingValue(0);
        setRatingComment("");
        closeModalWithHistory();
      }
    } catch (error) {
      console.error("Failed to rate request:", error);
      rejectModal.showReject({
        title: "Ошибка",
        message: "Не удалось отправить оценку. Попробуйте еще раз."
      });
    }
  };

  return (
    <>
      <Header
          handleLogout={handleLogout}
          notificationCount={notifications.length}
          role="Руководитель"
          onRefresh={handleRefresh}
        />

    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <main className="px-4 py-4 sm:px-6 sm:py-8 max-w-7xl mx-auto">
        {/* Mobile Filters */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-3">
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
            <Select value={office} onValueChange={setOffice}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Офис" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все офисы</SelectItem>
                {offices.map((office:any, index) => (
                  <SelectItem key={index} value={office.id}>
                    {office.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="year">Год</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            {isDesktop && (
                <>
            <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-center min-w-[150px] h-10 px-4"
                onClick={() => handleExport("xlsx")}
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>

            <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-center min-w-[150px] h-10 px-4"
                onClick={() => handleExport("pbix")}
            >
              <Download className="w-4 h-4 mr-2" />
              Power BI
            </Button>
                </>
            )}
            {isDesktop ? (
                <Button
                    onClick={() => router.push('/create-request')}
                    className="flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white min-w-[150px] h-10 px-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать заявку
                </Button>
            ): null}
          </div>
        </div>

        {/* KPI Cards - Mobile optimized grid */}
        {isDesktop ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mb-3 sm:mb-6">
              <StatCard
                  title="Всего заявок"
                  value={kpi.total}
                  icon={<BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />}
                  delta="+12%"
                  positive
                  bg="bg-blue-100"
              />
              <StatCard
                  title="Завершено"
                  value={kpi.completed}
                  icon={<CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />}
                  delta="+8%"
                  positive
                  bg="bg-green-100"
              />
              <StatCard
                  title="Просрочено"
                  value={kpi.overdue}
                  icon={<AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />}
                  delta="-3%"
                  positive={false}
                  bg="bg-red-100"
              />
              <StatCard
                  title="Экстренные"
                  value={kpi.emergency}
                  icon={<AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />}
                  delta="+2"
                  positive
                  bg="bg-orange-100"
              />
            </div>
          ):null}

        {/* Mobile-optimized Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="w-full mb-3">
            <div className="overflow-x-auto">
              <TabsList className="flex w-max min-w-full sm:grid sm:grid-cols-6 sm:w-full">
                <TabsTrigger value="requests" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                  Заявки
                </TabsTrigger>
                <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                  Обзор
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                  Аналитика
                </TabsTrigger>
                <TabsTrigger value="management" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                  Управление
                </TabsTrigger>
                <TabsTrigger value="logs" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                  Логи
                </TabsTrigger>
                <TabsTrigger value="registration-requests" className="text-sm px-3 py-2 whitespace-nowrap">
                  Регистрации
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="registration-requests" className="mb-20">
            <RegistrationRequestsManager />
          </TabsContent>

          <TabsContent value="requests" className="mb-20">
            {/* График для десктопа */}
            {isDesktop && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Динамика заявок</CardTitle>
                <CardDescription className="text-sm">Количество заявок по дням</CardDescription>
              </CardHeader>
              <CardContent>
                    {/* Селектор интервала дат для десктопа */}
                    <div className="mb-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Фильтр по дате:</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetDateFilters}
                            className="text-xs"
                        >
                          Сбросить
                        </Button>
                      </div>

                      {/* Выбор интервала дат */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-600">От:</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                              >
                                <CalendarLucid className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "dd.MM.yyyy", { locale: ru }) : "Начальная дата"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                  mode="single"
                                  selected={startDate}
                                  onSelect={setStartDate}
                                  initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label className="text-xs text-gray-600">До:</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                              >
                                <CalendarLucid className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "dd.MM.yyyy", { locale: ru }) : "Конечная дата"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                  mode="single"
                                  selected={endDate}
                                  onSelect={setEndDate}
                                  disabled={(date) => startDate ? date < startDate : false}
                                  initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                <div className="h-48 sm:h-64">
                  {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <defs>
                            <linearGradient id="kcellGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8E24AA" stopOpacity={1} />
                              <stop offset="100%" stopColor="#6A1B9A" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis allowDecimals={false} />
                              <TooltipForTabs />
                          <Line
                              type="monotone"
                              dataKey="count"
                              stroke="url(#kcellGradient)"
                              strokeWidth={2.5}
                              dot={{ r: 4, stroke: '#6A1B9A', strokeWidth: 1.5, fill: '#fff' }}
                              activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="text-gray-500 text-center py-16">Нет данных для отображения</div>
                  )}
                </div>
              </CardContent>
            </Card>
            )}
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
                    <SelectItem value="overdue">Просрочено</SelectItem>
                    <SelectItem value="long_term">Долгосрочные</SelectItem>
                    <SelectItem value="rejected">Отклоненные</SelectItem>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ contain: 'layout style paint' }}>
                {filteredRequests.map((requestGroup, index) => {
                  const isLast = index === filteredRequests.length - 1;
                  return (
                      <RequestCard
                          key={`incoming-${index}`}
                          request={requestGroup}
                          onCardClick={handleCardClick}
                          renderCardHeader={renderCardHeader}
                          isLast={isLast}
                          lastElementRef={lastRequestRef}
                      />
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6 mb-20">

            {/* Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Распределение по типам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Обычные</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${distribution.normalPercent}%`}}></div>
                      </div>
                      <span className="text-sm font-medium w-8">{distribution.normal}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Экстренные</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-600 h-2 rounded-full" style={{ width: `${distribution.urgentPercent}%`}}></div>
                      </div>
                      <span className="text-sm font-medium w-8">{distribution.urgent}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Плановые</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${distribution.plannedPercent}%` }}></div>
                      </div>
                      <span className="text-sm font-medium w-8">{distribution.planned}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                      return true; // Заявка найдена
                    }
                    return false; // Заявка не найдена
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mb-20">
            <ManagerAnalytics />
          </TabsContent>

          {/* Management Tab Content for Manager */}
          <TabsContent value="management">
            <div className="space-y-6 mb-20">
              {/* Office Management Card (Moved here) */}
              <Card>
                <CardHeader>
                  <CardTitle>Управление офисами</CardTitle>
                  <CardDescription>Добавление и управление офисами компании</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Форма добавления офиса */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                        placeholder="Город нового офиса"
                        value={newOfficeCity}
                        onChange={(e) => setNewOfficeCity(e.target.value)}
                        className="w-full sm:flex-1"
                    />
                    <Input
                        placeholder="Расположение нового офиса"
                        value={newOfficeAddress}
                        onChange={(e) => setNewOfficeAddress(e.target.value)}
                        className="w-full sm:flex-1"
                    />
                    <Input
                        placeholder="Название нового офиса"
                        value={newOfficeName}
                        onChange={(e) => setNewOfficeName(e.target.value)}
                        className="w-full sm:flex-1"
                    />
                    <Button
                        onClick={handleAddOffice}
                        disabled={!newOfficeName.trim()}
                        className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить офис
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Существующие офисы ({offices.length}):</Label>
                    {offices.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Нет добавленных офисов.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {offices.map((officeItem: any, index: number) => (
                              <div
                                  key={index}
                                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded-lg border space-y-2 sm:space-y-0"
                              >
                                {editingOfficeId === officeItem.id ? (
                                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                                      <Input
                                          value={editedOffice.name}
                                          onChange={(e) =>
                                              setEditedOffice({ ...editedOffice, name: e.target.value })
                                          }
                                          placeholder="Название офиса"
                                          className="w-full sm:flex-1"
                                      />
                                      <Input
                                          value={editedOffice.city}
                                          onChange={(e) =>
                                              setEditedOffice({ ...editedOffice, city: e.target.value })
                                          }
                                          placeholder="Город"
                                          className="w-full sm:flex-1"
                                      />
                                      <Input
                                          value={editedOffice.address}
                                          onChange={(e) =>
                                              setEditedOffice({ ...editedOffice, address: e.target.value })
                                          }
                                          placeholder="Адрес"
                                          className="w-full sm:flex-1"
                                      />
                                      <Button
                                          onClick={() => handleUpdateOffice(officeItem.id)}
                                          className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                                      >
                                        Сохранить
                                      </Button>
                                      <Button
                                          variant="ghost"
                                          onClick={() => setEditingOfficeId(null)}
                                          className="w-full sm:w-auto"
                                      >
                                        Отмена
                                      </Button>
                                    </div>
                                ) : (
                                    <>
                                      <div className="text-gray-700">
                                        <div className="text-lg font-semibold">{officeItem.name}</div>
                                        <div className="text-sm text-gray-600">
                                          Город: <span className="font-medium">{officeItem.city}</span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          Адрес: <span className="font-medium">{officeItem.address}</span>
                                        </div>
                                      </div>
                                      <div className="flex flex-row gap-2 w-full sm:w-auto justify-start sm:justify-end">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingOfficeId(officeItem.id);
                                              setEditedOffice({
                                                name: officeItem.name,
                                                city: officeItem.city,
                                                address: officeItem.address,
                                              });
                                            }}
                                            className="w-full sm:w-auto"
                                        >
                                          ✎
                                        </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                            onClick={() => {
                                              setOfficeToDelete(officeItem);
                                              setShowDeleteOfficeModal(true);
                                            }}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                      </div>
                                    </>
                                )}
                              </div>
                          ))}
                        </div>
                    )}
                  </div>
                </CardContent>

              </Card>

              <OfficeLocationsManager offices={offices} />

              {/* Управление категориями услуг */}
              <Card>
                <CardHeader>
                  <CardTitle>Управление категориями услуг</CardTitle>
                  <CardDescription>Создание и удаление категорий услуг</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Форма создания категории */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Создать новую категорию</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Название категории"
                        className="flex-1"
                        disabled={isCreatingCategory}
                      />
                      <Button
                        onClick={handleCreateCategory}
                        disabled={!newCategoryName.trim() || isCreatingCategory}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isCreatingCategory ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Создание...</span>
                          </div>
                        ) : (
                          "Создать"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Форма удаления категории */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Удалить категорию</Label>
                    <div className="flex gap-2 min-w-0">
                      <Select onValueChange={(categoryId) => setCategoryToDelete(parseInt(categoryId) || null)} value={categoryToDelete?.toString() || ""}>
                        <SelectTrigger className="flex-1 min-w-0">
                          <SelectValue placeholder="Выберите категорию для удаления" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => {
                            const hasExecutors = categoriesWithExecutors.has(category.id);
                            return (
                              <SelectItem 
                                key={category.id} 
                                value={category.id.toString()}
                                disabled={hasExecutors}
                                className={hasExecutors ? "text-gray-400" : ""}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{category.name}</span>
                                  {hasExecutors && (
                                    <span className="text-xs text-gray-500">(есть исполнители)</span>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleDeleteCategory}
                        disabled={!categoryToDelete || isDeletingCategory || (categoryToDelete ? categoriesWithExecutors.has(categoryToDelete) : false)}
                        variant="destructive"
                        className="flex-shrink-0"
                      >
                        {isDeletingCategory ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Удаление...</span>
                          </div>
                        ) : (
                          "Удалить"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Отображение ошибок */}
                  {categoryError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{categoryError}</p>
                    </div>
                  )}

                  {/* Список существующих категорий */}
                  <div className="space-y-2">
                    <Label>Существующие категории ({categories.length}):</Label>
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Нет добавленных категорий.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {categories.map((category) => {
                          const hasExecutors = categoriesWithExecutors.has(category.id);
                          return (
                            <div
                              key={category.id}
                              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border"
                            >
                              <div className="text-gray-700">
                                <div className="text-lg font-semibold">{category.name}</div>
                                {hasExecutors && (
                                  <div className="text-sm text-gray-500">Есть исполнители</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Управление пользователями */}
              <Card>
                <CardHeader>
                  <CardTitle>Управление пользователями</CardTitle>
                  <CardDescription>Редактирование и удаление пользователей</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 mb-8">
                  {/* Поиск и фильтры пользователей */}
                  <div className="space-y-3">
                    {/* Поиск по имени */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                        placeholder="Поиск по имени или номер"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />

                    <Button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="min-w-[120px]"
                    >
                      {isSearching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                          "Найти"
                      )}
                    </Button>

                    {/* Кнопка сброса */}
                      {(searchInput || officeFilter || roleFilter) && (
                        <Button
                            variant="outline"
                            onClick={() => {
                              setSearchInput('');
                                setOfficeFilter(null);
                                setRoleFilter(null);
                              fetchUsers(1);
                            }}
                        >
                            Сбросить все
                        </Button>
                    )}
                  </div>

                    {/* Фильтры */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Фильтр по офису */}
                      <Select 
                          value={officeFilter?.toString() || "all"} 
                          onValueChange={(value) => setOfficeFilter(value === "all" ? null : parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Фильтр по офису" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все офисы</SelectItem>
                          {offices.map((office: any, index: number) => (
                              <SelectItem key={index} value={office.id.toString()}>
                                {office.name}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Фильтр по роли */}
                      <Select 
                          value={roleFilter || "all"} 
                          onValueChange={(value) => setRoleFilter(value === "all" ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Фильтр по роли" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все роли</SelectItem>
                          <SelectItem value="client">Клиент</SelectItem>
                          <SelectItem value="admin-worker">Администратор офиса</SelectItem>
                          <SelectItem value="department-head">Руководитель направления</SelectItem>
                          <SelectItem value="executor">Исполнитель</SelectItem>
                          <SelectItem value="manager">Руководитель</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Индикатор активных фильтров */}
                    {(officeFilter || roleFilter) && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-gray-600">Активные фильтры:</span>
                        {officeFilter && (
                          <Badge variant="secondary" className="text-xs">
                            Офис: {offices.find(o => o.id === officeFilter)?.name}
                            <button
                              onClick={() => setOfficeFilter(null)}
                              className="ml-1 text-gray-500 hover:text-gray-700"
                            >
                              ×
                            </button>
                          </Badge>
                        )}
                        {roleFilter && (
                          <Badge variant="secondary" className="text-xs">
                            Роль: {roleTranslations[roleFilter] || roleFilter}
                            <button
                              onClick={() => setRoleFilter(null)}
                              className="ml-1 text-gray-500 hover:text-gray-700"
                            >
                              ×
                            </button>
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Форма редактирования пользователя */}
                  {editingUserId && (
                    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-800">Редактирование пользователя</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <Input
                            placeholder="Полное имя"
                            value={newUser.full_name}
                            onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                        />
                        <Input
                            placeholder="Номер телефона"
                            value={newUser.phone}
                            onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                        />
                        <Select
                            value={String(newUser.office_id === 0 ? "" : newUser.office_id)}
                            onValueChange={(val) => setNewUser({ ...newUser, office_id: Number(val) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Офис" />
                          </SelectTrigger>
                          <SelectContent>
                            {offices.map((office: any, index: number) => (
                                <SelectItem key={index} value={String(office.id)}>
                                  {office.name}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select
                            value={newUser.role}
                            onValueChange={(val) => setNewUser({ ...newUser, role: val, category_id: 0 })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Роль" />
                          </SelectTrigger>
                          <SelectContent>
                            {["client", "admin-worker", "manager"]
                                .map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {roleTranslations[role] || role}
                                    </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formErrors && <p className="text-sm text-red-500">{formErrors}</p>}

                      {/* Кнопки сохранить и отмена */}
                      <div className="flex gap-2 min-w-0 flex-wrap">
                        <Button
                            onClick={handleUpdateUser}
                            disabled={!isValidUser || loading}
                            className="bg-green-600 hover:bg-green-700 flex-shrink-0"
                        >
                          Сохранить изменения
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                              setEditingUserId(null);
                              setNewUser({
                                id: 0,
                                full_name: "",
                                phone: "",
                                office_id: 0,
                                role: "",
                                category_id: 0,
                              });
                              setFormErrors(null);
                            }}
                            className="flex-shrink-0"
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Список пользователей */}
                  <div className="space-y-2 mt-4">
                    <Label>Пользователи ({pagination.totalItems}):</Label>

                    {users.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Нет пользователей.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {users.map((user: any, index: number) => (
                              <div
                                  key={index}
                                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 bg-gray-50 rounded-lg border"
                              >
                                {/* Информация о пользователе */}
                                <div className="flex-1 min-w-0 max-w-full sm:max-w-[75%]">
                                  <div className="font-semibold text-gray-800 truncate">{user.full_name}</div>
                                  {user.phone && (
                                    <div className="text-sm text-gray-500 truncate">{user.phone}</div>
                                  )}
                                  <div className="text-xs text-gray-400 truncate">
                                    {roleTranslations[user.role] || user.role} • {user.office?.name || 'Офис не указан'}
                                  </div>
                                </div>

                                {/* Кнопки действий */}
                                <div className="flex space-x-2 justify-end">
                                  <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => handleEditUser(user)}
                                  >
                                    ✎
                                  </Button>

                                      <Button
                                          size="icon"
                                          variant="ghost"
                                      onClick={() => {
                                        setUserToDelete(user);
                                        setShowDeleteUserModal(true);
                                      }}
                                          className="text-red-500 hover:text-red-700"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                </div>
                              </div>
                          ))}
                        </div>
                    )}

                    {/* Пагинация */}
                    <div className="flex justify-between items-center mt-4" >
                      <div className="text-sm text-gray-500">
                        Показано {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}-
                        {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} из {pagination.totalItems}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            disabled={pagination.currentPage === 1}
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                        >
                          Назад
                        </Button>
                        <Button
                            variant="outline"
                            disabled={pagination.currentPage * pagination.itemsPerPage >= pagination.totalItems}
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                        >
                          Вперед
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          <TabsContent value="logs">
            <div className="w-full pb-20">
            <LogsViewer userRole="manager" isDesktop={isDesktop} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsModalOpen(false);
                      closeModal();
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

      {/* Request Details Modal */}
      {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => {
            setSelectedRequest(null)
            setShowComments(null)
            closeModal();
          }}>
            <Card className={`w-full ${isDesktop ? 'max-w-2xl' : 'max-w-full h-full'} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="font-medium text-gray-900">Заявка #{selectedRequest.id}</CardTitle>
                  {selectedRequest.status !== 'completed' && (
                    <Button
                      variant={isEditingMode ? "destructive" : "outline"}
                      size="sm"
                      className={!isEditingMode ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600" : ""}
                      onClick={() => {
                        if (isEditingMode) {
                          // Отменяем редактирование
                          setEditableRequestType(selectedRequest.request_type);
                          setEditableLocationDetail(selectedRequest.location_detail || "");
                          setEditingCategoryId(null);
                          setSubRequestSettings({});
                          setFormErrors(null);
                          setIsEditingMode(false);
                          
                          // Сбрасываем поля подзаявок
                          const titles: {[key: number]: string} = {};
                          const descriptions: {[key: number]: string} = {};
                          const complexity: {[key: number]: string} = {};
                          const sla: {[key: number]: string} = {};
                          selectedRequest.requests.forEach((subRequest: any) => {
                            titles[subRequest.id] = subRequest.title || "";
                            descriptions[subRequest.id] = subRequest.description || "";
                            complexity[subRequest.id] = subRequest.complexity || "";
                            sla[subRequest.id] = subRequest.sla || "";
                          });
                          setEditableSubRequestTitles(titles);
                          setEditableSubRequestDescriptions(descriptions);
                          setEditableSubRequestComplexity(complexity);
                          setEditableSubRequestSla(sla);
                        } else {
                          // Включаем редактирование
                          setIsEditingMode(true);
                        }
                      }}
                    >
                      {isEditingMode ? "Отменить" : "Редактировать"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-16">
                <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Тип заявки </Label>
                  {isEditingMode && selectedRequest.request_type !== "planned" ? (
                    <Select value={editableRequestType} onValueChange={setEditableRequestType}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Обычная</SelectItem>
                        <SelectItem value="urgent">Экстренная</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getTypeColor(selectedRequest.request_type)}>{translateType(selectedRequest.request_type)}</Badge>
                  )}
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
                              <div className="flex justify-between items-start mb-3 gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    {isEditingMode ? (
                                      <div className="flex-1">
                                        <Input
                                          value={editableSubRequestTitles[subRequest.id] || subRequest.title}
                                          onChange={(e) => setEditableSubRequestTitles(prev => ({
                                            ...prev,
                                            [subRequest.id]: e.target.value
                                          }))}
                                          placeholder="Название подзаявки"
                                          className="w-full"
                                        />
                                      </div>
                                    ) : (
                                      <h4 className={`font-semibold text-gray-900 ${isDesktop ? 'text-base' : 'text-md'}`}>№ {getSubRequestDisplayId(subRequest, selectedRequest.id)} {subRequest.title}</h4>
                                    )}
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
                                                                      {selectedRequest.request_type !== 'recurring' && renderLongTermWithTooltip(subRequest.is_long_term || false)}

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
                                      userRole="manager"
                                      isSubRequest={true}
                                      onDelete={(subReq) => {
                                        handleDeleteSubRequest(subReq);
                                      }}
                                      onRateRequest={(request) => {
                                        setRequestToRate(request);
                                        setShowRatingModal(true);
                                        openModal('ratingModal');
                                        // Загружаем существующую оценку
                                        checkUserRating(request.id);
                                      }}
                                  />
                      </div>
                    </div>

                              {/* Краткое описание */}
                              <div className={`text-gray-600 mb-3 ${isDesktop ? 'text-sm' : 'text-base leading-relaxed'}`}>
                                {isEditingMode ? (
                                  <Textarea
                                    value={editableSubRequestDescriptions[subRequest.id] || subRequest.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditableSubRequestDescriptions(prev => ({
                                      ...prev,
                                      [subRequest.id]: e.target.value
                                    }))}
                                    placeholder="Описание подзаявки"
                                    className="w-full min-h-[80px]"
                                  />
                                ) : isDesktop ? (
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
                                   <SubRequestInfo 
                                     subRequest={subRequest} 
                                     isEditingMode={isEditingMode}
                                     editableComplexity={editableSubRequestComplexity[subRequest.id]}
                                     editableSla={editableSubRequestSla[subRequest.id]}
                                     onComplexityChange={(value) => setEditableSubRequestComplexity(prev => ({
                                       ...prev,
                                       [subRequest.id]: value
                                     }))}
                                     onSlaChange={(value) => setEditableSubRequestSla(prev => ({
                                       ...prev,
                                       [subRequest.id]: value
                                     }))}
                                   />

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
                  {isEditingMode ? (
                    <Input
                      value={editableLocationDetail}
                      onChange={(e) => setEditableLocationDetail(e.target.value)}
                      placeholder="Введите расположение в офисе"
                      className="w-full"
                    />
                  ) : (
                    <p className="text-sm">{selectedRequest.location_detail}</p>
                  )}
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
                                    className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-purple-400 transition-colors"
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
                                    className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-purple-400 transition-colors"
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

                {/* Отображение ошибок */}
                {formErrors && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                    <p className="text-sm text-red-600">{formErrors}</p>
                  </div>
                )}

                {/* Кнопки сохранения изменений */}
                {isEditingMode && (
                  (editableRequestType && editableRequestType !== selectedRequest.request_type) ||
                  (editableLocationDetail && editableLocationDetail !== selectedRequest.location_detail) ||
                  Object.keys(editableSubRequestTitles).some(id => 
                    editableSubRequestTitles[parseInt(id)] !== selectedRequest.requests.find((r: any) => r.id === parseInt(id))?.title
                  ) ||
                  Object.keys(editableSubRequestDescriptions).some(id => 
                    editableSubRequestDescriptions[parseInt(id)] !== selectedRequest.requests.find((r: any) => r.id === parseInt(id))?.description
                  ) ||
                  Object.keys(editableSubRequestComplexity).some(id => 
                    editableSubRequestComplexity[parseInt(id)] !== selectedRequest.requests.find((r: any) => r.id === parseInt(id))?.complexity
                  ) ||
                  Object.keys(editableSubRequestSla).some(id => 
                    editableSubRequestSla[parseInt(id)] !== selectedRequest.requests.find((r: any) => r.id === parseInt(id))?.sla
                  )
                ) && (
                  <div className="flex gap-2 mb-4">
                    <Button
                      onClick={handleUpdateRequest}
                      disabled={isUpdatingRequest}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isUpdatingRequest ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Сохранение...
                        </>
                      ) : (
                        "Сохранить"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Восстанавливаем исходные значения из selectedRequest
                        setEditableRequestType(selectedRequest.request_type);
                        setEditableLocationDetail(selectedRequest.location_detail || "");
                        setEditingCategoryId(null);
                        setSubRequestSettings({});
                        setFormErrors(null);
                        setIsEditingMode(false);
                      }}
                      disabled={isUpdatingRequest}
                      className="flex-1"
                    >
                      Отменить
                    </Button>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => {
                    setSelectedRequest(null);
                    setEditableRequestType("");
                    setEditingCategoryId(null);
                    setSubRequestSettings({});
                    setFormErrors(null);
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
      {/* Create Request Modal */}
      <CreateRequestModal
          isOpen={showCreateRequestModal}
          onClose={() => {
            setShowCreateRequestModal(false);
            // Удаляем createRequest из стека модальных окон
            setModalStack(prev => prev.filter(modal => modal !== 'createRequest'));
          }}
          userRole="manager"
          categories={categories}
          onSubmit={handleCreateRequest}
          isSubmitting={isSubmitting}
          formErrors={formErrors}
          clientLocation={requestLocation}
          offices={offices}
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

      {/* Delete Request Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteRequestModal && !!requestToDelete}
        onClose={() => {
          setShowDeleteRequestModal(false);
          closeModal();
          setRequestToDelete(null);
        }}
        isLoading={isDeleteLoading}
        onConfirm={confirmDeleteRequest}
        title={`Удалить заявку #${requestToDelete?.id}?`}
        description={`Вы уверены, что хотите удалить заявку? Это действие необратимо.`}
      />

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
      <AcceptRequestModal
          isOpen={approveModal.isOpen}
          onClose={approveModal.hideAccept}
          title='Заявка удалена'
          message='Заявка была успешно удалена.'
          duration={approveModal.duration}
      />

      {/* Unified Delete Confirmation Modals */}
      <DeleteConfirmationModal
        isOpen={showDeleteOfficeModal && !!officeToDelete}
        onClose={() => {
          setShowDeleteOfficeModal(false);
          setOfficeToDelete(null);
        }}
        onConfirm={() => {
          if (officeToDelete) {
            handleRemoveOffice(officeToDelete.id);
            setOfficeToDelete(null);
            setShowDeleteOfficeModal(false);
          }
        }}
        title="Удалить офис?"
        description={`Это действие нельзя отменить. Удалить офис ${officeToDelete?.name}?`}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteUserModal && !!userToDelete}
        onClose={() => {
          setShowDeleteUserModal(false);
          setUserToDelete(null);
        }}
        onConfirm={() => {
          if (userToDelete) {
            handleDeleteUser(userToDelete.id);
            setUserToDelete(null);
            setShowDeleteUserModal(false);
          }
        }}
        title="Удалить пользователя?"
        description={`Вы уверены, что хотите удалить пользователя ${userToDelete?.full_name}? Это действие нельзя отменить.`}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteCategoryModal && !!categoryToDelete}
        onClose={() => {
          setShowDeleteCategoryModal(false);
          setCategoryToDelete(null);
        }}
        onConfirm={() => {
          if (categoryToDelete) {
            handleDeleteCategory();
            setCategoryToDelete(null);
            setShowDeleteCategoryModal(false);
          }
        }}
        title="Удалить категорию?"
        description={`Это действие нельзя отменить. Вы действительно хотите удалить категорию?`}
      />

      {/* Модальное окно информации об иконках */}
      <IconInfoModal
          isOpen={!!showIconInfo}
          onClose={() => setShowIconInfo(null)}
          iconInfo={showIconInfo}
          isDesktop={isDesktop}
      />

      <BottomNav

          activeTab="history"
          hidden={showCreateRequestModal || showMapModal || showDeleteRequestModal || isModalOpen || !!selectedPhoto || !!selectedRequest}
      />

      {isDesktop && <Link
          href="/chat-bot"
          className="fixed bottom-4 right-4 z-50 flex items-center justify-center w-14 h-14 bg-purple-100 text-purple-600 rounded-full shadow-lg hover:bg-purple-200 transition"
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

