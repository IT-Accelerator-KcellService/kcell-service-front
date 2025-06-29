"use client"

import type React from "react"
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
  MapPin, Filter,
} from "lucide-react"
import axios from "axios";
import Header from "@/app/header/Header";
import UserProfile from "@/app/client/UserProfile";
import dynamic from "next/dynamic";
import {Request} from "@/app/client/page";
import api from "@/lib/api";

const API_BASE_URL = 'https://kcell-service.onrender.com/api';

const MapView = dynamic(() => import('@/app/map/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">Загрузка карты...</div>
})

export default function ManagerDashboard() {
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


  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/users/me");
        const user = response.data;

        if (!user || user.role !== "manager") {
          window.location.href = '/login';
        } else {
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error("Ошибка при проверке авторизации", error);
        window.location.href = '/login'
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchCategories()
      fetchRequests()
      fetchNotifications()
      fetchOffices()
    }
  }, [isLoggedIn])

  const fetchRequests = async () => {
    try {
      const response = await api.get('/requests')
      setRequests(response.data)
    } catch (error) {
      console.error("Failed to fetch requests:", error)
    }
  }

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

  const handleCreateRequest = async () => {
    if (!selectedCategoryId) {
      alert("Пожалуйста, выберите категорию услуги")
      return
    }

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

      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((photo) => {
          formData.append('photos', photo);
        });
        formData.append('type', 'before');

        try {

          await axios.post(`${API_BASE_URL}/request-photos/${requestId}/photos`, formData, {
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
      fetchRequests()
      setShowCreateRequestModal(false)
      setNewRequestType("")
      setNewRequestTitle("")
      setRequestLocation("")
      setNewRequestLocation("")
      setDescription("")
    } catch (error) {
      console.error("Failed to create request:", error)
      alert("Не удалось создать заявку. Пожалуйста, попробуйте еще раз.")
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
    if (!confirm("Удалить комментарий?")) return;
    try {
      await api.delete(`/comments/${id}`);
      fetchComments();
    } catch (err) {
      console.error("Ошибка при удалении", err);
    }
  };

  const handleEdit = (id: number, oldComment: string) => {
    const newComment = prompt("Изменить комментарий:", oldComment);
    if (newComment && newComment.trim()) {
      api.put(`/comments/${id}`, {
        comment: newComment.trim(),
        request_id: selectedTaskDetails.id,
      })
          .then(() => fetchComments())
          .catch((err) => console.error("Ошибка при обновлении", err));
    }
  };

  useEffect(() => {
    if (selectedTaskDetails?.id) {
      fetchComments();
    }
  }, [selectedTaskDetails]);

  const handleSend = async () => {
    if (!comment.trim()) return;

    try {
      await api.post(
          `/comments`,
          {
            request_id: selectedTaskDetails.id,
            comment,
          }
      );
      setComment("");
      fetchComments();
    } catch (err) {
      console.error("Ошибка при отправке комментария", err);
    }
  };

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
      setNotifications(response.data)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
      case "Черновик":
        return "bg-gray-500"
      case "in_progress":
      case "В обработке":
        return "bg-blue-500"
      case "in_execution":
      case "Исполнение":
        return "bg-orange-500"
      case "completed":
      case "Завершено":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
          setShowProfile={setShowProfile}
          handleLogout={handleLogout}
          notificationCount={notifications.length}
          role="Клиент"
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

          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Power BI
            </Button>
            <Button
              onClick={() => {
                setNewRequestType("Обычная")
                setShowCreateRequestModal(true)
                handleOpenCreateRequest()
              }}
              className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto"
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
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Фильтр
                </Button>
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
                    <SelectItem value="planed">Плановая</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredRequests.map((request) => (
                  <Card
                      key={request.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedTaskDetails(request)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getTypeColor(request.request_type)}>{translateType(request.request_type)}</Badge>
                            <Badge variant="outline" className={getStatusColor(request.status)}>
                              {translateStatus(request.status)}
                            </Badge>
                            <span className="text-sm text-gray-500">#{request.id}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
                          <div className="flex items-center text-sm text-gray-600 space-x-4">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              Локация: {request.location_detail}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />Время:
                              {new Date(request.created_date).toLocaleString("ru-RU", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              ))}
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
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Город нового офиса (например: Алматы)"
                      value={newOfficeCity}
                      onChange={(e) => setNewOfficeCity(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                        placeholder="Разположение нового офиса (например: Сатпаева 30А)"
                        value={newOfficeAddress}
                        onChange={(e) => setNewOfficeAddress(e.target.value)}
                        className="flex-1"
                    />
                    <Input
                        placeholder="Название нового офиса (например: БЦ Сатпаева)"
                        value={newOfficeName}
                        onChange={(e) => setNewOfficeName(e.target.value)}
                        className="flex-1"
                    />
                    <Button
                      onClick={handleAddOffice}
                      disabled={!newOfficeName.trim()}
                      className="bg-violet-600 hover:bg-violet-700"
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
                        {offices.map((officeItem:any, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border"
                          >
                            <span className="font-medium text-gray-700">{officeItem.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOffice(officeItem.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

                <div className="flex space-x-4">
                  <Button onClick={handleCreateRequest} className="flex-1 bg-violet-600 hover:bg-violet-700">
                    Отправить заявку
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                        <p className="text-base text-gray-800">{selectedTaskDetails.complexity}</p>
                      </div>
                  )}
                  {selectedTaskDetails.sla && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">SLA:</p>
                        <p className="text-base text-gray-800">{selectedTaskDetails.sla}</p>
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
                      {selectedTaskDetails.photos && selectedTaskDetails.photos.length > 0 && (
                          <div>
                            <Label>Фотографии</Label>
                            <div className="flex space-x-2 mt-2">
                              {selectedTaskDetails.photos.map((photo: any, index: number) => (
                                  <img
                                      key={index}
                                      src={photo.photo_url || "/placeholder.svg"}
                                      alt={`Photo ${index + 1}`}
                                      className="w-24 h-24 object-cover rounded-lg cursor-pointer"
                                      onClick={() => setSelectedPhoto(photo.photo_url)}
                                  />
                              ))}
                            </div>
                          </div>
                      )}

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
                              <div key={c.id} className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                                <div className="flex justify-between items-center">
                                  <div className="text-sm text-gray-800 font-medium">{c.user.full_name}</div>
                                  <div className="text-xs text-gray-400">{new Date(c.timestamp).toLocaleString()}</div>
                                </div>
                                <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">{c.comment}</div>
                                <div className="mt-2 flex gap-3 text-xs text-blue-500">
                                  <button onClick={() => handleEdit(c.id, c.comment)} className="hover:underline">
                                    ✏️ Изменить
                                  </button>
                                  <button onClick={() => handleDelete(c.id)} className="hover:underline text-red-500">
                                    🗑 Удалить
                                  </button>
                                </div>
                              </div>
                          ))}
                          <div className="mt-3 flex items-center space-x-2">
                            <input
                                type="text"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Написать комментарий..."
                                className="flex-grow p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <Button size="sm" onClick={handleSend}>
                              Отправить
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                )}
                <div className="flex justify-end mt-6">
                  <Button variant="outline" onClick={() => setSelectedTaskDetails(null)}>
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
    </div>
  )
}
