"use client"

import React, {useCallback} from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Star,
  Clock,
  TrendingUp,
  TrendingDown,
  Download,
  Building2,
  Plus,
  Trash2,
  Camera,
  MapPin, Filter, Loader2, XCircle, User, Zap, AlertCircle, Calendar, ImageIcon,
} from "lucide-react"
import axios from "axios";
import Header from "@/app/header/Header";
import UserProfile from "@/app/client/UserProfile";
import dynamic from "next/dynamic";
import {Request} from "@/app/client/page";
import api from "@/lib/api";
import {useRouter} from "next/navigation";

const API_BASE_URL = 'https://kcell-service.onrender.com/api';

const MapView = dynamic(() => import('@/app/map/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">Загрузка карты...</div>
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
  office_id: string;
  role: string;
}

interface Comment {
  id: number,
  request_id: number,
  sender_id: number,
  comment: string,
  timestamp: Date
}

export default function ManagerDashboard() {
  const router = useRouter()
  const [period, setPeriod] = useState("month")
  const [office, setOffice] = useState("all")
  const [newRequestOfficeId, setNewRequestOfficeId] = useState("")
  const [tab, setTab] = useState("requests")
  const [offices, setOffices] = useState([{}])
  const [newOfficeName, setNewOfficeName] = useState("")
  const [newOfficeCity, setNewOfficeCity] = useState("")
  const [newOfficeAddress, setNewOfficeAddress] = useState("")
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [newRequestType, setNewRequestType] = useState("Обычная")
  const [newRequestTitle, setNewRequestTitle] = useState("")
  const [newRequestLocation, setNewRequestLocation] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [description, setDescription] = useState("");
  const [requestLocation, setRequestLocation] = useState("")
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [serviceCategories, setServiceCategories] = useState<{id: number, name: string}[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<any>(null)
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [editCommentId, setEditCommentId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [officeToDelete, setOfficeToDelete] = useState<OfficeType | null>(null)
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null)
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null)
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState("")
  const [newUser, setNewUser] = useState({
    id: 0,
    email: "",
    full_name: "",
    office_id: "",
    role: "",
  });
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingOfficeId, setEditingOfficeId] = useState(null)
  const [editedOffice, setEditedOffice] = useState<Partial<OfficeType>>({
    name: "",
    city: "",
    address: "",
  })
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  const lastRequestRef = useCallback(
      (node: any) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && hasMore) {
            fetchRequests(page + 1);
          }
        });

        if (node) observer.current.observe(node);
      },
      [loading, hasMore, page]
  );


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get("/users");
        setUsers(response.data);
      } catch (err) {
        console.error("Ошибка при получении пользователей:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleAddOrUpdateUser = async () => {
    try {
      setLoading(true);

      if (editingUserId) {
        // Обновить пользователя
        const response = await api.put(`/users/${editingUserId}`, newUser);
        setUsers((prev) =>
            prev.map((user) => (user.id === editingUserId ? response.data : user))
        );
      } else {
        // Добавить нового пользователя
        const response = await api.post("/users", newUser);
        setUsers(prev => [...prev, newUser]);
      }

      setNewUser({ id: 0, email: "", full_name: "", office_id: "", role: "" });
      setEditingUserId(null);
    } catch (err) {
      console.error("Ошибка при сохранении пользователя:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/users/me");
        const user = response.data;

        if (!user || user.role !== "manager") {
          router.push("/login")
        } else {
          setIsLoggedIn(true);
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error("Ошибка при проверке авторизации", error);
        router.push("/login")
      }
    };

    checkAuth();
  }, []);

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
      newUser.office_id &&
      newUser.role;

  const handleEditUser = (user: User) => {
    setNewUser({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      office_id: user.office_id,
      role: user.role,
    });
    setEditingUserId(user.id);
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchCategories()
      fetchRequests(1)
      fetchNotifications()
      fetchOffices()
    }
  }, [isLoggedIn])

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
      await api.post('/auth/logout')
      setIsLoggedIn(false)
      localStorage.removeItem('token')
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleDeleteRequest = (request: Request) => {
    setRequestToDelete(request)
    setShowDeleteRequestModal(true)
  }

  const confirmDeleteRequest = async () => {
    if (requestToDelete) {
      try {
        await api.delete(`/requests/${requestToDelete.id}`)
        fetchRequests()
        setShowDeleteRequestModal(false)
        setRequestToDelete(null)
        setDeleteReason("")
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
        !selectedCategoryId
    ) {
      setFormErrors("Пожалуйста, заполните все обязательные поля.");
      return;
    }

    setIsSubmitting(true);
    setFormErrors(null);
    try {
      const response = await api.post('/requests', {
        title: newRequestTitle,
        description: description,
        office_id: Number(newRequestOfficeId),
        request_type: newRequestType === "urgent" ? "urgent" : "normal",
        location: requestLocation,
        location_detail: newRequestLocation,
        category_id: selectedCategoryId,
        status: "in_progress"
      })

      const requestId = response.data.id;

      console.log("Created request ID:", requestId);
      let createdPhotos;
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((photo) => {
          formData.append('photos', photo);
        });
        formData.append('type', 'before');

        try {

          createdPhotos = await axios.post(`${API_BASE_URL}/request-photos/${requestId}/photos`, formData, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });

          console.log("Фотографии успешно загружены");
        } catch (photoUploadError) {
          await api.delete(`/requests/${requestId}`);
          console.error("Ошибка при загрузке фото. Заявка удалена.");
          alert("Ошибка при загрузке фото. Заявка не была создана.");
          throw photoUploadError;
        }
      }
      const newRequest = {
        ...response.data,
        photos: createdPhotos?.data?.photos,
      }
      setRequests(prev => [newRequest, ...prev])
      setShowCreateRequestModal(false)
      setNewRequestType("")
      setNewRequestTitle("")
      setRequestLocation("")
      setNewRequestLocation("")
      setDescription("")
    } catch (error) {
      console.error("Failed to create request:", error)
      alert("Не удалось создать заявку. Пожалуйста, попробуйте еще раз.")
      setFormErrors("Не удалось создать заявку. Повторите попытку позже.");
    } finally {
      setIsSubmitting(false);
    }
  }

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

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/comments/${id}`);
      fetchComments();
      setEditCommentId(null);
      setComment("")
    } catch (err) {
      console.error("Ошибка при удалении", err);
    }
  };
  const handleSend = () => {
    if (comment.trim() === "") return;

    if (editCommentId) {
      // редактируем существующий комментарий
      api
          .put(`/comments/${editCommentId}`, {
            comment: comment.trim(),
            request_id: selectedTaskDetails.id,
          })
          .then(() => {
            fetchComments();
            setComment("");
            setEditCommentId(null);
          })
          .catch((err) => console.error("Ошибка при обновлении", err));
    } else {
      api
          .post(`/comments`, {
            comment: comment.trim(),
            request_id: selectedTaskDetails.id,
          })
          .then(() => {
            fetchComments();
            setComment("");
          })
          .catch((err) => console.error("Ошибка при добавлении", err));
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
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/service-categories')
      setServiceCategories(response.data)
      if (response.data.length > 0) {
        setSelectedCategoryId(response.data[0].id)
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifications/me")
      setNotifications(response.data.notifications)
    } catch (error) {
      console.error("Ошибка при загрузке уведомлений", error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = async (notification:any) => {
    if (!notification.is_read) {
      try {
        const response = await api.patch(`/notifications/${notification.id}/read`)
        const updated = response.data

        setNotifications((prev:any) =>
            prev.map((n:any) => (n.id === updated.id ? { ...n, is_read: true } : n))
        )
      } catch (error) {
        console.error("Ошибка при пометке уведомления как прочитано", error)
      }
    }

    setSelectedNotification(notification)
    setIsModalOpen(true)
  }

  const getBgColor = (title:any) => {
    if (title.includes("принята")) return "bg-blue-50"
    if (title.includes("завершена")) return "bg-green-50"
    if (title.includes("просрочена")) return "bg-red-50"
    return "bg-gray-100"
  }

  const formatTimeAgo = (dateStr:any) => {
    const date = new Date(dateStr)
    const diff = (Date.now() - date.getTime()) / 1000
    if (diff < 60) return "только что"
    if (diff < 3600) return `${Math.floor(diff / 60)} минут назад`
    if (diff < 86400) return `${Math.floor(diff / 3600)} часов назад`
    return `${Math.floor(diff / 86400)} дней назад`
  }

  const filteredRequests = requests.filter((request) => {
    const statusMatch = filterStatus === "all" || request.status === filterStatus
    const requestType = request.request_type
    const typeMatch = filterType === "all" || requestType === filterType
    const officeMatch = office === "all" || office == String(request.office_id)
    return statusMatch && typeMatch && officeMatch
  })

  const completedRequests = requests.filter((request) => {
    if (office === "all") return request.status === "completed"
    if (office == String(request.office_id)) return request.status === "completed"
  })

  const urgentRequests = requests.filter((request) => {
    if (office === "all") return request.request_type === "urgent"
    if (office == String(request.office_id)) return request.request_type === "urgent"
  })

  const normalRequests = requests.filter((request) => {
    if(office === "all") return request.request_type === "normal"
    if (office == String(request.office_id)) return request.request_type === "normal"
  })

  const planningRequests = requests.filter((request) => {
    if (office === "all") return request.request_type === "planned"
    if (office == String(request.office_id)) return request.request_type === "planned"
  })

  const kpi = {
    total: filteredRequests.length,
    completed: completedRequests.length,
    overdue: 8,
    emergency: urgentRequests.length,
  }

  const officeStats = [
    { name: "Тимирязева 2Г", total: 89, completed: 82, overdue: 5, rating: 4.8, sla: 94 },
    { name: "Алимжанова 51", total: 67, completed: 60, overdue: 3, rating: 4.6, sla: 91 },
  ]

  const topExecutors = [
    { name: "Петров А.И.", done: 28, rating: 4.9, specialty: "Сантехник" },
    { name: "Иванов И.И.", done: 25, rating: 4.8, specialty: "Электрик" },
    { name: "Сидоров В.П.", done: 22, rating: 4.7, specialty: "Универсал" },
  ]

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
    const city = newOfficeName.trim()
    const address = newOfficeName.trim()
    const name = newOfficeName.trim()

    try {
      const response = await api.post("/offices/", {
        city: city,
        address: address,
        name: name
      })
      console.log(response.data)
      setOffices((prev) => [...prev, {name, city, address}])
      setNewOfficeName("")
      setNewOfficeAddress("")
      setNewOfficeCity("")
    } catch (err) {
      console.log("Error create office, ", err)
    }
  }

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
        return <Calendar className="w-3 h-3" />
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
          setShowProfile={setShowProfile}
          handleLogout={handleLogout}
          notificationCount={notifications.length}
          role="Руководитель"
      />
      <UserProfile open={showProfile} onClose={() => setShowProfile(false)} />

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
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-center min-w-[150px] h-10 px-4"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>

            <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-center min-w-[150px] h-10 px-4"
            >
              <Download className="w-4 h-4 mr-2" />
              Power BI
            </Button>

            <Button
                onClick={() => {
                  setNewRequestType("Обычная")
                  setShowCreateRequestModal(true)
                  handleOpenCreateRequest()
                }}
                className="flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white min-w-[150px] h-10 px-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать заявку
            </Button>
          </div>
        </div>

        {/* KPI Cards - Mobile optimized grid */}
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

        {/* Mobile-optimized Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="requests" className="text-xs sm:text-sm">
              Заявки
            </TabsTrigger>
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Обзор
            </TabsTrigger>
            <TabsTrigger value="management" className="text-xs sm:text-sm">
              Управление
            </TabsTrigger>
          </TabsList>

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
                    <SelectItem value="execution">Исполнение</SelectItem>
                    <SelectItem value="completed">Завершено</SelectItem>
                    <SelectItem value="awaiting_assignment">Ожидает назначение</SelectItem>
                    <SelectItem value="assigned">Назначен</SelectItem>
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
                          className="hover:shadow-xl hover:shadow-purple-400/20 transition-all duration-300 border-0 shadow-lg bg-white relative overflow-hidden cursor-pointer"
                          onClick={() => setSelectedTaskDetails(request)}
                      >
                        {/* Заголовок с ID и статусами */}
                        <CardHeader className="pb-3 px-5 pt-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2">{request.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                #{request.id}
              </span>
                                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                {request.category.name}
              </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Badge
                                  variant="outline"
                                  className={`text-xs px-2 py-1 flex items-center gap-1 font-medium border-0 shadow-sm ${getStatusColor(request.status)}`}
                              >
                                {getStatusIcon(request.status)}
                                {translateStatus(request.status)}
                              </Badge>
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
                              <Calendar className="w-4 h-4 flex-shrink-0 text-purple-500" />
                              <span className="truncate font-medium">{formatDate(request.created_date)}</span>
                            </div>

                            {request.executor && request.executor.user.full_name ? (
                                <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                                  <User className="w-4 h-4 flex-shrink-0 text-purple-500" />
                                  <span className="truncate font-medium">{request.executor.user.full_name}</span>
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

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">

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
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${normalRequests.length * 100/requests.length}%` }}></div>
                      </div>
                      <span className="text-sm font-medium w-8">{normalRequests.length}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Экстренные</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-600 h-2 rounded-full" style={{ width: `${urgentRequests.length * 100/requests.length}%` }}></div>
                      </div>
                      <span className="text-sm font-medium w-8">{urgentRequests.length}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Плановые</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${planningRequests.length * 100/requests.length}%` }}></div>
                      </div>
                      <span className="text-sm font-medium w-8">{planningRequests.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Уведомления</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                    <p>Загрузка...</p>
                ) : (
                    <div className="space-y-3">
                      {notifications.length > 0?
                      notifications
                              .slice(0, 5)
                              .map((n: any) => (
                              <div
                              key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 rounded-lg cursor-pointer transition hover:scale-[1.01] ${getBgColor(
                                n.title
                            )} ${n.is_read ? "opacity-70" : "opacity-100 border border-blue-300"}`}
                          >
                            <div className="flex justify-between">
                              <p className="text-sm font-medium">{n.title}</p>
                              {!n.is_read && <span className="text-blue-500 text-xs">Новое</span>}
                            </div>
                            <p className="text-xs text-gray-600">{formatTimeAgo(n.created_at)}</p>
                          </div>
                      )): <p className="text-sm text-gray-500">Нет уведомлений</p>}

                    </div>
                )}
              </CardContent>
            </Card>

            {/* Модалка */}
            {isModalOpen && selectedNotification && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold">{selectedNotification.title}</h2>
                      <button
                          className="text-gray-500 hover:text-black"
                          onClick={() => setIsModalOpen(false)}
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
          </TabsContent>

          {/* Management Tab Content for Manager */}
          <TabsContent value="management">
            <div className="space-y-6">
              {/* Office Management Card (Moved here) */}
              <Card>
                <CardHeader>
                  <CardTitle>Управление офисами</CardTitle>
                  <CardDescription>Добавление и управление офисами компании</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                        placeholder="Город нового офиса (например: Алматы)"
                        value={newOfficeCity}
                        onChange={(e) => setNewOfficeCity(e.target.value)}
                        className="w-full sm:flex-1"
                    />
                    <Input
                        placeholder="Расположение нового офиса (например: Сатпаева 30А)"
                        value={newOfficeAddress}
                        onChange={(e) => setNewOfficeAddress(e.target.value)}
                        className="w-full sm:flex-1"
                    />
                    <Input
                        placeholder="Название нового офиса (например: БЦ Сатпаева)"
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
                          {offices.map((officeItem: any) => (
                              <div
                                  key={officeItem.id}
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
                                            variant="ghost"
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
                                          ✏️
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setOfficeToDelete(officeItem)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Удалить офис?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Это действие нельзя отменить. Удалить офис{" "}
                                                <strong>{officeToDelete?.name}</strong>?
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                                              <AlertDialogAction
                                                  onClick={() => {
                                                    if (officeToDelete) {
                                                      handleRemoveOffice(officeToDelete.id);
                                                      setOfficeToDelete(null);
                                                    }
                                                  }}
                                              >
                                                Удалить
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
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
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
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
                    <Select
                        value={newUser.office_id}
                        onValueChange={(val) => setNewUser({ ...newUser, office_id: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Офис" />
                      </SelectTrigger>
                      <SelectContent>
                        {offices.map((office: any) => (
                            <SelectItem key={office.id} value={office.id}>
                              {office.name}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                        value={newUser.role}
                        onValueChange={(val) => setNewUser({ ...newUser, role: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Роль" />
                      </SelectTrigger>
                      <SelectContent>
                        {["client", "admin-worker", "department-head", "manager"].map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                      onClick={handleAddOrUpdateUser}
                      disabled={!isValidUser || loading}
                      className="bg-green-600 hover:bg-green-700"
                  >
                    {editingUserId ? "Сохранить" : "Добавить пользователя"}
                  </Button>

                  <div className="space-y-2 mt-4">
                    <Label>Пользователи ({users.length}):</Label>
                    {users.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Нет пользователей.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {users.map((user: any, index: number) => (
                              <div
                                  key={index}
                                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border"
                              >
                                <div>
                                  <div className="font-semibold text-gray-800">{user.full_name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                  <div className="text-xs text-gray-400">
                                    {user.role} — {user.full_name}
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditUser(user)}
                                  >
                                    ✎
                                  </Button>
                                  <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-500 hover:text-red-700"
                                      onClick={() => handleDeleteUser(user.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                          ))}
                        </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Request Modal */}
      {showCreateRequestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=> {
            setShowCreateRequestModal(false)
            setComments([])
          }}>
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Создать заявку</CardTitle>
                <CardDescription>Заполните форму для подачи новой заявки</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      <SelectItem value="regular">Обычная</SelectItem>
                      <SelectItem value="urgent">Экстренная</SelectItem>
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
                      {serviceCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                  <Button variant="outline" onClick={() => setShowCreateRequestModal(false)} className="flex-1">
                    Отмена
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
      )}

      {/* Task Details Modal */}
      {selectedTaskDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=> {
            setSelectedTaskDetails(null)
            setComments([])
          }}>
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Детали заявки #{selectedTaskDetails.id}</CardTitle>
                <CardDescription>{selectedTaskDetails.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <p className="text-base text-gray-800">{selectedTaskDetails.client.full_name}</p>
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
                                              onClick={() => setSelectedPhoto(photo.photo_url)}
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
                                              onClick={() => setSelectedPhoto(photo.photo_url)}
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
                              onClick={() => setSelectedPhoto(null)}
                          >
                            <img
                                src={selectedPhoto}
                                alt="Увеличенное фото"
                                className="max-w-full max-h-full rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                      )}

                      {/* Секция для комментариев */}
                      <Card className="mt-2">
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2 text-gray-800">Комментарии</h4>
                          {comments.map((c: any) => (
                              <div key={c.id} className="bg-white border border-gray-200 rounded-md p-3 shadow-sm m-2">
                                <div className="flex justify-between items-center">
                                  <div className="text-sm text-gray-800 font-medium">
                                    {c.user.full_name || "Неизвестный пользователь"}{" "}
                                    {c.user.role && (<span className="text-xs text-gray-500">({roleTranslations[c.user.role] || c.user.role})</span>
                                    )}
                                  </div>


                                  <div className="text-xs text-gray-400">{new Date(c.timestamp).toLocaleString()}</div>
                                </div>
                                <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">{c.comment}</div>
                                {c.user.id === currentUserId && (
                                    <div className="mt-2 flex gap-2 text-xs text-blue-500">
                                      <button
                                          onClick={() => handleEdit(c.id, c.comment)}
                                          className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 transition text-gray-700"
                                      >
                                        Изменить
                                      </button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <button
                                              onClick={() => setCommentToDelete(c)}
                                              className="px-2 py-1 rounded border border-gray-300 hover:bg-red-100 transition text-red-600"
                                          >
                                            Удалить
                                          </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Это действие нельзя отменить. Вы уверены, что хотите удалить{" "}
                                              <strong>{commentToDelete?.comment}</strong>?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                  if (commentToDelete) {
                                                    handleDelete(commentToDelete.id);
                                                    setCommentToDelete(null);
                                                  }
                                                }}
                                            >
                                              Удалить
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                )}

                              </div>
                          ))}
                          <div className="mt-3 flex flex-col space-y-1">
                            {editCommentId && (
                                <div className="text-xs text-gray-500 mb-1">
                                  Редактируется комментарий #{editCommentId}
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
                            <div className="flex flex-col sm:flex-row items-stretch gap-2">
                              <input
                                  type="text"
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  placeholder="Написать комментарий..."
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <Button
                                  size="sm"
                                  onClick={handleSend}
                                  className="w-full sm:w-auto"
                              >
                                {editCommentId ? "Сохранить" : "Отправить"}
                              </Button>
                            </div>

                          </div>

                        </CardContent>
                      </Card>
                    </div>
                )}
                <div className="flex justify-end sm:justify-start mt-6">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                          variant="destructive"
                          className="w-full sm:w-auto flex justify-center items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Удалить
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие необратимо. Вы точно хотите удалить заявку{" "}
                          <strong>{selectedTaskDetails?.title}</strong>?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            className="w-full sm:w-auto"
                            onClick={() => {
                              if (selectedTaskDetails) {
                                handleDeleteRequest(selectedTaskDetails);
                                setSelectedTaskDetails(null);
                              }
                            }}
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button variant="outline" onClick={() => {
                    setSelectedTaskDetails(null)
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
              onClick={() => setShowMapModal(false)}
          >
            <Card
                className="w-full max-w-4xl h-[90vh] max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle>Локация заявки</CardTitle>
                <CardDescription>Точное местоположение проблемы</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <MapView
                    lat={mapLocation.lat}
                    lon={mapLocation.lon}
                    accuracy={mapLocation.accuracy}
                />
              </CardContent>
              <div className="p-4 flex justify-end border-t">
                <Button onClick={() => setShowMapModal(false)}>
                  Закрыть
                </Button>
              </div>
            </Card>
          </div>
      )}

      {/* Delete Request Confirmation Modal */}
      {showDeleteRequestModal && requestToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Удалить заявку #{requestToDelete.id}?</CardTitle>
                <CardDescription>
                  Вы уверены, что хотите удалить заявку "{requestToDelete.title}"? Это действие необратимо.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deleteReason">Причина удаления</Label>
                  <Textarea
                      id="deleteReason"
                      placeholder="Укажите причину удаления заявки..."
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="min-h-[80px]"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteRequestModal(false)
                        setRequestToDelete(null)
                        setDeleteReason("")
                      }}
                  >
                    Отмена
                  </Button>
                  <Button variant="destructive" onClick={confirmDeleteRequest} disabled={!deleteReason.trim()}>
                    Удалить
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
      )}
    </div>
  )
}
