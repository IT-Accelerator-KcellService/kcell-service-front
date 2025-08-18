"use client"

import React, {useCallback, useEffect, useRef, useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Textarea} from "@/components/ui/textarea"
import {useRouter, useSearchParams} from "next/navigation"


import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar as CalendarLucid,
  Camera,
  CheckCircle,
  Clock,
  Download,
  ImageIcon,
  Loader2,
  MapPin, MessageCircle,
  Plus, Send,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  XCircle,
  Zap,
} from "lucide-react"
import axios from "axios";
import Header from "@/app/header/Header";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {format, isAfter, subDays, subMonths, subYears} from "date-fns";
import {useNotificationStore} from "@/stores/notificationStore";
import {SuccessModal} from "@/components/success-model";
import {useSuccessModal} from "@/hooks/use-success-modal";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {ru} from "date-fns/locale";
import {Calendar} from "@/components/ui/calendar";
import {BottomNav} from "@/components/BottomNav";
import {useMediaQuery} from "@/hooks/use-media-query";
import {AcceptRequestModal} from "@/components/AcceptRequestModal";
import {useAcceptRequestModal} from "@/hooks/use-approve-modal";
import { ProfileModal } from "@/components/ProfileModal"
import {NotificationsSidebar} from "@/components/notification/NotificationsSidebar";
import {CommentList} from "@/components/comment/Comment";
import {useRequestStore, Request} from "@/stores/useRequestStore";
import PullToRefresh from "@/components/pull-to-refresh";
import Link from "next/link";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import { RoleBasedActionMenu } from "@/components/action-menu";
import { LogsViewer } from "@/components/logs-viewer";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
declare global {
  interface Window {
    androidApp?: {
      saveFileBase64: (fileName: string, base64: string, mimeType: string) => void;
      reloadPage: () => void;
      notifyReady: () => void;
    };
  }
}
const MapView = dynamic(() => import('@/app/map/MapView'), {
  ssr: false,
})
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
  email: string;
  phone?: string;
  office_id: number;
  role: string;
  service_category_id: number
}

interface Comment {
  id: number,
  request_id: number,
  sender_id: number,
  comment: string,
  timestamp: Date
}

