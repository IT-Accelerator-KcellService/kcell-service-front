"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Camera,
  Bell,
  User,
  LogOut,
  Filter,
  MessageCircle,
  Star,
  Plus,
  MapPin,
  Calendar, Loader2, ImageIcon, Zap, XCircle, AlertCircle,
} from "lucide-react"
import Header from "@/app/header/Header";
import UserProfile from "@/app/client/UserProfile";
import axios from "axios";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

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


interface Category {
  id: number;
  name: string;
}

interface Photo {
  id: number;
  request_id: number;
  photo_url: string;
  type: string;
}

export interface Request {
  executor_id: any;
  actual_completion_date: any;
  sla: React.JSX.Element;
  date_submitted: string;
  category: Category;
  office: any;
  complexity: string;
  id: number;
  title: string;
  description: string;
  status: string;
  request_type: string;
  location: string;
  location_detail: string;
  created_date: string;
  executor: {user: { full_name: any } };
  rating?: number;
  category_id?: number;
  photos?: Photo[];
  office_id: number;
}

interface Comment {
  id: number,
  request_id: number,
  sender_id: number,
  comment: string,
  timestamp: Date
}

export default function ExecutorDashboard() {
  const [assignedRequests, setAssignedRequests] = useState<any>([])
  const [myRequests, setMyRequests] = useState<Request[]>([])
  const [completedRequests, setCompletedRequests] = useState<any>([])
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 });
  const [showMapModal, setShowMapModal] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks")
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<any>(null)
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [newRequestType, setNewRequestType] = useState("")
  const [newRequestTitle, setNewRequestTitle] = useState("")
  const [newRequestLocation, setNewRequestLocation] = useState("")
  const [serviceCategories, setServiceCategories] = useState<{id: number, name: string}[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [requestLocation, setRequestLocation] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [completedRequestComment, setCompletedRequestComment] = useState("");
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [newRequestOfficeId, setNewRequestOfficeId] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editCommentId, setEditCommentId] = useState<number | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null)
  const [myRating, setMyRating] = useState<number | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/users/me");
        const user = response.data;

        if (!user || user.role !== "executor") {
          window.location.href = "/login";
        } else {
          setIsLoggedIn(true);
          setCurrentUserId(user.id);
          setNewRequestOfficeId(String(user.office_id));
        }
      } catch (error) {
        console.error("Ошибка при проверке авторизации", error);
        window.location.href = "/login";
      }
    };

    checkAuth();
  }, []);

  const filteredRequests = myRequests.filter((request:any) => {
    const statusMatch = filterStatus === "all" || request.status === filterStatus
    const requestType = request.request_type
    const typeMatch = filterType === "all" || requestType === filterType
    return statusMatch && typeMatch
  })


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
    setComment(oldComment);
    setEditCommentId(id);
  };

  useEffect(() => {
    if (selectedTaskDetails?.id) {
      fetchComments();
    }
  }, [selectedTaskDetails]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchCategories()
      fetchNotifications()
      fetchRequests()
    }
  }, [isLoggedIn])

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

  const handleCreateRequest = async () => {
    if (
        !newRequestTitle ||
        !description ||
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
          return;
        }
      }
      const newRequest = {
        ...response.data,
        photos: createdPhotos?.data?.photos,
      }
      setMyRequests(prev => [newRequest, ...prev])
      setShowCreateRequestModal(false)
      setNewRequestType("")
      setNewRequestTitle("")
      setRequestLocation("")
      setNewRequestLocation("")
      setDescription("")
    } catch (error) {
      console.error("Failed to create request:", error)
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

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifications/me")
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error("Ошибка при загрузке уведомлений", error)
    } finally {
      setLoading(false)
    }
  }


  const handleNotificationClick = async (notification:any) => {
    if (!notification.is_read) {
      try {
        setNotifications((prev:any) =>
            prev.map((n:any) => (n.id === notification.id ? { ...n, is_read: true } : n))
        )
        await api.patch(`/notifications/${notification.id}/read`)
      } catch (error) {
        setNotifications((prev:any) =>
            prev.map((n:any) => (n.id === notification.id ? { ...n, is_read: false } : n))
        )
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

  const fetchRequests = async () => {
    try {
      const response = await api.get('requests/executor/me')
      const responseRating = await api.get('ratings/executor')
      const responseMyRating = await api.get('executors/average-rating')
      setMyRating(responseMyRating.data.average_rating)
      const ratingsMap = new Map<number, number>()
      for (const r of responseRating.data) {
        ratingsMap.set(r.request_id, parseFloat(r.rating))
      }

      const completed = response.data.completedRequests.map((req: Request) => ({
        ...req,
        rating: ratingsMap.get(req.id) || null,
      }))

      setCompletedRequests(completed)
      setAssignedRequests(response.data.assignedRequests);
      setMyRequests(response.data.myRequests);

    } catch (error) {
      console.error("Failed to fetch requests:", error)
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
      case "urgent": return "Экстренная"
      case "normal": return "Обычная"
      case "planned": return "Плановая"
      default: return type
    }
  }
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

  const getTaskTypeOrder = (type: string) => {
    switch (type) {
      case "urgent":
        return 1
      case "normal":
        return 2
      case "planned":
        return 3
      default:
        return 99
    }
  }

  const handleStartTask = async (taskId: string) => {
    await api.patch(`/requests/${taskId}/execute`)
    setAssignedRequests((prevTasks: any) =>
        prevTasks.map((task: any) => (task.id === taskId ? {...task, status: "execution"} : task)),
    )
    console.log("Starting task:", taskId)
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      // 1. PATCH для завершения задачи
      const response = await api.patch(`/requests/${taskId}/complete`, {
        comment: completedRequestComment
      });

      // 2. Если есть фото, загружаем их
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((photo) => {
          formData.append('photos', photo);
        });
        formData.append('type', 'before');

        try {
          await axios.post(`${API_BASE_URL}/request-photos/${response.data.id}/photos`, formData, {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
        } catch (photoUploadError) {
          await api.delete(`/requests/${response.data.id}`);
          alert("Ошибка при загрузке фото. Заявка не была создана.");
          return;
        }
      }

      // 3. Переносим задачу в список завершённых
      setAssignedRequests((prevTasks: any) => {
        const taskToComplete = prevTasks.find((task: any) => task.id === taskId);
        if (taskToComplete) {
          setCompletedRequests((prevCompleted: any) => [
            {
              ...taskToComplete,
              status: "completed",
              completedDate: new Date().toISOString(),
              rating: 0,
              plannedDate: null
            },
            ...prevCompleted,
          ]);
          return prevTasks.filter((task: any) => task.id !== taskId);
        }
        return prevTasks;
      });

      // 4. Сбрасываем состояние
      fetchRequests()
      setSelectedTask(null);
      setPhotos([]);
      setPhotoPreviews([]);
      setCompletedRequestComment("");
      console.log("Задача успешно завершена:", taskId);
    } catch (error) {
      console.error("Ошибка при завершении задачи", error);
      alert("Ошибка при завершении задачи.");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
      setIsLoggedIn(false)
      localStorage.removeItem('token')
      window.location.href = "/login"
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

  const getComplexityColor = (complexity: "simple" | "medium" | "complex" | undefined) => {
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
          role="Исполнитель"
      />
      <UserProfile open={showProfile} onClose={() => setShowProfile(false)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Экстренные</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {[...assignedRequests, ...myRequests].filter(req => req.request_type === "urgent").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">В работе</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assignedRequests?.filter((r:any) => r.status === "execution").length}
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
                    {completedRequests?.length}
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
                  <p className="text-sm font-medium text-gray-600">Рейтинг</p>
                  <p className="text-2xl font-bold text-gray-900">{myRating}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex justify-between items-center mb-6">
                <TabsList>
                  <TabsTrigger value="tasks">Мои задачи</TabsTrigger>
                  <TabsTrigger value="myTasks">Мой заявки</TabsTrigger>
                  <TabsTrigger value="completed">Завершенные</TabsTrigger>
                  <TabsTrigger value="statistics">Статистика</TabsTrigger>
                </TabsList>
                <Button
                  onClick={() => {
                    setNewRequestType("normal")
                    setShowCreateRequestModal(true)
                    handleOpenCreateRequest()
                  }}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать заявку
                </Button>
              </div>

              <TabsContent value="tasks">
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
                        <SelectItem value="planed">Плановая</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assignedRequests
                        ?.filter((task: any) => {
                            const statusOk = filterStatus === "all" || task.status === filterStatus;
                            const typeOk = filterType === "all" || task.request_type === filterType;
                            return statusOk && typeOk;
                        })
                        ?.sort((a: any, b: any) => {
                          const typeOrderA = getTaskTypeOrder(a.type)
                          const typeOrderB = getTaskTypeOrder(b.type)

                          return typeOrderA - typeOrderB
                        }).map((request:any, index: number) => (
                        <Card key={index} className="hover:shadow-xl hover:shadow-purple-400/20 transition-all duration-300 border-0 shadow-lg bg-white relative overflow-hidden cursor-pointer"
                              onClick={() => setSelectedTaskDetails(request)}>
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
                                    {request.photos.slice(0, 4).map((photo:any, index:number) => (
                                        <div key={index} className="flex-shrink-0">
                                          <img
                                              src={photo.photo_url || "/placeholder.svg"}
                                              alt={`Фото ${index + 1}`}
                                              className="w-12 h-12 rounded-lg object-cover border-2 border-purple-200 shadow-sm"
                                              onError={(e) => {
                                                e.currentTarget.src = `/placeholder.svg?height=48&width=48`
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

                              <div>
                                {request.status === "assigned" && (
                                    <Button
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleStartTask(request.id)
                                        }}
                                    >
                                      Начать
                                    </Button>
                                )}
                                {request.status === "execution" && (
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedTask(request)
                                        }}
                                    >
                                      Завершить
                                    </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="completed">
                <div className="space-y-4">
                    <div className="flex items-center space-x-4 mb-4">
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Тип заявки" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все</SelectItem>
                                <SelectItem value="normal">Обычная</SelectItem>
                                <SelectItem value="urgent">Экстренная</SelectItem>
                                <SelectItem value="planed">Плановая</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {completedRequests
                        ?.filter((task: any) => {
                            if (filterType === "all") return true;
                            return task.request_type === filterType;
                        })
                        .map((request:any, index: number) => (
                        <Card key={index} className="hover:shadow-xl hover:shadow-purple-400/20 transition-all duration-300 border-0 shadow-lg bg-white relative overflow-hidden cursor-pointer"
                              onClick={() => setSelectedTaskDetails(request)}>
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

                              { request.executor && request.executor.user.full_name ? (
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
                                    {request.photos.slice(0, 4).map((photo:any, index:number) => (
                                        <div key={index} className="flex-shrink-0">
                                          <img
                                              src={photo.photo_url || "/placeholder.svg"}
                                              alt={`Фото ${index + 1}`}
                                              className="w-12 h-12 rounded-lg object-cover border-2 border-purple-200 shadow-sm"
                                              onError={(e) => {
                                                e.currentTarget.src = `/placeholder.svg?height=48&width=48`
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
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="myTasks">
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
                    {filteredRequests.map((request:any, index: number) => (
                        <Card key={index} className="hover:shadow-xl hover:shadow-purple-400/20 transition-all duration-300 border-0 shadow-lg bg-white relative overflow-hidden cursor-pointer"
                              onClick={() => setSelectedTaskDetails(request)}>
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
                                    {request.photos.slice(0, 4).map((photo:any, index: any) => (
                                        <div key={index} className="flex-shrink-0">
                                          <img
                                              src={photo.photo_url || "/placeholder.svg"}
                                              alt={`Фото ${index + 1}`}
                                              className="w-12 h-12 rounded-lg object-cover border-2 border-purple-200 shadow-sm"
                                              onError={(e) => {
                                                e.currentTarget.src = `/placeholder.svg?height=48&width=48`
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
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="statistics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Моя статистика</CardTitle>
                      <CardDescription>Показатели за последние 30 дней</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Всего выполнено задач</span>
                          <span className="font-bold">28</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Выполнено в срок</span>
                          <span className="font-bold text-green-600">26</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Просрочено</span>
                          <span className="font-bold text-red-600">2</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Средняя оценка</span>
                          <span className="font-bold">{myRating}/5</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Среднее время выполнения</span>
                          <span className="font-bold">1.8 часа</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Рейтинг и достижения</CardTitle>
                      <CardDescription>Ваш текущий статус</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Star className="w-10 h-10 text-yellow-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Золотой исполнитель</h3>
                        <p className="text-sm text-gray-600">Рейтинг: {myRating}/5</p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                          <span className="text-sm">Быстрое выполнение</span>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                          <span className="text-sm">Качественная работа</span>
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                          <span className="text-sm">Надежный партнер</span>
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Сегодняшний план</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Экстренная задача</p>
                      <p className="text-xs text-gray-600">До 14:00</p>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Замена лампочек</p>
                      <p className="text-xs text-gray-600">До 17:00</p>
                    </div>
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">ТО кондиционеров</p>
                      <p className="text-xs text-gray-600">Завтра</p>
                    </div>
                    <Calendar className="w-5 h-5 text-green-600" />
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
                      {notifications?.slice(0, 5)
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
                          ))}
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

          </div>
        </div>
      </div>

      {/* Complete Task Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Завершение задачи #{selectedTask.id}</CardTitle>
              <CardDescription>Подтвердите выполнение работы</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">{selectedTask.title}</h3>
                <p className="text-sm text-gray-600">{selectedTask.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Комментарий к выполненной работе</label>
                <Textarea
                    placeholder="Опишите выполненную работу..."
                    className="min-h-[100px]"
                    value={completedRequestComment}
                    onChange={(e) => setCompletedRequestComment(e.target.value)}
                    required={true}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Фотографии результата (до 3 шт.)</label>
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

              <div className="flex space-x-4">
                <Button
                  onClick={() => {
                    handleCompleteTask(selectedTask.id)
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Завершить задачу
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTask(null)
                    setPhotos([])
                    setPhotoPreviews([])
                    setCompletedRequestComment("")
                  }}
                  className="flex-1"
                >
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Request Modal */}
      {showCreateRequestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={()=> {
            setShowCreateRequestModal(false)
            setCompletedRequestComment("")
            setComments([])
          }}>
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Создать заявку</CardTitle>
                <CardDescription>Заполните форму для подачи новой заявки</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"  onClick={()=> {
            setSelectedTaskDetails(null)
            setComments([])
          }}>
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Детали заявки #{selectedTaskDetails.id}</CardTitle>
                <CardDescription>{selectedTaskDetails.title}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Основная информация */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Тип:</p>
                    <Badge className={getTypeColor(selectedTaskDetails.request_type)}>
                      {translateType(selectedTaskDetails.request_type)}
                    </Badge>
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
                        <p className="text-base text-gray-800">
                          {selectedTaskDetails.complexity === 'simple' && 'Простая'}
                          {selectedTaskDetails.complexity === 'medium' && 'Средняя'}
                          {selectedTaskDetails.complexity === 'complex' && 'Сложная'}
                        </p>
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

                {/* Описание */}
                <div>
                  <p className="text-sm font-medium text-gray-600">Описание:</p>
                  <p className="text-base text-gray-800">{selectedTaskDetails.description}</p>
                </div>

                {/* Фото + Комментарии */}
                {selectedTaskDetails.photos?.length > 0 && (
                    <div className="space-y-4">
                      {/* Фото */}
                      <div>
                        <Label className="block text-sm font-medium text-gray-700">Фотографии</Label>
                        <div className="flex flex-wrap gap-3 mt-2">
                          {selectedTaskDetails.photos.map((photo: any, index: number) => (
                              <img
                                  key={index}
                                  src={photo.photo_url || "/placeholder.svg"}
                                  alt={`Photo ${index + 1}`}
                                  className="w-24 h-24 object-cover rounded-lg cursor-pointer border border-gray-300 shadow-sm"
                                  onClick={() => setSelectedPhoto(photo.photo_url)}
                              />
                          ))}
                        </div>
                      </div>

                      {/* Модалка фото */}
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

                      {/* Комментарии */}
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
                            <div className="flex items-center space-x-2">
                              <input
                                  type="text"
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  placeholder="Написать комментарий..."
                                  className="flex-grow p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <Button size="sm" onClick={handleSend}>
                                {editCommentId ? "Сохранить" : "Отправить"}
                              </Button>
                            </div>
                          </div>

                        </CardContent>
                      </Card>
                    </div>
                )}
                <div className="flex space-x-4 m-4">
                  {/* Закрыть */}
                    <Button className="flex-1" variant="outline" onClick={() => setSelectedTaskDetails(null)}>Закрыть</Button>
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
    </div>
  )
}
