"use client"

import { useState, useRef, useEffect } from "react"
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
  Calendar,
} from "lucide-react"
import Header from "@/app/header/Header";
import UserProfile from "@/app/client/UserProfile";
import axios from "axios";
import {Request} from "@/app/client/page";
import dynamic from "next/dynamic";

const API_BASE_URL = "https://kcell-service.onrender.com/api"

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
})

const MapView = dynamic(() => import('@/app/map/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">Загрузка карты...</div>
})

export default function ExecutorDashboard() {
  const [assignedRequests, setAssignedRequests] = useState<any>([])
  const [myRequests, setMyRequests] = useState<any>([])
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
    if (!selectedCategoryId) {
      alert("Пожалуйста, выберите категорию услуги")
      return
    }

    try {
      const response = await api.post('/requests', {
        title: newRequestTitle,
        description: description,
        office_id: 1,
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
            withCredentials: true
          });

          console.log("Фотографии успешно загружены");
        } catch (photoUploadError) {
          await api.delete(`/requests/${requestId}`);
          console.error("Ошибка при загрузке фото. Заявка удалена.");
          alert("Ошибка при загрузке фото. Заявка не была создана.");
          return;
        }
      }
      setAssignedRequests((prev: any) => [response.data, ...prev])
      setShowCreateRequestModal(false)
      setNewRequestType("")
      setNewRequestTitle("")
      setRequestLocation("")
      setNewRequestLocation("")
      setDescription("")
      alert("Заявка успешно создана!")
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
      setCompletedRequests(response.data.completedRequests);
      setAssignedRequests(response.data.assignedRequests);
      setMyRequests(response.data.myRequests);

    } catch (error) {
      console.error("Failed to fetch requests:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-yellow-500"
      case "execution":
        return "bg-blue-500"
      case "planned":
        return "bg-purple-500"
      case "completed":
        return "bg-green-500"
      default:
        return "bg-gray-500"
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
    const response: any = await api.patch(`/requests/${taskId}/complete`, {
      comment: completedRequestComment
    })
    if (photos.length > 0) {
      const formData = new FormData();
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });
      formData.append('type', 'after');

      try {
        await axios.post(`${API_BASE_URL}/request-photos/${response.data.id}/photos`, formData, {
          withCredentials: true
        });

        console.log("Фотографии успешно загружены");
      } catch (photoUploadError) {
        await api.delete(`/requests/${response.data.id}`);
        console.error("Ошибка при загрузке фото. Заявка удалена.");
        alert("Ошибка при загрузке фото. Заявка не была создана.");
        return;
      }
    }
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

    setSelectedTask(null);
    setPhotos([]);
    console.log("Completing task:", taskId);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
      setIsLoggedIn(false)
      window.location.href = "/"
    } catch (error) {
      console.error("Logout failed:", error)
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
                  <p className="text-2xl font-bold text-gray-900">1</p>
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
                    {assignedRequests?.filter((r:any) => r.status === "В работе").length}
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
                  <p className="text-sm font-medium text-gray-600">Завершено сегодня</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {completedRequests?.filter((r:any) => r.completedDate === new Date().toISOString().slice(0, 10)).length}
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
                  <p className="text-2xl font-bold text-gray-900">4.8</p>
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
                  <TabsTrigger value="myTasks">Мои задачи</TabsTrigger>
                  <TabsTrigger value="completed">Завершенные</TabsTrigger>
                  <TabsTrigger value="statistics">Статистика</TabsTrigger>
                </TabsList>
                <Button
                  onClick={() => {
                    setNewRequestType("normal")
                    setShowCreateRequestModal(true)
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
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Фильтр
                    </Button>
                    <Badge variant="outline">Сортировка: По приоритету</Badge>
                  </div>

                  {assignedRequests
                    ?.sort((a: any, b: any) => {
                      const typeOrderA = getTaskTypeOrder(a.type)
                      const typeOrderB = getTaskTypeOrder(b.type)

                      return typeOrderA - typeOrderB
                    })
                    .map((task: any) => (
                      <Card
                        key={task.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedTaskDetails(task)}
                      >
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge className={getTypeColor(task.request_type)}>{task.request_type}</Badge>
                                <Badge variant="outline" className={getStatusColor(task.status)}>
                                  {task.status}
                                </Badge>
                                <span className="text-sm text-gray-500">#{task.id}</span>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">{task.title}</h3>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  {task.location_detail}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  Создано: {task.created_date}
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  SLA: {task.sla}
                                </div>
                                <p>Клиент: {task.client.full_name}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {task.status === "assigned" && (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStartTask(task.id)
                                  }}
                                >
                                  Начать
                                </Button>
                              )}
                              {task.status === "execution" && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedTask(task)
                                  }}
                                >
                                  Завершить
                                </Button>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-gray-700 mb-3">{task.description}</p>

                          {task.request_type === "urgent" && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-center">
                                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                                <span className="text-sm font-medium text-red-800">
                                  Экстренная задача! Требует немедленного выполнения
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                <div className="space-y-4">
                  {completedRequests?.map((task: any) => (
                    <Card
                      key={task.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedTaskDetails(task)}
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={getTypeColor(task.request_type)}>{task.request_type}</Badge>
                              <Badge variant="outline" className="bg-green-500">
                                Завершена
                              </Badge>
                              <span className="text-sm text-gray-500">#{task.id}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{task.title}</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>Локация: {task.location_detail}</p>
                              <p>Завершено: {task.completedDate}</p>
                              <p>Клиент: {task.client.full_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < task.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">{task.rating}/5</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="myTasks">
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

                  {filteredRequests.map((request: any) => (
                      <Card
                          key={request.id}
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setSelectedTaskDetails(request)}
                      >
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge className={getTypeColor(request.request_type)}>{request.request_type}</Badge>
                                <Badge variant="outline" className={getStatusColor(request.status)}>
                                  {request.status}
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

                          {request.executor && (
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                  Исполнитель: <span className="font-medium">{request.executor}</span>
                                </div>
                              </div>
                          )}
                        </CardContent>
                      </Card>
                  ))}
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
                          <span className="font-bold">4.8/5</span>
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
                        <p className="text-sm text-gray-600">Рейтинг: 4.8/5</p>
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
                      {notifications
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Быстрые действия</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNewRequestType("planned")
                    setShowCreateRequestModal(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать плановую заявку
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Camera className="w-4 h-4 mr-2" />
                  Отчет с фото
                </Button>
              </CardContent>
            </Card>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <Badge className={getTypeColor(selectedTaskDetails.request_type)}>{selectedTaskDetails.request_type}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Статус:</p>
                  <Badge variant="outline" className={getStatusColor(selectedTaskDetails.status)}>
                    {selectedTaskDetails.status}
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
