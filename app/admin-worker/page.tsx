"use client"

import React, {useState, useRef, useEffect, useCallback} from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import RegistrationRequestsManager from "@/components/RegistrationRequestsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  User,
  Star,
  Plus,
  MapPin, Loader2, Calendar as CalendarLucid, Zap, MessageCircle,
  ChevronUp,
  ChevronDown,
  Hourglass,
  FileSpreadsheet,
} from "lucide-react"
import Header from "@/app/header/Header";
import api, { getOffices, getExecutorsByCategory, changeCategoryHead, createServiceCategory, deleteServiceCategory, assignExecutorToCategory, getAllExecutorsForAdmin } from "@/lib/api";
import {useRouter, useSearchParams} from "next/navigation";
import {useNotificationStore} from "@/stores/notificationStore";
import {useSuccessModal} from "@/hooks/use-success-modal";
import {SuccessModal} from "@/components/success-model";
import {BottomNav} from "@/components/BottomNav";
import {useMediaQuery} from "@/hooks/use-media-query";
import {useAcceptRequestModal} from "@/hooks/use-approve-modal";
import {useRejectRequestModal} from "@/hooks/use-reject-modal";
import {RejectRequestModal} from "@/components/RejectRequestModal";
import {AcceptRequestModal} from "@/components/AcceptRequestModal";
import {ProfileModal} from "@/components/ProfileModal";
import {NotificationsSidebar} from "@/components/notification/NotificationsSidebar";

import {sortRequests, useRequestStore} from "@/stores/useRequestStore";
import {Request, RequestGroup, SubRequest} from '@/stores/useRequestStore'
import PullToRefresh from "@/components/pull-to-refresh";
import Link from "next/link";
import {useStatsStore} from "@/stores/statsStore";
import {useAuthStore} from "@/stores/useAuthStore";
import {useCategoryStore} from "@/stores/useCategoryStore";
import { RoleBasedActionMenu } from "@/components/action-menu/RoleBasedActionMenu";
import { LogsViewer } from "@/components/logs-viewer";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { RequestCard } from "@/components/RequestCard";
import { RatingModal } from "@/components/RatingModal";
import { IconInfoModal } from "@/components/IconInfoModal";
import { MapModal } from "@/components/MapModal";
import {getSubRequestDisplayId} from "@/lib/subRequestUtils";
import { createClickableRequestIds } from '@/lib/notificationUtils';
import { RequestNotFoundModal } from '@/components/RequestNotFoundModal';
import { CreateRequestModal } from "@/components/CreateRequestModal";
import { CommentsModal } from "@/components/CommentsModal";
import {CompletedTaskReport} from "@/components/CompletedTaskReport";
import SubRequestInfo from "@/components/SubRequestInfo";
import Executors from "@/components/Executors";
import { RecurringTasksList, UpcomingTasksWidget } from "@/components/recurring-tasks";
import { ImportExcelModal } from "@/components/ImportExcelModal";
import { deleteRecurringTask } from "@/lib/api";
import PhotoModal from "@/components/photo/PhotoModal";

interface User {
  id: number;
  full_name: string;
  role: string;
}

interface Executor {
  id: number;
  specialty: string;
  department_id: number;
  user: User;
}
interface Rating {
  id: number;
  rating: number;
  request_id: number;
  created_at: string;
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

export default function AdminWorkerDashboard() {
  const {token, clearAuth, user} = useAuthStore()
  const {categories, fetchCategories, clearCategories, createSubcategory, deleteSubcategory} = useCategoryStore()
  const searchParams = useSearchParams()
  const successModal = useSuccessModal()
  const rejectModal = useRejectRequestModal()
  const approveModal = useAcceptRequestModal()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("incoming");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [notFoundRequestId, setNotFoundRequestId] = useState<string>('');
  const [showProfile, setShowProfile] = useState(false);

  // Debug: отслеживаем изменения selectedRequest
  useEffect(() => {
    console.log('ADMIN: selectedRequest changed:', selectedRequest);
  }, [selectedRequest]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [requestToRate, setRequestToRate] = useState<Request | null>(null);
  const [ratingComment, setRatingComment] = useState("");
  const { incomingRequests, setIncomingRequests, myRequests, setMyRequests, clearRequests } = useRequestStore();
  const [clientInfo, setClientInfo] = useState<Record<number, User>>({});
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, created_at?: string} | null>(null);

  const [expandedSubRequests, setExpandedSubRequests] = useState<Set<number>>(new Set());
  const [showComments, setShowComments] = useState<number | null>(null);
  const [showIconInfo, setShowIconInfo] = useState<{type: 'status' | 'longTerm', value: string} | null>(null);
  const [subRequestSettings, setSubRequestSettings] = useState<Record<number, {sla: string, complexity: string, category_id?: number}>>({});
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [editableRequestType, setEditableRequestType] = useState<string>('');
  const [editableLocationDetail, setEditableLocationDetail] = useState<string>("");
  const [editableSubRequestTitles, setEditableSubRequestTitles] = useState<{[key: number]: string}>({});
  const [editableSubRequestDescriptions, setEditableSubRequestDescriptions] = useState<{[key: number]: string}>({});
  const [editableSubRequestComplexity, setEditableSubRequestComplexity] = useState<{[key: number]: string}>({});
  const [editableSubRequestSla, setEditableSubRequestSla] = useState<{[key: number]: string}>({});
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isUpdatingRequest, setIsUpdatingRequest] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  // Инициализация состояний редактирования при выборе заявки
  useEffect(() => {
    if (selectedRequest) {
      setEditableRequestType(selectedRequest.request_type);
      setEditableLocationDetail(selectedRequest.location_detail || "");
      setEditingCategoryId(null);
      setSubRequestSettings({});
      setFormErrors(null);
      setIsEditingMode(false);
      setIsEditingLocation(false);
      
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

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true)
  const { notifications, setNotifications, setNotificationLoading, clearNotifications } = useNotificationStore()
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [filterMyStatus, setFilterMyStatus] = useState("all")
  const [filterMyType, setFilterMyType] = useState("all")
  const [filterIncomingStatus, setFilterIncomingStatus] = useState("all")
  const [filterIncomingType, setFilterIncomingType] = useState("all")
  const prevFilterStatus = useRef("all")
  const isInitialized = useRef(false)
  const [stats, setStats] = useState<Stats | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observer = useRef<IntersectionObserver | null>(null);

  // Состояния для перенаправления заявок
  const [selectedRequestForRedirect, setSelectedRequestForRedirect] = useState<any>(null);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Состояния для назначения исполнителей
  const [selectedSubRequestForAssignment, setSelectedSubRequestForAssignment] = useState<any>(null);
  const [showAssignExecutorsModal, setShowAssignExecutorsModal] = useState(false);
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [upcomingTasksRefreshTrigger, setUpcomingTasksRefreshTrigger] = useState(0);
  const [availableExecutors, setAvailableExecutors] = useState<Executor[]>([]);
  const [selectedExecutorId, setSelectedExecutorId] = useState<number | null>(null);
  const [isChangingHead, setIsChangingHead] = useState(false);
  const [isLoadingExecutors, setIsLoadingExecutors] = useState(false);
  const [changeHeadError, setChangeHeadError] = useState<string | null>(null);
  
  // Состояния для управления категориями
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoriesWithExecutors, setCategoriesWithExecutors] = useState<Set<number>>(new Set());
  
  // Состояния для управления подкатегориями
  const [selectedCategoryForSubcategory, setSelectedCategoryForSubcategory] = useState<number | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<number | null>(null);
  const [isDeletingSubcategory, setIsDeletingSubcategory] = useState(false);
  const [subcategoryError, setSubcategoryError] = useState<string | null>(null);
  
  // Состояния для смены паролей
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [officeUsers, setOfficeUsers] = useState<any[]>([]);
  
  // Состояние для выбранного раздела управления
  const [selectedManagementSection, setSelectedManagementSection] = useState<string>("categories");
  
  // Состояния для управления исполнителями
  const [selectedExecutorForAssignment, setSelectedExecutorForAssignment] = useState<number | null>(null);
  const [isAssigningExecutor, setIsAssigningExecutor] = useState(false);
  const [executorManagementError, setExecutorManagementError] = useState<string | null>(null);
  const [allExecutors, setAllExecutors] = useState<Executor[]>([]);
  const [isLoadingAllExecutors, setIsLoadingAllExecutors] = useState(false);

  // Состояния для оценки клиента
  const [showClientRatingModal, setShowClientRatingModal] = useState(false);
  const [clientRatingValue, setClientRatingValue] = useState(0);
  const [clientRatingComment, setClientRatingComment] = useState("");
  const [requestGroupToRate, setRequestGroupToRate] = useState<any>(null);
  const [clientRatings, setClientRatings] = useState<Record<number, any>>({});

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [modalStack, setModalStack] = useState<string[]>([]);
  const [isClosingProgrammatically, setIsClosingProgrammatically] = useState(false);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const [offices, setOffices] = useState<any[]>([]);

  // Debug: отслеживаем изменения modalStack
  useEffect(() => {
    console.log('ADMIN: modalStack changed:', modalStack);
  }, [modalStack]);

  const lastRequestRef = useCallback((node: HTMLDivElement) => {
    lastElementRef.current = node;
  }, []);

  useEffect(() => {
    if (loading) return;

    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage((prevPage) => {
          const nextPage = prevPage + 1;
          fetchRequests(nextPage);
          return nextPage;
        });
      }
    });