interface Stats {
  officeId: number;
  data: {
    [date: string]: {
      totalRequests: number;
      completedRequests: number;
      overdueUrgentRequests: number;
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

const parseLocalDate = (dateString: string) => {
  return new Date(dateString + "T00:00:00");
};

export default function ManagerDashboard() {
  const {role, token, clearAuth, user} = useAuthStore()
  const {categories, fetchCategories, clearCategories, updateCategories} = useCategoryStore()
  const [newRequestCategory, setNewRequestCategory] = useState("")
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const searchParams = useSearchParams()
  const successModal = useSuccessModal()
  const approveModal = useAcceptRequestModal()
  const router = useRouter()
  const [period, setPeriod] = useState("month")
  const [office, setOffice] = useState("all")
  const [newRequestOfficeId, setNewRequestOfficeId] = useState("")
  const [tab, setTab] = useState("requests")
  const [offices, setOffices] = useState<any[]>([])
  const [newOfficeName, setNewOfficeName] = useState("")
  const [newOfficeCity, setNewOfficeCity] = useState("")
  const [newOfficeAddress, setNewOfficeAddress] = useState("")
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [newRequestType, setNewRequestType] = useState("Обычная")
  const [newRequestTitle, setNewRequestTitle] = useState("")
  const [newRequestLocation, setNewRequestLocation] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const { notifications, setNotifications, setNotificationLoading, clearNotifications } = useNotificationStore()
  const [loading, setLoading] = useState(true)
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [description, setDescription] = useState("");
  const [requestLocation, setRequestLocation] = useState("")
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<any>(null)
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const {requests, setRequests, clearRequests} = useRequestStore()
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [editCommentId, setEditCommentId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [officeToDelete, setOfficeToDelete] = useState<OfficeType | null>(null)
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null)
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null)
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [showDeleteOfficeModal, setShowDeleteOfficeModal] = useState(false)
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false)
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleteReason, setDeleteReason] = useState("")
  const [newRequestPlannedDate, setNewRequestPlannedDate] = useState("")
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
  });

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const date = newRequestPlannedDate
      ? parseLocalDate(newRequestPlannedDate)
      : undefined;
  const [newRequestSLA, setNewRequestSLA] = useState("1h");
  const [newRequestComplexity, setNewRequestComplexity] = useState<'simple' | 'medium' | 'complex'>('simple');
  const [newUser, setNewUser] = useState({
    id: 0,
    email: "",
    full_name: "",
    phone: "",
    office_id: 0,
    role: "",
    category_id: 0,
  });
  const [searchInput, setSearchInput] = useState(''); // Отдельное состояние для input
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
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
  const lastRequestRef = useCallback((node: HTMLDivElement) => {
    lastElementRef.current = node;
  }, []);
  const [stats, setStats] = useState<Stats[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [kpi, setKpi] = useState({
    total: 0,
    completed: 0,
    overdue: 0,
    emergency: 0,
  });

  const [modalStack, setModalStack] = useState<string[]>([]);

  const filteredRequests = requests.filter((request) => {
    const now = new Date();
    let periodStartDate: Date | null = null;

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
      (filterStatus === "long_term" ? request.is_long_term : request.status === filterStatus);
    const requestType = request.request_type;
    const typeMatch = filterType === "all" || requestType === filterType;
    const officeMatch = office === "all" || office == String(request.office_id);

    const createdDate = new Date(request.created_date);
    const periodMatch = !periodStartDate || isAfter(createdDate, periodStartDate);

    return statusMatch && typeMatch && officeMatch && periodMatch;
  })

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

  const fetchStats = async () => {
    try {
      const res = await api.get("/analytics/stats/manager");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  const openModal = (name: string) => {
    setModalStack(prev => [...prev, name]);
    window.history.pushState({ modal: name }, '', window.location.pathname);
  };

  const closeModal = () => {
    setModalStack(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (!stats.length) {
      fetchStats();
    }
  }, []);

  useEffect(() => {
    const create = searchParams.get("createRequest")

    if (create === "true") {
      closeAllModalsExcept('createRequest');
      setShowCreateRequestModal(true)
      openModal('createRequest');
      router.replace(`/${role}`, { scroll: false })
    }
    if(create === "false") {
      setShowCreateRequestModal(false)
      closeModal()
      router.replace(`/${role}`, { scroll: false })
    }
  }, [searchParams])

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
          overdue += data.totalRequests - data.completedRequests;
          emergency += data.overdueUrgentRequests;
        }
      });
    });

    return { total, completed, overdue, emergency };
  };

  const prepareChartData = (stats: Stats[], selectedOffice: string, selectedPeriod: string) => {
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

  const fetchUsers = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/users?page=${page}&limit=${pagination.itemsPerPage}`);
      setUsers(response.data.users || response.data);
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalItems: response.data.total,
      }));
    } catch (error) {
      setLoading(false);
      console.error('Ошибка при загрузке пользователей:', error);
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (modalStack.length > 0) {
        e.preventDefault();
        const lastModal = modalStack[modalStack.length - 1];

        switch (lastModal) {
          case 'createRequest':
            setShowCreateRequestModal(false);
            break;
          case 'taskDetails':
            setSelectedTaskDetails(null);
            setComments([]);
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
          case 'commentDelete':
            setCommentToDelete(null);
            break;
          case 'deleteRequest':
            setShowDeleteRequestModal(false);
            setRequestToDelete(null);
            setDeleteReason("");
            break;
          case 'categoryDelete':
            setCategoryToDelete(null);
            break;
          default:
            break;
        }

        closeModal();
      }
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state?.modal) {
      window.history.replaceState({ modal: null }, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [modalStack]);

  const closeAllModalsExcept = (modalName: string) => {
    if (modalName !== 'createRequest') {
      setShowCreateRequestModal(false);
    }
    if (modalName !== 'taskDetails') {
      setSelectedTaskDetails(null);
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
    if (modalName !== 'commentDelete') {
      setCommentToDelete(null);
    }
    if (modalName !== 'deleteRequest') {
      setShowDeleteRequestModal(false);
      setRequestToDelete(null);
      setDeleteReason("");
    }
    setModalStack([modalName]);
    window.history.replaceState({ modal: modalName }, '', window.location.pathname);
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
      let periodStartDate: Date | null = null;

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

  const handleAddOrUpdateUser = async () => {
    try {
      setFormErrors(null);
      setLoading(true);

      // Если роль department-head, проверяем наличие категории
      if (newUser.role === "department-head" && !newUser.category_id) {
        setFormErrors("Выберите категорию для руководителя отдела");
        setLoading(false);
        return;
      }

      // Валидация телефона
      if (newUser.phone && newUser.phone.length < 10) {
        setFormErrors("Номер телефона должен содержать минимум 10 символов");
        setLoading(false);
        return;
      }

      const payload = {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        phone: newUser.phone,
        office_id: newUser.office_id,
        role: newUser.role,
        category_id: newUser.role === 'department-head' ? newUser.category_id : undefined,
      }

      if (editingUserId) {
        // Обновление
        const response = await api.put(`/users/${editingUserId}`, payload);
        setUsers((prev) =>
            prev.map((user) => (user.id === editingUserId ? response.data : user))
        );
      } else {
        // Добавление
        const response = await api.post("/users", newUser);
        response.data.office_id = newUser.office_id;
        response.data.category_id = newUser.category_id;
        setUsers((prev) => [...prev, response.data]);
      }

      setNewUser({
        id: 0,
        email: "",
        full_name: "",
        phone: "",
        office_id: 0,
        role: "",
        category_id: 0,
      });
      setEditingUserId(null);
    } catch (err) {
      setFormErrors("Ошибка при сохранении пользователя");
      console.error("Ошибка при сохранении пользователя:", err);
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
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      console.error("Ошибка при удалении пользователя:", err);
    } finally {
      setLoading(false);
    }
  };

  const isValidUser =
      newUser.email.trim() &&
      newUser.full_name.trim() &&
      newUser.office_id !== 0 &&
      newUser.role;

  const handleEditUser = (user: User) => {
    setNewUser({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || "",
      office_id: user.office_id,
      role: user.role,
      category_id: user.role === "department-head" ? Number(user.service_category_id) : 0,
    });
    setEditingUserId(user.id);
  };

  useEffect(() => {
    if (requests.length === 0) {
      fetchRequests(1)
    }
    if (notifications.length === 0) {
      fetchNotifications()
    }
    if (offices.length === 0) {
      fetchOffices()
    }
  }, [offices, notifications, requests]);

  const fetchRequests = async (pageToLoad = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/requests?page=${pageToLoad}&pageSize=10`);
      const newRequests = response.data.data;
      if (pageToLoad === 1) {
        setRequests(newRequests);
      } else {
        setRequests(prev => [...prev, ...newRequests]);
      }
      setHasMore(pageToLoad < response.data.totalPages);
      setPage(pageToLoad);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeleteRequest = (request: Request) => {
    setRequestToDelete(request)
    closeModal()
    setShowDeleteRequestModal(true);
    openModal('deleteRequest');
  }

  const confirmDeleteRequest = async () => {
    if (requestToDelete) {
      try {
        await api.delete(`/requests/${requestToDelete.id}`)
        fetchRequests()
        setShowDeleteRequestModal(false);
        closeModal()
        closeModal();
        setRequestToDelete(null)
        setDeleteReason("")
        approveModal.showAccept()
      } catch (error) {
        console.error("Failed to delete request:", error)
      }
    }
  }

  const handleCreateRequest = async () => {
    if (
        !newRequestTitle ||
        !description ||
        !newRequestOfficeId ||
        !newRequestType ||
        !requestLocation ||
        !newRequestLocation ||
        !selectedCategoryId ||
        (newRequestType === "planned" && !newRequestPlannedDate && !newRequestSLA && !newRequestComplexity) ||
        photos.length === 0
    ) {
      setFormErrors("Заполните все обязательные поля.");
      return;
    }

    setIsSubmitting(true);
    setFormErrors(null);

    try {
      const formData = new FormData();
      formData.append('title', newRequestTitle);
      formData.append('description', description);
      formData.append('request_type', newRequestType);
      formData.append('location', requestLocation);
      formData.append('location_detail', newRequestLocation);
      formData.append('category_id', String(selectedCategoryId));
      formData.append('office_id', newRequestOfficeId);
      formData.append('status', 'in_progress');
      if (newRequestComplexity) formData.append('complexity', newRequestComplexity);
      if (newRequestSLA) formData.append('sla', newRequestSLA);
      if (newRequestPlannedDate) formData.append('planned_date', newRequestPlannedDate);
      photos.forEach(photo => formData.append('photos', photo));
      formData.append('type', 'before');

      const response = await api.post('/requests/with-photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newRequest = response.data;
      setRequests(prev => [newRequest, ...prev]);
      successModal.showSuccess();
      resetForm();
    } catch (error: any) {
      console.error("Ошибка при создании заявки:", error);
      setFormErrors(error.response?.data?.error || "Не удалось создать заявку.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowCreateRequestModal(false);
    closeModal();
    setNewRequestType("");
    setNewRequestTitle("");
    setRequestLocation("");
    setNewRequestLocation("");
    setDescription("");
    setNewRequestPlannedDate("");
    setNewRequestSLA("1h");
    setNewRequestComplexity("simple");
    setPhotos([]);
    setPhotoPreviews([]);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const remainingSlots = 3 - photoPreviews.length;

    const selectedFiles = fileArray.slice(0, remainingSlots);

    const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));

    setPhotos((prev) => [...prev, ...selectedFiles]);
    setPhotoPreviews((prev) => [...prev, ...previewUrls]);

    event.target.value = '';
  };

  const fetchComments = async () => {
    if (!selectedTaskDetails?.id) return;
    try {
      const res = await api.get(`/comments/request/${selectedTaskDetails.id}`);
      setComments(res.data);
    } catch (err) {
      console.error("Ошибка при загрузке комментариев", err);
    }
  };

  const handleDelete = (id: number) => {
    // Убираем из UI сразу
    const oldComments = comments;
    setComments(prev => prev.filter(c => c.id !== id));

    api.delete(`/comments/${id}`).catch(err => {
      console.error("Ошибка при удалении", err);
      setComments(oldComments); // Восстанавливаем при ошибке
    });
  };

  const handleSend = () => {
    if (comment.trim() === "") return;

    if (editCommentId) {
      // Оптимистично обновляем UI
      setComments(prev =>
          prev.map(c => c.id === editCommentId ? { ...c, comment: comment.trim() } : c)
      );

      const currentEditId = editCommentId;
      const currentComment = comment.trim();

      setComment("");
      setEditCommentId(null);

      api.put(`/comments/${currentEditId}`, {
        comment: currentComment,
        request_id: selectedTaskDetails.id,
      }).catch(err => {
        console.error("Ошибка при обновлении", err);
        fetchComments(); // Откатываем, если ошибка
      });

    } else {
      // Создаём временный ID для UI
      const tempId = -(comments.length + 111);
      const newComment = {
        id: tempId,
        comment: comment.trim(),
        request_id: selectedTaskDetails.id,
        isTemp: true,
        timestamp: new Date(),
        sender_id: user?.id!,
        user: {
          id: user?.id!,
          full_name: user?.full_name!,
          role: role!,
        }
      };

      setComments(prev => [...prev, newComment]);

      const currentComment = comment.trim();
      setComment("");

      api.post(`/comments`, {
        comment: currentComment,
        request_id: selectedTaskDetails.id,
      })
          .then(() => fetchComments()) // Обновляем ID с сервера
          .catch(err => {
            console.error("Ошибка при добавлении", err);
            fetchComments(); // Откат
          });
    }
  };

  const handleEdit = (id: number, oldComment: string) => {
    setComment(oldComment);       // заполняем поле ввода
    setEditCommentId(id);         // запоминаем какой комментарий редактируем
  };

  useEffect(() => {
    if (selectedTaskDetails?.id) {
      fetchComments();
    }
  }, [selectedTaskDetails]);

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

    setShowCreateRequestModal(true);
    openModal('createRequest');
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

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      return;
    }

    try {
      const response = await api.get('/users/search', {
        params: {
          q: searchInput,
          limit: 5
        }
      });

      if (response.data.success) {
        setUsers(response.data.users);
      } else {

        console.error(response.data.message);
      }
    } catch (error) {

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

  const fetchOffices = async () => {
    try {
      const response = await api.get('/offices')
      setOffices(response.data)
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

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

  const getRequestTypeColor = (requestType: string) => {
    switch (requestType.toLowerCase()) {
      case "urgent":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-500"
      case "planned":
        return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-500"
      case "normal":
        return "bg-gradient-to-r from-purple-500 to-violet-600 text-white border-purple-500"
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-400"
    }
  }

  const getRequestTypeIcon = (requestType: string) => {
    switch (requestType.toLowerCase()) {
      case "urgent":
        return <AlertCircle className="w-3 h-3" />
      case "planned":
        return <CalendarLucid className="w-3 h-3" />
      case "normal":
        return <Clock className="w-3 h-3" />
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < rating ? "fill-purple-400 text-purple-400" : "text-gray-300"}`} />
    ))
  }

  const renderLongTermIndicator = (request: any) => {
    if (!request.is_long_term) {
      return null;
    }

    return (
      <div
        title="Долгосрочная задача"
        className="group relative p-2 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/40"
      >
        <span className="text-base font-medium animate-pulse drop-shadow-sm">
          ⏳
        </span>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping shadow-lg"></span>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse"></span>
      </div>
    );
  };

  const formatDateToString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleRefresh = async () => {
    try {
      setNewRequestType("")
      setNewRequestTitle("")
      setDescription("")
      setSelectedCategoryId(null)
      setNewRequestLocation("")
      setPhotoPreviews([])
      setComment("")
      setComments([])
      setFormErrors("")
      setPhotos([])
      setEditCommentId(null)
      setStats([])
      setChartData([])
      setPeriod("month")
      setOffice("all")
      setOffices([])
      setNewOfficeName("")
      setNewOfficeCity("")
      setNewOfficeAddress("")
      setFilterStatus("all")
      setFilterType("all")
      setNewUser({ id: 0, email: "", full_name: "", phone: "", office_id: 0, role: "", category_id: 0 });
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

  const handleAddCategory = async () => {
    if (newRequestCategory.trim() && !categories.some(c => c.name === newRequestCategory.trim())) {
      try {
        const response = await api.post('/service-categories', {
          name: newRequestCategory.trim()
        })
        updateCategories(prev => [...prev, response.data])
        setNewRequestCategory("")
      } catch (error) {
        console.error("Failed to add category:", error)
      }
    }
  }

  const handleRemoveCategory = async (categoryId: number) => {
    try {
      await api.delete(`/service-categories/${categoryId}`)
      updateCategories(prev => prev.filter(category => category.id !== categoryId))
    } catch (error) {
      console.error("Failed to remove category:", error)
    }
  }

  return (
    <>
      <Header
          setShowProfile={setShowProfile}
          handleLogout={handleLogout}
          notificationCount={notifications.length}
          role="Руководитель"
      />
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />

    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <main className="px-4 py-4 sm:px-6 sm:py-8 max-w-7xl mx-auto">
        {/* Mobile Filters */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
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
            {isDesktop ? (
                <Button
                    onClick={() => {
                      handleOpenCreateRequest()
                    }}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
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
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="requests" className="text-xs sm:text-sm">
              Заявки
            </TabsTrigger>
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Обзор
            </TabsTrigger>
            <TabsTrigger value="management" className="text-xs sm:text-sm">
              Управление
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs sm:text-sm">
              Логи
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Динамика заявок</CardTitle>
                <CardDescription className="text-sm">Количество заявок по дням</CardDescription>
              </CardHeader>
              <CardContent>
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
                          <Tooltip />
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
            <div className="space-y-4">
              <div className="flex items-center space-x-4 mb-4">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="in_progress">В обработке</SelectItem>
                    <SelectItem value="execution">Исполнение</SelectItem>
                    <SelectItem value="completed">Завершено</SelectItem>
                    <SelectItem value="awaiting_assignment">Ожидает назначение</SelectItem>
                    <SelectItem value="assigned">Назначен</SelectItem>
                    <SelectItem value="long_term">⏳ Долгосрочные</SelectItem>
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
                {filteredRequests.map((request, index) => {
                  const isLast = index === filteredRequests.length - 1;
                  return (
                      <Card
                          key={request.id}
                          ref={isLast ? lastRequestRef : null}
                          className={`hover:shadow-xl transition-all duration-300 border-0 shadow-lg relative overflow-hidden cursor-pointer ${
                            request.is_long_term 
                              ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 hover:shadow-blue-400/30 border-l-4 border-blue-500' 
                              : 'bg-white hover:shadow-purple-400/20'
                          }`}
                          onClick={() => {setSelectedTaskDetails(request); openModal('taskDetails'); }}
                      >
                        {/* Заголовок с ID и статусами */}
                        <CardHeader className={`pb-3 px-5 pt-5 ${request.is_long_term ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-l-4 border-blue-500' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-bold text-base leading-tight line-clamp-2 ${request.is_long_term ? 'text-blue-900' : 'text-gray-900'}`}>
                                  {request.title}
                                </h3>
                                {request.is_long_term && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-lg">
                                    <span className="animate-pulse">⏳</span>
                                    <span>Долгосрочная</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${request.is_long_term ? 'text-blue-700 bg-blue-100' : 'text-purple-600 bg-purple-50'}`}>
                #{request.id}
              </span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${request.is_long_term ? 'text-indigo-700 bg-indigo-100' : 'text-gray-600 bg-gray-100'}`}>
                {request?.category?.name}
              </span>
                              </div>
                            </div>
                            <div className="flex gap-1 items-center">
                              <Badge
                                  variant="outline"
                                  className={`text-xs px-2 py-1 flex items-center gap-1 font-medium border-0 shadow-sm ${getStatusColor(request.status)}`}
                              >
                                {getStatusIcon(request.status)}
                                {translateStatus(request.status)}
                              </Badge>
                              <RoleBasedActionMenu
                                request={request}
                                isDesktop={isDesktop}
                                userRole="manager"
                                onViewDetails={(request) => {
                                  setSelectedTaskDetails(request);
                                  openModal('taskDetails');
                                }}
                                onDelete={(request) => {
                                  handleDeleteRequest(request);
                                }}
                              />
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="px-5 pb-5 pt-0 space-y-3">
                          {/* Описание */}
                          <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">{request.description}</p>

                          {/* Основная информация в сетке */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                              <MapPin className="w-4 h-4 flex-shrink-0 text-purple-500" />
                              <span className="truncate font-medium">{request.location_detail}</span>
                            </div>

                            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                              <CalendarLucid className="w-4 h-4 flex-shrink-0 text-purple-500" />
                              <span className="truncate font-medium">{formatDate(request.created_date)}</span>
                            </div>

                            {request.executor && request.executor.user.full_name ? (
                                <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                  <User className="w-4 h-4 flex-shrink-0 text-purple-500" />
                                  <div className="flex flex-col">
                                    <span className="truncate font-medium">{request.executor.user.full_name}</span>
                                    {request.executor.user.phone && (
                                      <span className="text-xs text-gray-500">{request.executor.user.phone}</span>
                                    )}
                                  </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-gray-400 bg-gray-50 p-2 rounded-lg">
                                  <User className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate font-medium">Не назначен</span>
                                </div>
                            )}

                            {request.rating ? (
                                <div className="flex items-center gap-1 justify-center bg-gray-50 p-2 rounded-lg">
                                  {renderStars(request.rating)}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center text-gray-400 bg-gray-50 p-2 rounded-lg">
                                  <span className="text-sm font-medium">Без оценки</span>
                                </div>
                            )}
                          </div>

                          {/* Фотографии */}
                          {request.photos && request.photos.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <ImageIcon className="w-4 h-4 text-purple-500" />
                                  <span className="text-sm font-medium text-gray-700">{request.photos.length} фото</span>
                                </div>
                                <div className="flex gap-2 overflow-x-auto">
                                  {request.photos.slice(0, 4).map((photo, index) => (
                                      <div key={index} className="flex-shrink-0">
                                        <img
                                            src={photo.photo_url || "/placeholder.svg"}
                                            alt={`Фото ${index + 1}`}
                                            className="w-12 h-12 rounded-lg object-cover border-2 border-purple-200 shadow-sm"
                                            onError={(e) => {
                                              e.currentTarget.src = `/placeholder.svg?height=48&width=48`;
                                            }}
                                        />
                                      </div>
                                  ))}
                                  {request.photos.length > 4 && (
                                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 border-2 border-purple-200 flex items-center justify-center shadow-sm">
                                        <span className="text-xs font-bold text-white">+{request.photos.length - 4}</span>
                                      </div>
                                  )}
                                </div>
                              </div>
                          )}

                          {/* Нижняя панель */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex gap-2">
                              <Badge
                                  variant="outline"
                                  className={`text-xs px-2 py-1 flex items-center gap-1 font-medium border-0 shadow-sm ${getRequestTypeColor(request.request_type)}`}
                              >
                                {getRequestTypeIcon(request.request_type)}
                                {translateType(request.request_type)}
                              </Badge>
                              {request.complexity && request.complexity !== "" && (
                                  <Badge
                                      variant="outline"
                                      className={`text-xs px-2 py-1 font-medium border-0 shadow-sm ${getComplexityColor(request.complexity)}`}
                                  >
                                    {translateComplexity(request.complexity)}
                                  </Badge>
                              )}
                            </div>

                            <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">ID: {request.id}</div>
                          </div>
                        </CardContent>
                      </Card>
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
                <NotificationsSidebar onNotificationClick={handleNotificationClick} />
              </CardContent>
            </Card>
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

              {/* Управление пользователями */}
              <Card>
                <CardHeader>
                  <CardTitle>Управление пользователями</CardTitle>
                  <CardDescription>Добавление, изменение и удаление пользователей</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 mb-8">
                  {/* Поиск пользователей */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Поле ввода */}
                    <Input
                        placeholder="Поиск по имени или email"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />

                    {/* Кнопка поиска */}
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
                    {searchInput && (
                        <Button
                            variant="outline"
                            onClick={() => {
                              setSearchInput('');
                              fetchUsers(1);
                            }}
                        >
                          Сбросить
                        </Button>
                    )}
                  </div>

                  {/* Форма добавления */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <Input
                        placeholder="Email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
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

                    <Select
                        value={newUser.role}
                        onValueChange={(val) => {
                          // Меняем роль только если не executor
                          if (!(editingUserId && newUser.role === "executor")) {
                            setNewUser({ ...newUser, role: val, category_id: 0 });
                          }
                        }}
                        disabled={!!editingUserId && newUser.role === "executor"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Роль" />
                      </SelectTrigger>
                      <SelectContent>
                        {["client", "admin-worker", "department-head", "manager", "executor"]
                            .filter((role) => {
                              if (!editingUserId && role === "executor") return false; // при добавлении убираем executor
                              return true;
                            })
                            .map((role) => (
                                <SelectItem key={role} value={role}>
                                  {roleTranslations[role] || role}
                                </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>

                    {/* Появляется только если выбрана роль department-head */}
                    {newUser.role === "department-head" && (
                        <Select
                            value={String(newUser.category_id) === "0" ? undefined : String(newUser.category_id)}
                            onValueChange={(val) => setNewUser({ ...newUser, category_id: Number(val) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Специализация" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat: any, index: number) => (
                                <SelectItem key={index} value={String(cat.id)}>
                                  {cat.name}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    )}
                  </div>
                  {formErrors && <p className="text-sm text-red-500">{formErrors}</p>}

                  {/* Кнопка добавить/сохранить */}
                  <Button
                      onClick={handleAddOrUpdateUser}
                      disabled={!isValidUser || loading}
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-fit"
                  >
                    {editingUserId ? "Сохранить" : "Добавить пользователя"}
                  </Button>

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
                                  <div className="text-sm text-gray-500 truncate">{user.email}</div>
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

              { /* Управление услугами */}
              <Card>
                <CardHeader>
                  <CardTitle>Управление услугами</CardTitle>
                  <CardDescription>Добавление и просмотр категорий услуг</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                        placeholder="Название новой категории"
                        value={newRequestCategory}
                        onChange={(e) => setNewRequestCategory(e.target.value)}
                    />
                    <Button onClick={handleAddCategory} disabled={!newRequestCategory.trim()}>
                      Добавить
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Существующие категории:</Label>
                    {categories.length === 0 ? (
                        <p className="text-sm text-gray-500">Нет добавленных категорий.</p>
                    ) : (
                        <ul className="list-disc pl-5">
                          {categories.map((category) => (
                              <li key={category.id} className="text-sm text-gray-700 flex justify-between items-center">
                                {category.name}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setCategoryToDelete(category);
                                      setShowDeleteCategoryModal(true);
                                    }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>

                              </li>
                          ))}
                        </ul>
                    )}
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

      {/* Create Request Modal */}
      {showCreateRequestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=> {
            setShowCreateRequestModal(false)
            closeModal()
          }}>
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Создать заявку</CardTitle>
                <CardDescription>Заполните форму для подачи новой заявки</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pb-16">
                <div>
                  <Label>Офис</Label>
                  <Select value={newRequestOfficeId} onValueChange={setNewRequestOfficeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите офис" />
                    </SelectTrigger>
                    <SelectContent>
                      {offices.map((officeItem:any, index: number) => (
                          <SelectItem key={index} value={String(officeItem.id)}>{officeItem.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Тип заявки</Label>
                  <Select value={newRequestType} onValueChange={setNewRequestType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип заявки" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Обычная</SelectItem>
                      <SelectItem value="urgent">Экстренная</SelectItem>
                      <SelectItem value="planned">Плановый</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Название заявки</Label>
                  <Input placeholder="Введите название заявки" value={newRequestTitle} onChange={e => setNewRequestTitle(e.target.value)} />
                </div>

                <div>
                  <Label>Локация</Label>
                  <Input
                      placeholder="Определение вашего местоположения..."
                      value={requestLocation}
                      readOnly
                      className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <Label>Расположение в офисе</Label>
                  <Input placeholder="Введите расположение" value={newRequestLocation} onChange={e => setNewRequestLocation(e.target.value)} />
                </div>

                <div>
                  <Label>Категория услуги</Label>
                  <Select
                      value={selectedCategoryId?.toString() || ""}
                      onValueChange={(value) => setSelectedCategoryId(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Сложность</Label>
                    <Select
                        value={newRequestComplexity}
                        onValueChange={(value: 'simple' | 'medium' | 'complex') => setNewRequestComplexity(value)}
                    >
                      <SelectTrigger>
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
                    <Label>SLA (Срок выполнения)</Label>
                    <Select
                        value={newRequestSLA}
                        onValueChange={setNewRequestSLA}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите срок" />
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

                {newRequestType === "planned" && (
                    <div>
                      <div className="grid gap-2">
                        <Label htmlFor="newRequestPlannedDate">Плановая дата выполнения</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                            >
                              {date ? format(date, "dd MMMM yyyy", { locale: ru }) : <span>Выберите дату</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(selectedDate) => {
                                  if (selectedDate) {
                                    setNewRequestPlannedDate(formatDateToString(selectedDate))
                                  }
                                }}
                                initialFocus
                                locale={ru}
                                fromDate={new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                )}

                <div>
                  <Label>Описание проблемы</Label>
                  <Textarea
                      placeholder="Опишите проблему подробно..."
                      className="min-h-[100px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
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
                              onClick={() => setPhotoPreviews(photoPreviews.filter((_, i) => i !== index))}
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
                {formErrors && <p className="text-sm text-red-500">{formErrors}</p>}
                <div className="flex space-x-4">
                  <Button onClick={handleCreateRequest} className="flex-1 bg-violet-600 hover:bg-violet-700" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Отправка...
                        </>
                    ) : (
                        "Отправить заявку"
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => {setShowCreateRequestModal(false); closeModal(); }} className="flex-1">
                    Отмена
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
      )}

      {/* Модалка */}
      {isModalOpen && selectedNotification && (
          <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => {
                setIsModalOpen(false);
                closeModal();
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
                      closeModal();
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

      {/* Task Details Modal */}
      {selectedTaskDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=> {
            setSelectedTaskDetails(null);
            closeModal();
            setComments([])
          }}>
            <Card className="w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Детали заявки #{selectedTaskDetails.id}</CardTitle>
                <CardDescription>{selectedTaskDetails.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Тип:</p>
                    <Badge className={getTypeColor(selectedTaskDetails.request_type)}>{translateType(selectedTaskDetails.request_type)}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Статус:</p>
                    <Badge variant="outline" className={getStatusColor(selectedTaskDetails.status)}>
                      {translateStatus(selectedTaskDetails.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Клиент:</p>
                    <p className="text-base text-gray-800">{selectedTaskDetails?.client?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Локация:</p>
                    <div>
                      <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const locText = selectedTaskDetails.location;
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
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Создано:</p>
                    <p className="text-base text-gray-800">{selectedTaskDetails.created_date}</p>
                  </div>
                  {selectedTaskDetails && selectedTaskDetails.request_type === "planned" ? (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Запланированная время:</p>
                        <p className="text-base text-gray-800">{selectedTaskDetails.planned_date}</p>
                      </div>
                  ): null}
                  <div>
                    <p className="text-sm font-medium text-gray-600">Деталь локаций:</p>
                    <p className="text-base text-gray-800">{selectedTaskDetails.location_detail}</p>
                  </div>
                  {selectedTaskDetails.category && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Категория:</p>
                        <p className="text-base text-gray-800">{selectedTaskDetails.category.name}</p>
                      </div>
                  )}
                  {selectedTaskDetails.complexity && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Сложность:</p>
                        <p className="text-base text-gray-800">{translateComplexity(selectedTaskDetails.complexity)}</p>
                      </div>
                  )}
                  {selectedTaskDetails.sla && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">SLA:</p>
                        <p className="text-base text-gray-800">
                          {selectedTaskDetails.sla === '1h' && '1 час'}
                          {selectedTaskDetails.sla === '4h' && '4 часа'}
                          {selectedTaskDetails.sla === '8h' && '8 часов'}
                          {selectedTaskDetails.sla === '1d' && '1 день'}
                          {selectedTaskDetails.sla === '3d' && '3 дня'}
                          {selectedTaskDetails.sla === '1w' && '1 неделя'}
                        </p>
                      </div>
                  )}
                  {selectedTaskDetails.plannedDate && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">Плановая дата:</p>
                        <p className="text-base text-gray-800">{selectedTaskDetails.plannedDate}</p>
                      </div>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-600">Описание:</p>
                  <p className="text-base text-gray-800">{selectedTaskDetails.description}</p>
                </div>
                {selectedTaskDetails.photos && selectedTaskDetails.photos.length > 0 && (
                    <div>
                      {selectedTaskDetails.photos && selectedTaskDetails.photos.length > 0 && (() => {
                        const clientPhotos = selectedTaskDetails.photos.filter((photo: any) => photo.type === "before");
                        const contractorPhotos = selectedTaskDetails.photos.filter((photo: any) => photo.type === "after");

                        return (
                            <div className="mt-4 space-y-4">
                              {/* Фотографии ДО */}
                              {clientPhotos.length > 0 && (
                                  <div>
                                    <Label className="font-bold">Фотографии «До» (загружены пользователем)</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {clientPhotos.map((photo: any, index: number) => (
                                          <img
                                              key={index}
                                              src={photo.photo_url || "/placeholder.svg"}
                                              alt={`До ${index + 1}`}
                                              className="w-24 h-24 object-cover rounded-lg cursor-pointer"
                                              onClick={() => {setSelectedPhoto(photo.photo_url); openModal('photoPreview'); }}
                                          />
                                      ))}
                                    </div>
                                  </div>
                              )}

                              {/* Фотографии ПОСЛЕ */}
                              <div>
                                <Label className="font-bold">Фотографии «После» (загружены подрядчиком)</Label>
                                {contractorPhotos.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {contractorPhotos.map((photo: any, index: number) => (
                                          <img
                                              key={index}
                                              src={photo.photo_url || "/placeholder.svg"}
                                              alt={`После ${index + 1}`}
                                              className="w-24 h-24 object-cover rounded-lg cursor-pointer"
                                              onClick={() => {setSelectedPhoto(photo.photo_url); openModal('photoPreview'); }}
                                          />
                                      ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 mt-2">Нет загруженных фотографий</div>
                                )}
                              </div>
                            </div>
                        );
                      })()}

                      {/* Комментарий исполнителя */}
                      <div className="mt-4">
                        <Label className="font-bold block">Комментарий исполнителя</Label>
                        <p className="text-sm mt-1">
                          {selectedTaskDetails.comment && selectedTaskDetails.comment.trim() !== ""
                              ? selectedTaskDetails.comment
                              : "Исполнитель ничего не написал"}
                        </p>
                      </div>


                      {/* Модальное окно */}
                      {selectedPhoto && (
                          <div
                              className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
                              onClick={() => {setSelectedPhoto(null); closeModal(); }}
                          >
                            <img
                                src={selectedPhoto}
                                alt="Увеличенное фото"
                                className="max-w-full max-h-full rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                      )}
                    </div>
                )}

                {/* Секция для комментариев */}
                <Card className="mt-2 border-t border-gray-100">
                  <CardContent className="p-4">
                    <CommentList
                        comments={comments}
                        currentUserId={currentUserId}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />

                    {/* Поле ввода */}
                    <div className="mt-4 flex flex-col space-y-2">
                      {editCommentId && (
                          <div className="text-xs text-gray-500">
                            Редактируется комментарий
                            <button
                                className="ml-2 text-red-500 hover:underline"
                                onClick={() => {
                                  setEditCommentId(null);
                                  setComment("");
                                }}
                            >
                              Отменить
                            </button>
                          </div>
                      )}
                      <div className="flex items-center gap-2 w-full">
                        <input
                            type="text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Написать комментарий..."
                            className="flex-1 min-w-0 p-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                        <Button
                            size="sm"
                            onClick={handleSend}
                            className="bg-violet-600 hover:bg-violet-700 p-2.5 flex-shrink-0"
                            aria-label="Отправить комментарий"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end sm:justify-start mt-6">
                  <Button
                      variant="destructive"
                      className="w-full sm:w-auto flex justify-center items-center gap-2"
                      onClick={() => {
                        setRequestToDelete(selectedTaskDetails);
                        setShowDeleteRequestModal(true);
                      }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </Button>

                  <Button className="w-full sm:w-auto flex justify-center items-center gap-2 ml-2" variant="outline" onClick={() => {
                    setSelectedTaskDetails(null)
                    closeModal()
                    setComments([])
                  }}>
                    Закрыть
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
      )}

      {/* Map Modal */}
      {showMapModal && (
          <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => {setShowMapModal(false); closeModal(); }}
          >
            <Card
                className="w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle>Локация заявки</CardTitle>
                <CardDescription>Точное местоположение проблемы</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <React.Suspense fallback={
                  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                    Загрузка карты...
                  </div>
                }>
                  <MapView lat={mapLocation.lat} lon={mapLocation.lon} accuracy={mapLocation.accuracy} />
                </React.Suspense>
              </CardContent>
              <div className="p-4 flex justify-end border-t">
                <Button onClick={() => {setShowMapModal(false); closeModal(); }}>
                  Закрыть
                </Button>
              </div>
            </Card>
          </div>
      )}

      {/* Delete Request Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteRequestModal && !!requestToDelete}
        onClose={() => {
          setShowDeleteRequestModal(false);
          closeModal();
          setRequestToDelete(null);
          setDeleteReason("");
        }}
        onConfirm={confirmDeleteRequest}
        title={`Удалить заявку #${requestToDelete?.id}?`}
        description={`Вы уверены, что хотите удалить заявку "${requestToDelete?.title}"? Это действие необратимо.`}
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
        description={`Вы уверены, что хотите удалить пользователя ${userToDelete?.full_name} (${userToDelete?.email})? Это действие нельзя отменить.`}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteCategoryModal && !!categoryToDelete}
        onClose={() => {
          setShowDeleteCategoryModal(false);
          setCategoryToDelete(null);
        }}
        onConfirm={() => {
          if (categoryToDelete) {
            handleRemoveCategory(categoryToDelete.id);
            setCategoryToDelete(null);
            setShowDeleteCategoryModal(false);
          }
        }}
        title="Удалить категорию?"
        description={`Это действие нельзя отменить. Вы действительно хотите удалить категорию ${categoryToDelete?.name}?`}
      />

      <BottomNav
          onCreateRequest={handleOpenCreateRequest}
          activeTab="history"
          hidden={showCreateRequestModal || showMapModal || showDeleteRequestModal || showProfile || isModalOpen || !!selectedPhoto || !!selectedTaskDetails}
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