    if (lastElementRef.current) {
      observer.current.observe(lastElementRef.current);
    }
  }, [loading, hasMore]);

  const openModal = (name: string) => {
    console.log('ADMIN: openModal called with name:', name);
    console.log('ADMIN: Current modalStack:', modalStack);
    setModalStack(prev => {
      const newStack = [...prev, name];
      console.log('ADMIN: New modalStack:', newStack);
      return newStack;
    });
    window.history.pushState({ modal: name }, '', window.location.pathname);
    console.log('ADMIN: openModal finished');
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

    if (!user || user.role !== "admin-worker") {
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
          case 'clientRatingModal':
            setShowClientRatingModal(false);
            setClientRatingValue(0);
            setClientRatingComment("");
            setRequestGroupToRate(null);
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

          case 'deleteRequestModal':
            setShowDeleteRequestModal(false);
            break;
          case 'recurringTaskDetails':
            // Закрытие модального окна повторяющихся задач обрабатывается в RecurringTasksList
            break;
          case 'taskHistory':
            // Закрытие модального окна истории задач обрабатывается в RecurringTasksList
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

  // Сохраняем requestId в state при первой загрузке
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [pendingSubRequestId, setPendingSubRequestId] = useState<string | null>(null);

  // Обработка query параметров для открытия заявки
  useEffect(() => {
    console.log('=== ADMIN: QUERY PARAMS EFFECT START ===');
    console.log('ADMIN: Full URL:', window.location.href);
    console.log('ADMIN: searchParams.toString():', searchParams.toString());
    console.log('ADMIN: window.location.search:', window.location.search);
    console.log('ADMIN: window.location.pathname:', window.location.pathname);
    
    // Сначала пробуем получить из URL напрямую
    const urlParams = new URLSearchParams(window.location.search);
    const requestIdFromUrl = urlParams.get("requestId");
    const subRequestIdFromUrl = urlParams.get("subRequestId");
    
    // Если в URL нет, пробуем из searchParams
    const requestId = requestIdFromUrl || searchParams.get("requestId");
    const subRequestId = subRequestIdFromUrl || searchParams.get("subRequestId");
    
    console.log('ADMIN: requestId from URL:', requestIdFromUrl);
    console.log('ADMIN: subRequestId from URL:', subRequestIdFromUrl);
    console.log('ADMIN: requestId from searchParams:', searchParams.get("requestId"));
    console.log('ADMIN: subRequestId from searchParams:', searchParams.get("subRequestId"));
    console.log('ADMIN: requestId (final):', requestId);
    console.log('ADMIN: subRequestId (final):', subRequestId);
    console.log('ADMIN: pendingRequestId:', pendingRequestId);
    console.log('ADMIN: selectedRequest:', selectedRequest);
    console.log('ADMIN: incomingRequests.length:', incomingRequests.length);
    console.log('ADMIN: myRequests.length:', myRequests.length);
    console.log('ADMIN: loading:', loading);

    // Сохраняем requestId в state, если он есть и еще не сохранен
    if (requestId && !pendingRequestId) {
      console.log('ADMIN: Saving requestId to state:', requestId);
      setPendingRequestId(requestId);
      if (subRequestId) {
        setPendingSubRequestId(subRequestId);
      }
    }

    // Ждем, пока заявки загрузятся
    if (loading) {
      console.log('ADMIN: Still loading, waiting...');
      return;
    }

    // Проверяем, что заявки загружены
    if (incomingRequests.length === 0 && myRequests.length === 0) {
      console.log('ADMIN: No requests loaded yet');
      return;
    }

    // Используем сохраненный requestId вместо текущего из URL
    const idToUse = pendingRequestId || requestId;
    const subIdToUse = pendingSubRequestId || subRequestId;
    
    console.log('ADMIN: idToUse:', idToUse);
    console.log('ADMIN: subIdToUse:', subIdToUse);

    if (idToUse && !selectedRequest) {
      console.log('ADMIN: Looking for request with ID:', idToUse);
      
      // Объединяем все списки заявок
      const allRequests = [...incomingRequests, ...myRequests];
      console.log('ADMIN: allRequests.length:', allRequests.length);
      console.log('ADMIN: allRequests IDs:', allRequests.map(r => r.id));
      
      const foundRequest = allRequests.find(r => r.id === parseInt(idToUse));
      console.log('ADMIN: foundRequest:', foundRequest);
      
      if (foundRequest) {
        console.log('ADMIN: Request found! Opening modal...');
        
        // Если указан subRequestId, фильтруем подзаявки
        if (subIdToUse) {
          const subRequest = foundRequest.requests.find((req: SubRequest) => req.id === parseInt(subIdToUse));
          console.log('ADMIN: subRequest:', subRequest);
          
          if (subRequest) {
            console.log('ADMIN: SubRequest found, setting selected request...');
            setSelectedRequest(foundRequest);
            setExpandedSubRequests(new Set([subRequest.id]));
            console.log('ADMIN: Calling openModal...');
            openModal('requestDetails');
            console.log('ADMIN: openModal called');
            // Очищаем pending requestId
            setPendingRequestId(null);
            setPendingSubRequestId(null);
          } else {
            // Подзаявка не найдена
            console.log('ADMIN: SubRequest not found');
            setNotFoundRequestId(`${idToUse}/${subIdToUse}`);
            setShowNotFoundModal(true);
            setPendingRequestId(null);
            setPendingSubRequestId(null);
          }
        } else {
          // Открываем всю группу заявок
          console.log('ADMIN: Opening modal without subRequest, setting selected request...');
          setSelectedRequest(foundRequest);
          console.log('ADMIN: Calling openModal...');
          openModal('requestDetails');
          console.log('ADMIN: openModal called');
          // Очищаем pending requestId
          setPendingRequestId(null);
          setPendingSubRequestId(null);
        }
        
        // Очищаем query параметры из URL
        console.log('ADMIN: Clearing query params from URL');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (idToUse) {
        // Заявка не найдена
        console.log('ADMIN: Request not found in all requests');
        setNotFoundRequestId(idToUse);
        setShowNotFoundModal(true);
        setPendingRequestId(null);
        setPendingSubRequestId(null);
        // Очищаем query параметры из URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else if (!idToUse) {
      console.log('ADMIN: No requestId found');
    } else if (selectedRequest) {
      console.log('ADMIN: selectedRequest already exists, skipping');
    }
    
    console.log('=== ADMIN: QUERY PARAMS EFFECT END ===');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, incomingRequests, myRequests, selectedRequest, loading, pendingRequestId, pendingSubRequestId, openModal]);

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
    if (modalName !== 'deleteRequestModal') {
      setShowDeleteRequestModal(false);
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
        if (modalName !== 'clientRatingModal') {
          setShowClientRatingModal(false);
          setClientRatingValue(0);
          setClientRatingComment("");
          setRequestGroupToRate(null);
        }


    setModalStack([modalName]);
    // Используем pushState вместо replaceState для правильной работы истории
    window.history.pushState({ modal: modalName }, '', window.location.pathname);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/analytics/stats/admin-worker");
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (!stats) {
      fetchStats()
    }
    fetchOffices()
    loadAllExecutors()
  }, []);

  // Инициализация данных при первом рендере
  useEffect(() => {
    if (isLoggedIn && !isInitialized.current) {
      console.log('=== INITIAL LOAD ===');
      console.log('Loading initial data without filter');
      fetchRequests(1);
      isInitialized.current = true;
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (categories.length > 0) {
      checkCategoriesWithExecutors();
    }
  }, [categories]);

  // Загружаем пользователей офиса при изменении office_id
  useEffect(() => {
    if (user?.office_id && token) {
      loadOfficeUsers();
    }
  }, [user?.office_id, token]);

  const filteredMyRequests = sortRequests(
      myRequests.filter((request) => {
        let statusMatch = false;
        
        if (filterMyStatus === "all") {
          statusMatch = true;
        } else if (filterMyStatus === "long_term") {
          statusMatch = request.requests.some(req => req.is_long_term && request.request_type !== 'recurring');
        } else if (filterMyStatus === "overdue") {
          // Для просроченных заявок показываем все, так как фильтрация уже выполнена на бэкенде
          statusMatch = true;
        } else {
          statusMatch = request.status === filterMyStatus;
        }
        
        const requestType = request.request_type;
        const typeMatch = filterMyType === "all" || requestType === filterMyType;
        return statusMatch && typeMatch;
      })
  );

  const filteredIncomingRequests = sortRequests(
      incomingRequests.filter((request) => {
        let statusMatch = false;
        
        if (filterIncomingStatus === "all") {
          statusMatch = true;
        } else if (filterIncomingStatus === "long_term") {
          statusMatch = request.requests.some(req => req.is_long_term && request.request_type !== 'recurring');
        } else if (filterIncomingStatus === "overdue") {
          // Для просроченных заявок показываем все, так как фильтрация уже выполнена на бэкенде
          statusMatch = true;
        } else {
          statusMatch = request.status === filterIncomingStatus;
        }
        
        const requestType = request.request_type;
        const typeMatch = filterIncomingType === "all" || requestType === filterIncomingType;
        
        return statusMatch && typeMatch;
      })
  );

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

    // Обработка параметра status из URL
    if (status) {
      console.log('=== URL STATUS ===');
      console.log('Setting filterIncomingStatus to:', status);
      // Маппинг статусов: in_progress -> in_progress, execution -> execution, completed -> completed
      setFilterIncomingStatus(status);
    }

    // Обработка параметра priority из URL
    if (priority) {
      console.log('=== URL PRIORITY ===');
      console.log('Setting filterIncomingType to:', priority);
      // Маппинг приоритетов: normal -> normal, urgent -> urgent, planned -> planned
      setFilterIncomingType(priority);
    }
  }, [searchParams])

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

  // Перезагружаем данные при изменении фильтра статуса
  useEffect(() => {
    console.log('=== STATUS EFFECT ===');
    console.log('isLoggedIn:', isLoggedIn);
    console.log('filterIncomingStatus:', filterIncomingStatus);
    console.log('prevFilterStatus:', prevFilterStatus.current);
    
    if (isLoggedIn && filterIncomingStatus !== prevFilterStatus.current) {
      console.log('Filter status changed, fetching requests');
      prevFilterStatus.current = filterIncomingStatus;
      fetchRequests(1); // Сбрасываем на первую страницу при изменении фильтра
      isInitialized.current = true;
    }
  }, [filterIncomingStatus, isLoggedIn]);

  // Перезагружаем данные при изменении фильтра типа
  useEffect(() => {
    if (isLoggedIn && filterIncomingType !== "all" && isInitialized.current) {
      setPage(1);
      setHasMore(true);
      setIncomingRequests([]);
      setMyRequests([]);
      // Не вызываем fetchRequests здесь - это сделает useEffect для фильтров
    }
  }, [filterIncomingType, isLoggedIn]);

  const fetchOffices = async () => {
    try {
      const res = await getOffices();
      setOffices(res.data);
    } catch (error) {
      console.error('Ошибка при загрузке офисов:', error);
    }
  }

  const loadExecutorsForCategory = async (categoryId: number) => {
    setIsLoadingExecutors(true);
    setChangeHeadError(null);
    try {
      const response = await getExecutorsByCategory(categoryId);
      // Фильтруем только исполнителей (исключаем текущего руководителя)
      const executors = response.data.filter((executor: Executor) => executor.user.role === 'executor');
      setAvailableExecutors(executors);
    } catch (error: any) {
      console.error("Ошибка при загрузке исполнителей:", error);
      setChangeHeadError("Не удалось загрузить исполнителей");
      setAvailableExecutors([]);
    } finally {
      setIsLoadingExecutors(false);
    }
  }

  const handleChangeCategoryHead = async () => {
    if (!selectedCategoryId || !selectedExecutorId) return;

    setIsChangingHead(true);
    setChangeHeadError(null);

    try {
      const response = await changeCategoryHead(selectedCategoryId, selectedExecutorId);
      
      // Формируем сообщение с информацией об обработанных задачах
      let message = `Новый руководитель: ${response.data.newHead.name}`;
      if (response.data.processedTasks && response.data.processedTasks.count > 0) {
        message += `\n\n${response.data.processedTasks.message}`;
      }
      
      successModal.showSuccess({
        title: "Руководитель изменен",
        message: message,
      });

      // Сбросить выбор
      setSelectedCategoryId(null);
      setSelectedExecutorId(null);
      setAvailableExecutors([]);
      
      // Обновить данные
      fetchRequests();
      fetchCategories(token!);
    } catch (error: any) {
      console.error("Ошибка при смене руководителя:", error);
      setChangeHeadError(error.response?.data?.message || "Не удалось сменить руководителя");
    } finally {
      setIsChangingHead(false);
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
      await deleteServiceCategory(categoryToDelete);
      
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

  // Функции для управления подкатегориями
  const handleCreateSubcategory = async () => {
    if (!selectedCategoryForSubcategory || !newSubcategoryName.trim()) return;

    setIsCreatingSubcategory(true);
    setSubcategoryError(null);

    try {
      await createSubcategory(token!, {
        name: newSubcategoryName.trim(),
        category_id: selectedCategoryForSubcategory
      });
      
      successModal.showSuccess({
        title: "Подкатегория создана",
        message: `Подкатегория "${newSubcategoryName}" успешно создана`
      });

      setSelectedCategoryForSubcategory(null);
      setNewSubcategoryName("");
      fetchCategories(token!);
    } catch (error: any) {
      console.error("Ошибка при создании подкатегории:", error);
      setSubcategoryError(error.response?.data?.message || "Ошибка при создании подкатегории");
    } finally {
      setIsCreatingSubcategory(false);
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!subcategoryToDelete) return;

    setIsDeletingSubcategory(true);
    setSubcategoryError(null);

    try {
      await deleteSubcategory(token!, subcategoryToDelete);
      
      successModal.showSuccess({
        title: "Подкатегория удалена",
        message: "Подкатегория успешно удалена"
      });

      setSubcategoryToDelete(null);
      fetchCategories(token!);
    } catch (error: any) {
      console.error("Ошибка при удалении подкатегории:", error);
      setSubcategoryError(error.response?.data?.message || "Ошибка при удалении подкатегории");
    } finally {
      setIsDeletingSubcategory(false);
    }
  };

  // Функции для смены паролей
  const loadOfficeUsers = async () => {
    try {
      if (!user?.office_id) {
        setPasswordError("Office ID не определен");
        return;
      }

      const response = await fetch(`https://kcell-service.onrender.com/api/users/office/${user.office_id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Ошибка при загрузке пользователей: ${response.status}`);
      }

      const data = await response.json();
      setOfficeUsers(data);
    } catch (error: any) {
      console.error("Ошибка при загрузке пользователей:", error);
      setPasswordError(`Не удалось загрузить пользователей офиса: ${error.message}`);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUserForPassword || !newPassword.trim()) return;

    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Пароль должен содержать минимум 6 символов");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);

    try {
      const response = await fetch(`https://kcell-service.onrender.com/api/users/${selectedUserForPassword}/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при смене пароля");
      }

      successModal.showSuccess({
        title: "Пароль изменен",
        message: "Пароль пользователя успешно изменен"
      });

      setSelectedUserForPassword(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Ошибка при смене пароля:", error);
      setPasswordError(error.message || "Ошибка при смене пароля");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Функции для управления исполнителями
  const loadAllExecutors = async () => {
    setIsLoadingAllExecutors(true);
    setExecutorManagementError(null);
    
    try {
      const response = await getAllExecutorsForAdmin();
      setAllExecutors(response.data);
    } catch (error: any) {
      console.error("Ошибка при загрузке исполнителей:", error);
      setExecutorManagementError("Не удалось загрузить исполнителей");
    } finally {
      setIsLoadingAllExecutors(false);
    }
  }

  const handleAssignExecutorToCategory = async () => {
    if (!selectedCategoryId || !selectedExecutorForAssignment) return;

    setIsAssigningExecutor(true);
    setExecutorManagementError(null);

    try {
      const response = await assignExecutorToCategory(selectedCategoryId, selectedExecutorForAssignment);
      
      if (response.data.isNewHead) {
        successModal.showSuccess({
          title: "Исполнитель назначен и стал руководителем",
          message: `Исполнитель ${response.data.executor.name} успешно назначен к категории "${response.data.category.name}" и автоматически стал руководителем этой категории`
        });
      } else {
        successModal.showSuccess({
          title: "Исполнитель назначен",
          message: `Исполнитель ${response.data.executor.name} успешно назначен к категории "${response.data.category.name}"`
        });
      }

      setSelectedExecutorForAssignment(null);
      loadAllExecutors();
      if (selectedCategoryId) {
        loadExecutorsForCategory(selectedCategoryId);
      }
      checkCategoriesWithExecutors();
    } catch (error: any) {
      console.error("Ошибка при назначении исполнителя:", error);
      setExecutorManagementError(error.response?.data?.message || "Ошибка при назначении исполнителя");
    } finally {
      setIsAssigningExecutor(false);
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

  const fetchRequests = useCallback(async (currentPage = 1, pageSize = 10) => {
    if (loading && currentPage !== 1) return;
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

      const response = await api.get<{
        otherRequests: Request[];
        myRequests: Request[];
      }>(`/request-groups?${params.toString()}`);
      
      console.log('=== FETCH REQUESTS ===');
      console.log('Filter status:', filterIncomingStatus);
      console.log('Filter type:', filterIncomingType);
      console.log('Current page:', currentPage);
      console.log('API URL:', `/request-groups?${params.toString()}`);
      console.log('API Response:', response.data);
      console.log('Incoming requests count:', response.data.otherRequests.length);
      console.log('My requests count:', response.data.myRequests.length);
      
      const sortedNewIncomingRequests = sortRequests(response.data.otherRequests);
      const sortedNewMyRequests = sortRequests(response.data.myRequests);

      setIncomingRequests((prev) => {
        const sortedNewItems = sortRequests(sortedNewIncomingRequests);
        const newIncomingRequests = currentPage === 1
            ? sortedNewItems
            : [...prev, ...sortedNewItems.filter(item => !prev.some(p => p.id === item.id))];
        console.log('Setting incomingRequests:', newIncomingRequests.length, 'items');
        console.log('Previous incomingRequests:', prev.length, 'items');
        return newIncomingRequests;
      });
      setMyRequests((prev) => {
        const sortedNewItems = sortRequests(sortedNewMyRequests);
        return currentPage === 1
            ? sortedNewItems
            : [...prev, ...sortedNewItems.filter(item => !prev.some(p => p.id === item.id))];
      });

      const allRequests = [
        ...(response.data.otherRequests || []),
        ...(response.data.myRequests || [])
      ];

      await Promise.all(
          allRequests
              .filter((r) => r.status === "completed")
              .map((r) => {
                r.requests.forEach((subRequest) => {
                  if (subRequest.status === "completed") {
                    checkUserRating(subRequest.id)
                  }
                })
              })
      );

      // Обрабатываем рейтинги клиентов из ответа API
      const processClientRatings = (requestGroups: any[]) => {
        setClientRatings(prevRatings => {
          const newRatings = { ...prevRatings };
          
          requestGroups.forEach((requestGroup: any) => {
            if (requestGroup.clientRatings && requestGroup.clientRatings.length > 0) {
              const rating = requestGroup.clientRatings[0]; // Берем первый рейтинг
              newRatings[requestGroup.id] = {
                id: rating.id,
                rating: rating.rating,
                comment: rating.comment,
                request_group_id: requestGroup.id,
                created_at: rating.created_at,
                ratedClient: rating.ratedClient
              };
            }
          });
          
          return newRatings;
        });
      };

      // Обрабатываем рейтинги клиентов для всех групп заявок
      processClientRatings(allRequests);

      // Обновляем флаг hasMore
      setHasMore(
          (response.data.otherRequests?.length || 0) +
          (response.data.myRequests?.length || 0) >= pageSize
      );

    } catch (error) {
      console.error("Ошибка при загрузке заявок:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, filterIncomingStatus, filterIncomingType]);



  const handleDeleteRequest = async (request: Request) => {
    try {
      await api.delete(`/request-groups/${request.id}`)
      fetchRequests()
      successModal.showSuccess({
        title: "Заявка удалена",
        message: "Заявка была успешно удалена."
      })
    } catch (error) {
      console.error("Failed to delete request:", error)
      successModal.showSuccess({
        title: "Ошибка",
        message: "Не удалось удалить заявку."
      })
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

        setMyRequests(updateLocalState);
        setIncomingRequests(updateLocalState);

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

  useEffect(() => {
    // Сбрасываем состояние при изменении фильтров (кроме filterIncomingStatus, который обрабатывается отдельно)
    // Не срабатываем при инициализации, только при реальном изменении фильтров
    if (isInitialized.current && (filterMyStatus !== "all" || filterMyType !== "all" || filterIncomingType !== "all")) {
      setPage(1);
      setHasMore(true);
      setIncomingRequests([]);
      setMyRequests([]);
      fetchRequests();
    }
  }, [filterMyStatus, filterMyType, filterIncomingType]);



  const fetchClientInfo = async (userId: number) => {
    if (clientInfo[userId]) return; // Уже загружено

    try {
      const response = await api.get(`/users/${userId}`);
      setClientInfo(prev => ({
        ...prev,
        [userId]: response.data
      }));
    } catch (error) {
      console.error("Failed to fetch client info:", error);
    }
  };

  useEffect(() => {
    if (selectedRequest?.client_id) {
      fetchClientInfo(selectedRequest.client_id);
    }
  }, [selectedRequest]);

  // Инициализация редактируемого типа заявки при открытии модалки
  useEffect(() => {
    if (selectedRequest) {
      setEditableRequestType(selectedRequest.request_type);
    }
  }, [selectedRequest]);

  const handleCreateNewRequest = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors(null);

    try {
      // Проверяем, является ли это повторяющейся задачей
      const requestType = formData.get('request_type');
      const isRecurring = requestType === 'recurring';
      console.log('Admin worker - request_type:', requestType, 'isRecurring:', isRecurring);
      

      
      let response;
      if (isRecurring) {
        // Создаем повторяющуюся задачу
        const recurringData = {
          location: formData.get('location'),
          location_detail: formData.get('location_detail'),
          recurrence_type: formData.get('recurrence_type'),
          recurrence_interval: parseInt(formData.get('recurrence_interval') as string),
          start_date: formData.get('start_date'),
          category_id: 1, // Используем первую категорию для admin-worker
        };
        
        response = await api.post('/recurring-tasks', recurringData);
        
        // Добавляем новую повторяющуюся задачу в список
        const newRecurringTask = response.data;
        setMyRequests(prev => [newRecurringTask, ...prev]);
        
        successModal.showSuccess({
          title: "Повторяющаяся задача создана!",
          message: "Задача будет автоматически создавать экземпляры согласно расписанию."
        });
      } else {
        // Создаем обычную заявку
        response = await api.post('/request-groups', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const newRequestGroup = response.data;
        setMyRequests(prev => [newRequestGroup, ...prev]);
        
        successModal.showSuccess({
          title: "Заявка создана!",
          message: "Заявка отправлена на назначение исполнителей."
        });
      }

      // Сброс формы
      resetForm();
    } catch (error: any) {
      console.error("Ошибка при создании:", error);
      setFormErrors(
          error.response?.data?.error || "Не удалось создать. Повторите попытку."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowCreateRequestModal(false);
    closeModalWithHistory();
    setExpandedSubRequests(new Set());
  };

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

  const handleAcceptRequestGroup = async () => {
    try {
      setIsSubmitting(true);
      
      // Проверяем, что все под заявки имеют время выполнения и complexity (кроме плановых)
      if (editableRequestType !== 'planned') {
        const allSubRequestsHaveSettings = selectedRequest?.requests.every((subReq: SubRequest) => {
          const settings = subRequestSettings[subReq.id];
          return settings && settings.sla && settings.complexity;
        });

        if (!allSubRequestsHaveSettings) {
          setFormErrors("Пожалуйста, укажите время выполнения и сложность для всех под заявок");
          return;
        }
      }

      // Подготавливаем данные для отправки
      const sub_requests = selectedRequest.requests.map((subReq: SubRequest) => {
        const settings = subRequestSettings[subReq.id];
        const result = {
          id: subReq.id,
          sla: editableRequestType === 'planned' ? null : settings?.sla,
          complexity: editableRequestType === 'planned' ? null : settings?.complexity,
          category_id: settings?.category_id || subReq.category_id
        };
        
        // Отладочная информация
        console.log(`SubRequest ${subReq.id}:`, {
          original_category_id: subReq.category_id,
          settings_category_id: settings?.category_id,
          final_category_id: result.category_id,
          settings: settings
        });
        
        return result;
      });

      // Отправляем запрос на принятие группы заявок
      const requestData = {
        patch_code: 1,
        sub_requests: sub_requests,
        request_type: editableRequestType,
        location_detail: editableLocationDetail
      };
      
      console.log('Отправляем данные на сервер:', requestData);
      
      await api.patch(`/request-groups/${selectedRequest.id}`, requestData);

      successModal.showSuccess({
        title: "Заявка принята в работу",
        message: "Все под заявки успешно приняты"
      });
      setSelectedRequest(null);
      closeModalWithHistory();
      setEditableRequestType('');
      setEditingCategoryId(null);
      setSubRequestSettings({});
      fetchRequests();
    } catch (error) {
      console.error("Ошибка при принятии заявки:", error);
      setFormErrors("Ошибка при принятии заявки");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRequestGroup = async () => {
    try {
      if (!rejectionReason.trim()) {
        setFormErrors("Пожалуйста, укажите причину отклонения");
      return;
    }

    setIsSubmitting(true);

      // Отправляем запрос на отклонение группы заявок
      await api.patch(`/request-groups/${selectedRequest.id}`, {
        patch_code: 2,
        rejection_reason: rejectionReason
      });

      successModal.showSuccess({
        title: "Заявка отклонена",
        message: "Группа заявок успешно отклонена"
      });
      setSelectedRequest(null);
      setRejectionReason("");
      setEditableRequestType('');
      setEditingCategoryId(null);
      setSubRequestSettings({});
      closeModalWithHistory();
      fetchRequests();
    } catch (error) {
      console.error("Ошибка при отклонении заявки:", error);
      setFormErrors("Ошибка при отклонении заявки");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Функция для сохранения только локации
  const handleSaveLocation = async () => {
    try {
      if (editableLocationDetail === selectedRequest?.location_detail) {
        setIsEditingLocation(false);
        return;
      }

      await api.patch(`/request-groups/${selectedRequest.id}`, {
        location_detail: editableLocationDetail
      });

      successModal.showSuccess({
        title: "Локация обновлена",
        message: "Расположение в офисе успешно обновлено"
      });

      // Обновляем локальное состояние
      setSelectedRequest({
        ...selectedRequest,
        location_detail: editableLocationDetail
      });

      setIsEditingLocation(false);
    } catch (error: any) {
      console.error("Ошибка при обновлении локации:", error);
      setFormErrors(error.response?.data?.message || "Ошибка при обновлении локации");
    }
  };

  const handleSaveTimeSettings = async (subRequest: SubRequest) => {
    try {
      const settings = subRequestSettings[subRequest.id];
      const hasLocationChanges = editableLocationDetail && editableLocationDetail !== selectedRequest?.location_detail;
      
      if (!settings || !settings.sla || !settings.complexity) {
        if (!hasLocationChanges) {
          setFormErrors("Для сохранения необходимо заполнить оба поля: время выполнения и сложность");
          return;
        }
      }

      // Подготавливаем данные для обновления
      const updateData: any = {
        patch_code: 3
      };

      // Добавляем настройки подзаявки если они есть
      if (settings && settings.sla && settings.complexity) {
        updateData.sla = settings.sla;
        updateData.complexity = settings.complexity;
      }

      // Добавляем локацию в офисе если она изменилась
      if (hasLocationChanges) {
        updateData.location_detail = editableLocationDetail;
      }

      await api.patch(`/requests/${subRequest.id}`, updateData);

      successModal.showSuccess({
        title: "Настройки обновлены",
        message: "Время выполнения, сложность и локация успешно обновлены"
      });

      // Обновляем данные в selectedRequest
      if (selectedRequest) {
        const updatedRequests = selectedRequest.requests.map((req: any) => 
          req.id === subRequest.id 
            ? { ...req, sla: settings.sla, complexity: settings.complexity }
            : req
        );
        setSelectedRequest({
          ...selectedRequest,
          requests: updatedRequests,
          location_detail: editableLocationDetail || selectedRequest.location_detail
        });
      }

      // Очищаем настройки для этой подзаявки
      setSubRequestSettings(prev => {
        const newSettings = { ...prev };
        delete newSettings[subRequest.id];
        return newSettings;
      });

      fetchRequests();
    } catch (error) {
      console.error("Ошибка при сохранении настроек:", error);
      setFormErrors("Ошибка при сохранении настроек");
    }
  };

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
        const updatedStoreMyRequests = currentMyRequests.map((req: any) =>
            req.id === selectedRequest.id ? updatedRequestGroup : req
        ).filter((req: any) => req.requests.length > 0)
        const currentIncomingRequests = useRequestStore.getState().incomingRequests
        const updatedStoreIncomingRequests = currentIncomingRequests.map((req: any) =>
            req.id === selectedRequest.id ? updatedRequestGroup : req
        ).filter((req: any) => req.requests.length > 0)
        useRequestStore.getState().setMyRequests(updatedStoreMyRequests)
        useRequestStore.getState().setIncomingRequests(updatedStoreIncomingRequests)

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

  const handleRateClient = async () => {
    if (requestGroupToRate && clientRatingValue > 0) {
      try {
        // Оптимистичное обновление - сразу обновляем UI
        setClientRatings(prev => ({
          ...prev,
          [requestGroupToRate.id]: {
            id: 0, // временный ID
            rating: clientRatingValue,
            comment: clientRatingComment,
            request_group_id: requestGroupToRate.id,
            created_at: new Date().toISOString()
          }
        }));

        // Проверяем, существует ли уже рейтинг для этой группы заявок
        const existingRating = clientRatings[requestGroupToRate.id];
        const isUpdate = !!existingRating;
        
        // Отправляем запрос на сервер (POST для создания, PUT для обновления)
        const response = await api[isUpdate ? 'put' : 'post'](`/client-ratings`, {
          rating: clientRatingValue,
          request_group_id: requestGroupToRate.id,
          comment: clientRatingComment
        })

        setShowClientRatingModal(false);
        closeModalWithHistory();
        setClientRatingValue(0);
        setClientRatingComment("");
        setRequestGroupToRate(null);
        
        successModal.showSuccess({
          title: "Оценка отправлена",
          message: "Оценка клиента была успешно отправлена."
        });
      } catch (error) {
        // В случае ошибки откатываем изменения
        setClientRatings(prev => {
          const newRatings = { ...prev };
          delete newRatings[requestGroupToRate.id];
          return newRatings;
        });

        rejectModal.showReject({
          title: "Ошибка",
          message: "Не удалось отправить оценку клиента"
        });
        console.error("Failed to rate client:", error);
        setShowClientRatingModal(false);
        closeModalWithHistory();
        setClientRatingValue(0);
        setClientRatingComment("");
        setRequestGroupToRate(null);
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
      console.error("Logout failed:", error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "urgent":
        return "bg-red-500";
      case "normal":
        return "bg-blue-500";
      case "planned":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case "draft": return "Черновик";
      case "in_progress": return "В обработке у Администратора";
      case "execution": return "Исполнение";
      case "completed": return "Завершено";
      case "rejected": return "Отклонено";
      case "awaiting_assignment": return "Ожидает назначения Исполнителя";
      case "assigned": return "Назначено";
              case "awaiting_sla": return "Ожидание времени выполнения";
      default: return status;
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

  const translateComplexity = (complexity: string) => {
    switch (complexity) {
      case "complex": return "комплексный";
      case "simple": return "простой";
      case "medium": return "средний";
      default: return complexity;
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < rating ? "fill-purple-400 text-purple-400" : "text-gray-300"}`} />
    ))
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

  const handleDeleteRecurringTask = async (taskId: number) => {
    try {
      await deleteRecurringTask(taskId);
      
      // Обновляем виджет предстоящих задач
      setUpcomingTasksRefreshTrigger(prev => prev + 1);

      successModal.showSuccess({
        title: "Повторяющаяся задача удалена",
        message: "Повторяющаяся задача была успешно удалена."
      });
    } catch (error: any) {
      console.error("Ошибка при удалении повторяющейся задачи:", error);
      successModal.showSuccess({
        title: "Ошибка",
        message: error.response?.data?.error || "Не удалось удалить повторяющуюся задачу"
      });
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
      await api.patch(`/requests/${selectedRequestForRedirect.id}`, {
        status: "awaiting_assignment",
        executor_id: null,
        actual_completion_date: null,
        category_id: selectedCategoryId,
        patch_code: 1
      });

      fetchRequests();
      successModal.showSuccess({
        title: "Заявка перенаправлена",
        message: `Заявка успешно перенаправлена руководителям категории "${categories.find(c => c.id === selectedCategoryId)?.name}"`
      });

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
    fetchRequests();
    successModal.showSuccess({
      title: "Исполнители назначены",
      message: "Исполнители успешно назначены на заявку"
    });
  };

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
              requestGroup={requestGroup}
              isDesktop={isDesktop}
              userRole="admin-worker"
              isSubRequest={false}
              onViewDetails={(request) => {
                setSelectedRequest(request);
                openModal('requestDetails');
              }}
              onRateRequest={(request) => {
                setRequestToRate(request);
                // Устанавливаем текущий рейтинг как начальное значение, если он существует
                const currentRating = userRatings[request.id]?.rating || 0;
                setRatingValue(currentRating);
                setRatingComment(""); // Сбрасываем комментарий
                setShowRatingModal(true);
                openModal('ratingModal');
              }}
              onRateClient={(requestGroup) => {
                setRequestGroupToRate(requestGroup);
                const currentRating = clientRatings[requestGroup.id]?.rating || 0;
                setClientRatingValue(currentRating);
                setClientRatingComment("");
                setShowClientRatingModal(true);
                openModal('clientRatingModal');
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
      setRejectionReason("")
      setRatingValue(0)
      setClientInfo({})
      setUserRatings({})
      setFormErrors("")
      setStats(null)
      setHasMore(true)
      setPage(1)

      clearRequests();
      clearNotifications()
      setOffices([])

      await Promise.all([
        fetchRequests(),
        fetchStats(),
        fetchCategories(token!),
        fetchNotifications(),
        fetchOffices(),
      ]);

      // Загружаем пользователей офиса после загрузки основных данных
      if (user?.office_id) {
        await loadOfficeUsers();
      }

    } catch (error) {
      console.error("Ошибка при обновлении:", error);
    }
  };

  return (
      <>
        <Header
            setShowProfile={setShowProfile}
            handleLogout={handleLogout}
            notificationCount={3}
            role="Администратор"
            onRefresh={handleRefresh}
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
                          {stats && stats.statusCounts && stats.statusCounts.new ? (stats.statusCounts.new): 0}
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
                          {stats && stats.statusCounts && stats.statusCounts.inWork ? (stats.statusCounts.inWork): 0}
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
                          {stats && stats.statusCounts && stats.statusCounts.completed ? (stats.statusCounts.completed): 0}
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
                          {stats && stats.statusCounts && stats.statusCounts.overdue ? (stats.statusCounts.overdue): 0}
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
                <div className="mb-3">
                  {/* на телефоне только табы */}
                  <div className="w-full mb-2 sm:hidden">
                    <div className="overflow-x-auto">
                      <TabsList className="flex w-max min-w-full">
                        <TabsTrigger value="incoming" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                          <span className="sm:hidden">Входящие</span>
                        </TabsTrigger>
                        <TabsTrigger value="my-requests" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                          <span className="sm:hidden">Мои</span>
                        </TabsTrigger>
                        <TabsTrigger value="recurring-tasks" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                          <span className="sm:hidden">Повторяющиеся</span>
                        </TabsTrigger>
                        {/*<TabsTrigger value="statistics" className="text-sm px-3 py-2 whitespace-nowrap">*/}
                        {/*  Статистика*/}
                        {/*</TabsTrigger>*/}
                        <TabsTrigger value="change-head" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                          Управление
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                          Логи
                        </TabsTrigger>
                        <TabsTrigger value="registration-requests" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                          Регистрации
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </div>

                  {/* на больших экранах */}
                  <div className="hidden sm:flex justify-between items-center">
                    <TabsList className="flex flex-wrap sm:flex-nowrap gap-2">
                      <TabsTrigger value="incoming" className="text-sm px-3 py-2 whitespace-nowrap">
                        <span className="hidden sm:inline">Входящие заявки</span>
                      </TabsTrigger>
                      <TabsTrigger value="my-requests" className="text-sm px-3 py-2 whitespace-nowrap">
                        <span className="hidden sm:inline">Мои заявки</span>
                      </TabsTrigger>
                      <TabsTrigger value="recurring-tasks" className="text-sm px-3 py-2 whitespace-nowrap">
                        <span className="hidden sm:inline">Повторяющиеся</span>
                      </TabsTrigger>
                      {/*<TabsTrigger value="statistics" className="text-sm px-3 py-2 whitespace-nowrap">*/}
                      {/*  Статистика*/}
                      {/*</TabsTrigger>*/}
                      <TabsTrigger value="change-head" className="text-sm px-3 py-2 whitespace-nowrap">
                        Управление
                      </TabsTrigger>
                      <TabsTrigger value="logs" className="text-sm px-3 py-2 whitespace-nowrap">
                        Логи
                      </TabsTrigger>
                      <TabsTrigger value="registration-requests" className="text-sm px-3 py-2 whitespace-nowrap">
                        Регистрации
                      </TabsTrigger>
                    </TabsList>
                    <Button
                        onClick={() => router.push('/create-request')}
                        className="bg-violet-600 hover:bg-violet-700"
                    >
                      Создать
                    </Button>
                  </div>
                </div>
                <TabsContent value="registration-requests">
                  <RegistrationRequestsManager />
                </TabsContent>
                <TabsContent value="my-requests">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-2">
                      <Select value={filterMyStatus} onValueChange={setFilterMyStatus}>
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
                        </SelectContent>
                      </Select>
                      <Select value={filterMyType} onValueChange={setFilterMyType}>
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
                      {filteredMyRequests.map((request, index: number) => (
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

                <TabsContent value="recurring-tasks">
                  <RecurringTasksList 
                    userRole="admin-worker" 
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

                <TabsContent value="incoming">
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
                          <SelectItem value="rejected">Отклоненные</SelectItem>
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
                      {filteredIncomingRequests.map((request, index) => {
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

                <TabsContent value="statistics">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Статистика по заявкам</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Всего заявок</span>
                            <span className="font-bold">{stats && stats.totalRequests ? (stats.totalRequests): 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Завершено</span>
                            <span className="font-bold text-green-600">
                            {stats && stats.statusCounts && stats.statusCounts.completed ? (stats.statusCounts.completed): 0}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>В работе</span>
                            <span className="font-bold text-blue-600">
                            {stats && stats.statusCounts && stats.statusCounts.inWork ? (stats.statusCounts.inWork): 0}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Просрочено</span>
                            <span className="font-bold text-red-600">
                            {stats && stats.statusCounts && stats.statusCounts.overdue ? (stats.statusCounts.overdue): 0}
                          </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>По типам заявок</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span>Обычные</span>
                            <span className="font-bold">
                            {stats && stats.requestTypeSummary && stats.requestTypeSummary.normal ? (stats.requestTypeSummary.normal): 0}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Экстренные</span>
                            <span className="font-bold">
                            {stats && stats.requestTypeSummary && stats.requestTypeSummary.urgent ? (stats.requestTypeSummary.urgent): 0}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Плановые</span>
                            <span className="font-bold">
                            {stats && stats.requestTypeSummary && stats.requestTypeSummary.planned ? (stats.requestTypeSummary.planned): 0}
                          </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="change-head">
                  <div className="w-full max-w-full overflow-hidden">
                    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
                      {/* Селект разделов управления */}
                      <Card className="w-full">
                        <CardHeader className="pb-3 sm:pb-6">
                          <CardTitle className="text-base sm:text-lg">Управление системой</CardTitle>
                          <CardDescription>Выберите раздел для управления</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Select value={selectedManagementSection} onValueChange={setSelectedManagementSection}>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите раздел управления" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="categories">Управление категориями</SelectItem>
                              <SelectItem value="subcategories">Управление подкатегориями</SelectItem>
                              <SelectItem value="passwords">Управление паролями</SelectItem>
                              <SelectItem value="executors">Управление исполнителями</SelectItem>
                              <SelectItem value="change-head">Смена руководителя категории</SelectItem>
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>

                      {/* Управление категориями */}
                      {selectedManagementSection === "categories" && (
                        <Card className="w-full">
                          <CardHeader className="pb-3 sm:pb-6">
                            <CardTitle className="text-base sm:text-lg">Управление категориями</CardTitle>
                          </CardHeader>
                        <CardContent className="space-y-3 sm:space-y-4">
                          {/* Создание категории */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Создать новую категорию</Label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Название категории"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                                disabled={isCreatingCategory}
                              />
                              <Button
                                onClick={handleCreateCategory}
                                disabled={!newCategoryName.trim() || isCreatingCategory}
                                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto min-h-[40px] text-sm sm:text-base"
                              >
                                {isCreatingCategory ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span className="hidden sm:inline">Создание...</span>
                                    <span className="sm:hidden">...</span>
                                  </div>
                                ) : (
                                  "Создать"
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Удаление категории */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Удалить категорию</Label>
                            
                            {/* Информационное сообщение */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-yellow-800">
                                  <p className="font-medium mb-1">Внимание:</p>
                                  <p>• Категорию можно удалить только если в ней нет исполнителей и руководителя</p>
                                  <p>• Сначала удалите всех исполнителей из категории</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Select onValueChange={(categoryId) => setCategoryToDelete(parseInt(categoryId))} value={categoryToDelete?.toString() || ""}>
                                <SelectTrigger className="flex-1 w-full">
                                  <SelectValue placeholder="Выберите категорию для удаления" />
                                </SelectTrigger>
                                <SelectContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-none">
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
                                className="w-full sm:w-auto min-h-[40px] text-sm sm:text-base"
                              >
                                {isDeletingCategory ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span className="hidden sm:inline">Удаление...</span>
                                    <span className="sm:hidden">...</span>
                                  </div>
                                ) : (
                                  "Удалить"
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Ошибки управления категориями */}
                          {categoryError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs sm:text-sm text-red-800 min-w-0 flex-1">{categoryError}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      )}

                      {/* Управление подкатегориями */}
                      {selectedManagementSection === "subcategories" && (
                      <Card className="w-full">
                        <CardHeader className="pb-3 sm:pb-6">
                          <CardTitle className="text-base sm:text-lg">Управление подкатегориями</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 sm:space-y-4">
                          {/* Создание подкатегории */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Создать новую подкатегорию</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Select onValueChange={(categoryId) => setSelectedCategoryForSubcategory(parseInt(categoryId))} value={selectedCategoryForSubcategory?.toString() || ""}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Выберите категорию" />
                                </SelectTrigger>
                                <SelectContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-none">
                                  {categories.map(category => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <input
                                type="text"
                                value={newSubcategoryName}
                                onChange={(e) => setNewSubcategoryName(e.target.value)}
                                placeholder="Название подкатегории"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                                disabled={isCreatingSubcategory}
                              />
                            </div>
                            <Button
                              onClick={handleCreateSubcategory}
                              disabled={!selectedCategoryForSubcategory || !newSubcategoryName.trim() || isCreatingSubcategory}
                              className="bg-green-600 hover:bg-green-700 text-white w-full min-h-[40px] text-sm sm:text-base"
                            >
                              {isCreatingSubcategory ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span className="hidden sm:inline">Создание...</span>
                                  <span className="sm:hidden">...</span>
                                </div>
                              ) : (
                                "Создать подкатегорию"
                              )}
                            </Button>
                          </div>

                          {/* Удаление подкатегории */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Удалить подкатегорию</Label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Select onValueChange={(subcategoryId) => setSubcategoryToDelete(parseInt(subcategoryId))} value={subcategoryToDelete?.toString() || ""}>
                                <SelectTrigger className="flex-1 w-full">
                                  <SelectValue placeholder="Выберите подкатегорию для удаления" />
                                </SelectTrigger>
                                <SelectContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-none">
                                  {categories.flatMap(category => 
                                    category.subcategories?.map(subcategory => (
                                      <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                                        <span className="truncate">{category.name} → {subcategory.name}</span>
                                      </SelectItem>
                                    )) || []
                                  )}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={handleDeleteSubcategory}
                                disabled={!subcategoryToDelete || isDeletingSubcategory}
                                variant="destructive"
                                className="w-full sm:w-auto min-h-[40px] text-sm sm:text-base"
                              >
                                {isDeletingSubcategory ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span className="hidden sm:inline">Удаление...</span>
                                    <span className="sm:hidden">...</span>
                                  </div>
                                ) : (
                                  "Удалить"
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Ошибки управления подкатегориями */}
                          {subcategoryError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs sm:text-sm text-red-800 min-w-0 flex-1">{subcategoryError}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      )}

                      {/* Управление паролями */}
                      {selectedManagementSection === "passwords" && (
                      <Card className="w-full">
                        <CardHeader className="pb-3 sm:pb-6">
                          <CardTitle className="text-base sm:text-lg">Управление паролями</CardTitle>
                          <CardDescription>Изменение паролей пользователей вашего офиса</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 sm:space-y-4">
                          {/* Выбор пользователя */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Выберите пользователя ({officeUsers.length} пользователей)
                            </Label>
                            <Select
                                onValueChange={(userId) => setSelectedUserForPassword(parseInt(userId))}
                                value={selectedUserForPassword?.toString() || ""}
                            >
                              <SelectTrigger className="w-full max-w-full truncate text-sm sm:text-base">
                                <SelectValue placeholder="Выберите пользователя для смены пароля" />
                              </SelectTrigger>
                              <SelectContent
                                  className="w-[var(--radix-select-trigger-width)] max-h-60 overflow-y-auto z-50 rounded-md shadow-lg bg-white border border-gray-200"
                                  position="popper"
                                  sideOffset={4}
                              >
                                {officeUsers.length === 0 ? (
                                    <SelectItem value="no-users" disabled className="text-gray-500 text-sm">
                                      Нет пользователей в офисе
                                    </SelectItem>
                                ) : (
                                    officeUsers.map((user) => (
                                      <SelectItem
                                          key={user.id}
                                          value={user.id.toString()}
                                          className="flex flex-col items-start gap-1 w-full px-3 py-2 text-sm whitespace-normal break-words"
                                      >
                                          <span className="font-medium break-words whitespace-normal">{user.full_name}</span>
                                          <span className="text-gray-500 text-xs break-words whitespace-normal">{user.phone}</span>
                                      </SelectItem>
                                    ))
                                )}
                              </SelectContent>
                            </Select>

                            {officeUsers.length === 0 && (
                                <p className="text-sm text-gray-500">Пользователи офиса не найдены.</p>
                            )}
                          </div>

                          {/* Новый пароль */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Новый пароль</Label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Введите новый пароль"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base min-h-[40px]"
                              disabled={isChangingPassword}
                              autoComplete="new-password"
                              name="new-password"
                            />
                          </div>

                          {/* Подтверждение пароля */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Подтвердите пароль</Label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Подтвердите новый пароль"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base min-h-[40px]"
                              disabled={isChangingPassword}
                              autoComplete="new-password"
                              name="confirm-password"
                            />
                          </div>

                          {/* Кнопки управления */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              onClick={handleChangePassword}
                              disabled={!selectedUserForPassword || !newPassword.trim() || !confirmPassword.trim() || isChangingPassword}
                              className="bg-blue-600 hover:bg-blue-700 text-white flex-1 min-h-[40px] text-sm sm:text-base"
                            >
                              {isChangingPassword ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span className="hidden sm:inline">Изменение...</span>
                                  <span className="sm:hidden">...</span>
                                </div>
                              ) : (
                                "Изменить пароль"
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setNewPassword("");
                                setConfirmPassword("");
                                setSelectedUserForPassword(null);
                                setPasswordError(null);
                              }}
                              variant="outline"
                              disabled={isChangingPassword}
                              className="w-full sm:w-auto min-h-[40px] text-sm sm:text-base"
                            >
                              Очистить
                            </Button>
                          </div>

                          {/* Ошибки смены пароля */}
                          {passwordError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs sm:text-sm text-red-800 min-w-0 flex-1">{passwordError}</p>
                              </div>
                            </div>
                          )}


                          {/* Информационное сообщение */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-blue-800">
                                <p className="font-medium mb-1">Важно:</p>
                                <p>• Вы можете изменять пароли только пользователей вашего офиса</p>
                                <p>• Новый пароль должен содержать минимум 6 символов</p>
                                <p>• Пользователь сможет войти с новым паролем сразу после изменения</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      )}

                      {/* Управление исполнителями */}
                      {selectedManagementSection === "executors" && (
                      <Card className="w-full">
                        <CardHeader className="pb-3 sm:pb-6">
                          <CardTitle className="text-base sm:text-lg">Управление исполнителями</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 sm:space-y-4">
                          {/* Назначение исполнителя к категории */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Назначить исполнителя к категории</Label>
                            
                            {/* Информационное сообщение */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-blue-800">
                                  <p className="font-medium mb-1">Важно:</p>
                                  <p>• Если в категории нет исполнителей, первый назначенный исполнитель автоматически станет руководителем</p>
                                  <p>• Последующие исполнители будут назначены как обычные исполнители</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Select onValueChange={(categoryId) => setSelectedCategoryId(parseInt(categoryId))} value={selectedCategoryId?.toString() || ""}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Выберите категорию" />
                                </SelectTrigger>
                                <SelectContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-none">
                                  {categories.map(category => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select onValueChange={(executorId) => setSelectedExecutorForAssignment(parseInt(executorId))} value={selectedExecutorForAssignment?.toString() || ""} disabled={isLoadingAllExecutors}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder={isLoadingAllExecutors ? "Загрузка..." : "Выберите исполнителя"} />
                                </SelectTrigger>
                                <SelectContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-none">
                                  {isLoadingAllExecutors ? (
                                    <SelectItem value="loading" disabled className="text-gray-500">
                                      Загрузка исполнителей...
                                    </SelectItem>
                                  ) : allExecutors.length === 0 ? (
                                    <SelectItem value="no-executors" disabled className="text-gray-500">
                                      Нет доступных исполнителей
                                    </SelectItem>
                                  ) : (
                                    allExecutors.map(executor => (
                                      <SelectItem key={executor.id} value={executor.id.toString()}>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-medium truncate">{executor.user.full_name}</span>
                                          <span className="text-xs text-gray-500 truncate">{executor.specialty}</span>
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={handleAssignExecutorToCategory}
                              disabled={!selectedCategoryId || !selectedExecutorForAssignment || isAssigningExecutor}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white min-h-[40px] text-sm sm:text-base"
                            >
                              {isAssigningExecutor ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span className="hidden sm:inline">Назначение...</span>
                                  <span className="sm:hidden">...</span>
                                </div>
                              ) : (
                                "Назначить исполнителя"
                              )}
                            </Button>
                          </div>


                          {/* Ошибки управления исполнителями */}
                          {executorManagementError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs sm:text-sm text-red-800 min-w-0 flex-1">{executorManagementError}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      )}

                      {/* Смена руководителя категории */}
                      {selectedManagementSection === "change-head" && (
                      <Card className="w-full">
                        <CardHeader className="pb-3 sm:pb-6">
                          <CardTitle className="text-base sm:text-lg">Смена руководителя категории</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 sm:space-y-4">
                          {/* Выбор категории */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Выберите категорию</Label>
                            <Select onValueChange={(categoryId) => {
                              const id = parseInt(categoryId);
                              setSelectedCategoryId(id);
                              setSelectedExecutorId(null);
                              loadExecutorsForCategory(id);
                            }} value={selectedCategoryId?.toString() || ""} disabled={isLoadingExecutors || isChangingHead}>
                              <SelectTrigger className="w-full disabled:opacity-50 disabled:cursor-not-allowed">
                                <SelectValue placeholder="Выберите категорию" />
                              </SelectTrigger>
                              <SelectContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-none">
                                {categories.map(category => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Выбор исполнителя */}
                          {selectedCategoryId && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Выберите нового руководителя</Label>
                              
                              {/* Индикатор загрузки исполнителей */}
                              {isLoadingExecutors && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <div className="text-xs sm:text-sm text-blue-800">
                                      <p className="font-medium">Загрузка исполнителей...</p>
                                      <p className="text-blue-600">Ищем доступных исполнителей в категории</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <Select 
                                onValueChange={(executorId) => setSelectedExecutorId(parseInt(executorId))} 
                                value={selectedExecutorId?.toString() || ""}
                                disabled={isLoadingExecutors}
                              >
                                <SelectTrigger className="w-full disabled:opacity-50 disabled:cursor-not-allowed">
                                  <SelectValue placeholder={isLoadingExecutors ? "Загрузка..." : "Выберите исполнителя"} />
                                </SelectTrigger>
                                <SelectContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-none">
                                  {isLoadingExecutors ? (
                                    <SelectItem value="loading" disabled className="text-gray-500">
                                      Загрузка исполнителей...
                                    </SelectItem>
                                  ) : availableExecutors.length === 0 ? (
                                    <SelectItem value="no-executors" disabled className="text-gray-500">
                                      Нет доступных исполнителей в этой категории
                                    </SelectItem>
                                  ) : (
                                    availableExecutors.map(executor => (
                                      <SelectItem key={executor.id} value={executor.id.toString()}>
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-medium truncate">{executor.user.full_name}</span>
                                          <span className="text-xs text-gray-500 truncate">{executor.specialty}</span>
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Информация о выбранном исполнителе */}
                          {selectedExecutorId && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs sm:text-sm text-blue-800 min-w-0 flex-1">
                                  <p className="font-medium mb-1">Новый руководитель будет:</p>
                                  <p>• Назначен руководителем категории</p>
                                  <p>• Получит права управления исполнителями</p>
                                  <p>• Текущий руководитель станет исполнителем</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Кнопки */}
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <Button
                              onClick={handleChangeCategoryHead}
                              disabled={!selectedCategoryId || !selectedExecutorId || isChangingHead}
                              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white min-h-[40px] text-sm sm:text-base"
                            >
                              {isChangingHead ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span className="hidden sm:inline">Смена...</span>
                                  <span className="sm:hidden">...</span>
                                </div>
                              ) : (
                                "Сменить руководителя"
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedCategoryId(null);
                                setSelectedExecutorId(null);
                                setAvailableExecutors([]);
                              }}
                              disabled={isLoadingExecutors || isChangingHead}
                              className="w-full sm:w-auto min-h-[40px] text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Сбросить
                            </Button>
                          </div>

                          {/* Ошибка */}
                          {changeHeadError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs sm:text-sm text-red-800 min-w-0 flex-1">{changeHeadError}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="logs">
                  <div className="w-full">
                  <LogsViewer userRole="admin-worker" isDesktop={isDesktop} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <div className="space-y-6 mb-20">
              <UpcomingTasksWidget refreshTrigger={upcomingTasksRefreshTrigger} />
              <Card className="overflow-hidden">
                <CardContent className="p-0">
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
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
        </PullToRefresh>
        {/* Мод алка */}
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => {
              setSelectedRequest(null)
              setShowComments(null);
              setFormErrors(null);
            }}>
              <Card className={`w-full ${isDesktop ? 'max-w-2xl' : 'max-w-full h-full'} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="font-medium text-gray-900">Заявка #{selectedRequest.id}</CardTitle>
                    {selectedRequest.status !== 'completed' && selectedRequest.status !== 'in_progress' && (
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
                      <Label>Тип заявки</Label>
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

                  {/* Заявка (теперь показываем только первый подзаявка как полноценный заявка) */}
                      <div>
                    <Label className={isDesktop ? '' : 'text-base font-medium'}>Заявка</Label>
                    <div className={`space-y-3 mt-2 ${isDesktop ? '' : 'space-y-4'}`}>
                      {selectedRequest.requests.slice(0, 1).map((subRequest: SubRequest) => {
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
                                            placeholder="Название заявки"
                                            className="w-full"
                                          />
                                        </div>
                                      ) : (
                                        <h4 className={`font-semibold text-gray-900 ${isDesktop ? 'text-base' : 'text-md'}`}>{subRequest.title}</h4>
                                      )}
                      </div>
                                    <div className={`${isDesktop ? 'flex items-center gap-3' : 'flex flex-col gap-1'} text-gray-600 ${isDesktop ? 'text-sm' : 'text-base'}`}>
                                      {editingCategoryId === subRequest.id ? (
                                        <div className="flex items-center gap-2">
                                          <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                          <Select
                                            value={subRequestSettings[subRequest.id]?.category_id?.toString() || subRequest.category_id?.toString() || ''}
                                            onValueChange={(value) => {
                                              setSubRequestSettings(prev => ({
                                                ...prev,
                                                [subRequest.id]: {
                                                  ...prev[subRequest.id],
                                                  sla: prev[subRequest.id]?.sla || '',
                                                  complexity: prev[subRequest.id]?.complexity || '',
                                                  category_id: parseInt(value)
                                                }
                                              }));
                                            }}
                                            onOpenChange={(open) => {
                                              if (!open) {
                                                setEditingCategoryId(null);
                                              }
                                            }}
                                          >
                                            <SelectTrigger className="h-8 text-xs w-40">
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
                                      ) : (
                                        <span 
                                          className="flex items-center gap-1 cursor-pointer"
                                          onClick={() => {
                                            setEditingCategoryId(subRequest.id);
                                            // Инициализируем настройки если их нет
                                            if (!subRequestSettings[subRequest.id]) {
                                              setSubRequestSettings(prev => ({
                                                ...prev,
                                                [subRequest.id]: {
                                                  sla: '',
                                                  complexity: '',
                                                  category_id: subRequest.category_id || undefined
                                                }
                                              }));
                                            }
                                          }}
                                        >
                                          <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                          {(() => {
                                            const settings = subRequestSettings[subRequest.id];
                                            if (settings?.category_id) {
                                              const selectedCategory = categories.find(cat => cat.id === settings.category_id);
                                              return selectedCategory?.name || subRequest.category?.name || 'Без категории';
                                            }
                                            return subRequest.category?.name || 'Без категории';
                                          })()}
                                        </span>
                                      )}
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
                                        userRole="admin-worker"
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
                                        onToggleLongTerm={handleToggleLongTerm}
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
                                      placeholder="Описание заявки"
                                      className="w-full min-h-[80px]"
                                    />
                                  ) : isDesktop ? (
                                      <p className="line-clamp-2">{subRequest.description}</p>
                                  ) : (
                                      <p className="whitespace-pre-wrap break-words">{subRequest.description}</p>
                                  )}
                                </div>

                                {/* Кнопка раскрытия */}
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
                                    
                                    {/* Настройки времени выполнения и сложности для админа */}
                                    {selectedRequest.status === 'in_progress' && editableRequestType !== 'planned' && (
                                        <div className="border-t border-gray-200 pt-3 mt-3">
                                          <h5 className="font-medium text-sm mb-3 text-gray-700">Настройки заявки</h5>
                                          <div className={`grid gap-3 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
                  <div>
                                              <Label className="text-xs font-medium text-gray-600">Время выполнения</Label>
                        <Select
                                                  value={subRequestSettings[subRequest.id]?.sla || ''}
                                                  onValueChange={(value) => setSubRequestSettings(prev => ({
                                                    ...prev,
                                                    [subRequest.id]: { 
                                                      sla: value, 
                                                      complexity: prev[subRequest.id]?.complexity || '' 
                                                    }
                                                  }))}
                                                  onOpenChange={(open) => {
                                                    if (open && !subRequestSettings[subRequest.id]) {
                                                      setSubRequestSettings(prev => ({
                                                        ...prev,
                                                        [subRequest.id]: { 
                                                          sla: '', 
                                                          complexity: '' 
                                                        }
                                                      }));
                                                    }
                                                  }}
                                              >
                                                <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue placeholder="Выберите время выполнения" />
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
                    <div>
                                              <Label className="text-xs font-medium text-gray-600">Сложность</Label>
                          <Select
                                                  value={subRequestSettings[subRequest.id]?.complexity || ''}
                                                  onValueChange={(value) => setSubRequestSettings(prev => ({
                                                    ...prev,
                                                    [subRequest.id]: { 
                                                      sla: prev[subRequest.id]?.sla || '', 
                                                      complexity: value 
                                                    }
                                                  }))}
                                                  onOpenChange={(open) => {
                                                    if (open && !subRequestSettings[subRequest.id]) {
                                                      setSubRequestSettings(prev => ({
                                                        ...prev,
                                                        [subRequest.id]: { 
                                                          sla: '', 
                                                          complexity: '' 
                                                        }
                                                      }));
                                                    }
                                                  }}
                                              >
                                                <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Выберите сложность" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simple">Простая</SelectItem>
                              <SelectItem value="medium">Средняя</SelectItem>
                              <SelectItem value="complex">Сложная</SelectItem>
                            </SelectContent>
                          </Select>
                                            </div>
                                            
                                            {/* Индикатор заполненности и кнопка сохранения */}
                                            {(subRequest.status!='in_progress' && subRequest.status!='completed' && subRequest.status!='rejected')&&(<div className="mt-3">
                                              {/* Индикатор заполненности */}

                                              {/* Кнопка сохранения изменений */}
                                              {(subRequestSettings[subRequest.id]?.sla && subRequestSettings[subRequest.id]?.complexity) || (editableLocationDetail && editableLocationDetail !== selectedRequest?.location_detail) && (
                                                <Button
                                                  size="sm"
                                                  onClick={() => handleSaveTimeSettings(subRequest)}
                                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                  Сохранить изменения
                                                </Button>
                                              )}
                                            </div>)}
                                          </div>
                                        </div>
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
                    {isEditingLocation ? (
                      <div className="flex gap-2">
                        <Input
                          value={editableLocationDetail}
                          onChange={(e) => setEditableLocationDetail(e.target.value)}
                          placeholder="Введите расположение в офисе"
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveLocation}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditableLocationDetail(selectedRequest.location_detail || "");
                            setIsEditingLocation(false);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <p 
                        className="text-sm cursor-pointer hover:bg-gray-100 p-2 rounded border-none transition-colors hover:text-gray-700"
                        onClick={() => {
                          setIsEditingLocation(true);
                        }}
                        title="Нажмите для редактирования"
                      >
                        {selectedRequest.location_detail}
                      </p>
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
                                          src={photo.photo_url || "/placeholder.svg"}
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
                                        src={photo.photo_url || "/placeholder.svg"}
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

                  {/* Отображение оценки клиента */}
                  {selectedRequest.status === "completed" && clientRatings[selectedRequest.id] && selectedRequest.client?.role === "client" && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-purple-800">
                          Ваша оценка клиента
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`text-xl ${star <= clientRatings[selectedRequest.id].rating ? 'text-purple-500' : 'text-gray-300'}`}>
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-sm text-purple-700">
                          {clientRatings[selectedRequest.id].rating} из 5
                        </span>
                      </div>
                      {clientRatings[selectedRequest.id].comment && (
                        <div className="mt-2">
                          <p className="text-sm text-purple-700 break-words">
                            "{clientRatings[selectedRequest.id].comment}"
                          </p>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-purple-600">
                        Оценка от {new Date(clientRatings[selectedRequest.id].created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  )}

                  {/* Кнопки действий для админа */}
                  {selectedRequest?.status === 'in_progress' && (
                      <>
                        {/* Причина отклонения */}
                        <div className="border-t border-gray-100 pt-4">
                          <Label>Причина отклонения (если необходимо)</Label>
                          <Textarea
                              placeholder="Укажите причину отклонения..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="mt-2"
                          />
                        </div>

                  {/* Кнопки принятия/отклонения */}
                        <div className={`flex gap-4 pt-4 border-t border-gray-100 ${isDesktop ? 'flex-row' : 'flex-col'}`}>
                        <Button
                              onClick={handleAcceptRequestGroup}
                              className={`${isDesktop ? 'flex-1' : 'w-full'} bg-green-600 hover:bg-green-700`}
                              disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Принятие...
                                </>
                            ) : (
                                <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                                  Принять заявку
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                              onClick={handleRejectRequestGroup}
                              className={`${isDesktop ? 'flex-1' : 'w-full'} text-red-600 hover:text-red-700`}
                              disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Отклонение...
                                </>
                            ) : (
                                <>
                          <XCircle className="w-4 h-4 mr-2" />
                                  Отклонить заявку
                                </>
                            )}
                        </Button>
                      </div>
                      </>
                  )}



                  {/* Ошибки */}
                  {formErrors && (
                      <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                        {formErrors}
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
                          setEditableSubRequestTitles({});
                          setEditableSubRequestDescriptions({});
                          setEditableSubRequestComplexity({});
                          setEditableSubRequestSla({});
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
                      closeModalWithHistory();
                      setFormErrors(null);
                      setEditableRequestType('');
                      setEditingCategoryId(null);
                      setSubRequestSettings({});
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
                }}
            />
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
           userRole="admin-worker"
           categories={categories}
           onSubmit={handleCreateNewRequest}
           isSubmitting={isSubmitting}
           formErrors={formErrors}
           translateType={translateType}
           offices={offices}
         />

        {/* Rating Modal */}
        <RatingModal
          isOpen={showRatingModal && !!requestToRate}
          onClose={() => {
                        setShowRatingModal(false);
            closeModalWithHistory()
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

        {/* Client Rating Modal */}
        <RatingModal
          isOpen={showClientRatingModal && !!requestGroupToRate}
          onClose={() => {
            setShowClientRatingModal(false);
            closeModalWithHistory();
            setClientRatingValue(0);
            setClientRatingComment("");
            setRequestGroupToRate(null);
          }}
          ratingValue={clientRatingValue}
          onRatingChange={setClientRatingValue}
          onSubmit={handleRateClient}
          currentRating={requestGroupToRate ? clientRatings[requestGroupToRate.id]?.rating : undefined}
          comment={clientRatingComment}
          onCommentChange={setClientRatingComment}
          title="Оценить клиента"
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
            title={approveModal.title}
            message={approveModal.message}
            duration={approveModal.duration}
        />

        <RejectRequestModal
            isOpen={rejectModal.isOpen}
            onClose={rejectModal.hideReject}
            title={rejectModal.title}
            message={rejectModal.message}
            duration={rejectModal.duration}
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


        <BottomNav

            activeTab="history"
            hidden={showCreateRequestModal || !!selectedRequest || showMapModal || showRatingModal || showProfile || isModalOpen || !!selectedPhoto}
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

        {/* Модал импорта Excel */}
        <ImportExcelModal
          isOpen={showImportExcelModal}
          onClose={() => setShowImportExcelModal(false)}
          onSuccess={() => {
            setShowImportExcelModal(false);
            // Обновляем список повторяющихся задач
            fetchRequests();
          }}
          userRole="admin-worker"
          isFullScreen={!isDesktop}
        />

        {/* Модалка для случая, когда заявка не найдена */}
        <RequestNotFoundModal
          isOpen={showNotFoundModal}
          onClose={() => setShowNotFoundModal(false)}
          requestId={notFoundRequestId}
        />

      </>
  );
}
