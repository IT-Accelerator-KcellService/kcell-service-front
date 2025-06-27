"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  BarChart3,
  Bell,
  User,
  LogOut,
  Filter,
  Eye,
  MessageCircle,
  Star,
  Plus,
  Camera,
  Calendar,
  MapPin,
  Trash2,
  Download,
  ExternalLink,
} from "lucide-react"
import Header from "@/app/header/Header"
import UserProfile from "@/app/client/UserProfile"
import axios from 'axios'
import dynamic from "next/dynamic"

const API_BASE_URL = "http://localhost:8080/api"

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

interface User {
  id: number
  full_name: string
  email: string
  role: string
}

interface Rating {
  id: number
  rating: number
  request_id: number
  created_at: string
}

interface Request {
  id: number
  title: string
  description: string
  status: string
  request_type: string
  location: string
  location_detail: string
  created_date: string
  executor?: string
  rating?: number
  category_id?: number
  photos?: { photo_url: string }[]
  progress?: number
  planned_date?: string
  client_id?: number
  complexity?: 'simple' | 'medium' | 'complex'
  sla?: string
}

export default function DepartmentHeadDashboard() {
  const [activeTab, setActiveTab] = useState("incoming")
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [newRequestType, setNewRequestType] = useState("normal")
  const [newRequestTitle, setNewRequestTitle] = useState("")
  const [newRequestLocation, setNewRequestLocation] = useState("")
  const [showProfile, setShowProfile] = useState(false)
  const [newRequestCategory, setNewRequestCategory] = useState("")
  const [newRequestDescription, setNewRequestDescription] = useState("")
  const [newRequestPlannedDate, setNewRequestPlannedDate] = useState("")
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<Request | null>(null)
  const [incomingRequests, setIncomingRequests] = useState<Request[]>([])
  const [myRequests, setMyRequests] = useState<Request[]>([])
  const [serviceCategories, setServiceCategories] = useState<{id: number, name: string}[]>([])
  const [clientInfo, setClientInfo] = useState<Record<number, User>>({})
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 })
  const [newRequestComplexity, setNewRequestComplexity] = useState<'simple' | 'medium' | 'complex'>('simple')
  const [newRequestSLA, setNewRequestSLA] = useState("1h")
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [newRequestLocationDetails, setNewRequestLocationDetails] = useState("")
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState<any[]>([])
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({})
  const [executors, setExecutors] = useState([
    { id: 1, name: "Иванов И.И.", specialty: "Электрик", rating: 4.8, workload: 3 },
    { id: 2, name: "Петров А.И.", specialty: "Сантехник", rating: 4.9, workload: 2 },
    { id: 3, name: "Сидоров В.П.", specialty: "Универсал", rating: 4.7, workload: 4 },
  ])
  const [newExecutorName, setNewExecutorName] = useState("")
  const [newExecutorSpecialty, setNewExecutorSpecialty] = useState("")
  const [showChatModal, setShowChatModal] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([])
  const [chatInput, setChatInput] = useState("")
  const [currentChatRequestId, setCurrentChatRequestId] = useState<string | null>(null)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null)
  const [deleteReason, setDeleteReason] = useState("")

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 3 - photoPreviews.length)
      const newPreviews = files.map(file => URL.createObjectURL(file))
      setPhotoPreviews([...photoPreviews, ...newPreviews])
    }
  }

  const fetchRequests = async () => {
    try {
      const response: any = await api.get('/requests/department-head/me')
      setIncomingRequests(response.data.otherRequests)
      setMyRequests(response.data.myRequests)
      response.data.otherRequests.forEach((request: Request) => {
        if (request.status === "completed") {
          checkUserRating(request.id)
        }
      })
      response.data.myRequests.forEach((request: Request) => {
        if (request.status === "completed") {
          checkUserRating(request.id)
        }
      })
    } catch (error) {
      console.error("Failed to fetch requests:", error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/service-categories')
      setServiceCategories(response.data)
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  const fetchComments = async () => {
    if (!selectedRequest?.id) return
    try {
      const res = await api.get(`/comments/request/${selectedRequest.id}`)
      setComments(res.data)
    } catch (err) {
      console.error("Ошибка при загрузке комментариев", err)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchRequests()
  }, [])

  useEffect(() => {
    if (selectedRequest?.id) {
      fetchComments()
    }
  }, [selectedRequest])

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

  const handleRejectRequest = async (requestId: number) => {
    try {
      await api.patch(`/requests/status/${requestId}`, {
        status: "rejected",
        rejection_reason: rejectionReason
      })
      fetchRequests()
      setSelectedRequest(null)
      setRejectionReason("")
    } catch (error) {
      console.error("Failed to reject request:", error)
    }
  }

  const handleSendComment = async () => {
    if (!comment.trim()) return

    try {
      await api.post(`/comments`, {
        request_id: selectedRequest?.id,
        comment,
      })
      setComment("")
      fetchComments()
    } catch (err) {
      console.error("Ошибка при отправке комментария", err)
    }
  }

  const handleCreateNewRequest = async () => {
    try {
      await api.post('/requests', {
        title: newRequestTitle,
        description: newRequestDescription,
        request_type: newRequestType,
        location: newRequestLocation,
        location_detail: newRequestLocationDetails,
        category_id: serviceCategories.find(c => c.name === newRequestCategory)?.id,
        status: "awaiting_assignment",
        complexity: newRequestComplexity,
        sla: newRequestSLA
      })
      fetchRequests()
      setShowCreateRequestModal(false)
      setNewRequestTitle("")
      setNewRequestDescription("")
      setNewRequestLocation("")
      setNewRequestType("normal")
      setNewRequestLocationDetails("")
      setNewRequestCategory("")
      setNewRequestPlannedDate("")
      setNewRequestComplexity("simple")
      setNewRequestSLA("1h")
    } catch (error) {
      console.error("Failed to create request:", error)
    }
  }

  const checkUserRating = async (requestId: number) => {
    try {
      const response = await api.get(`/ratings/user/${requestId}`)
      if (response.data) {
        setUserRatings(prev => ({
          ...prev,
          [requestId]: response.data[0]
        }))
      }
    } catch (error) {
      console.error("Failed to check user rating:", error)
    }
  }

  const handleRateExecutor = async () => {
    if (requestToRate && ratingValue > 0) {
      try {
        const response = await api.post(`/ratings`, {
          rating: ratingValue,
          request_id: requestToRate.id
        })
        setUserRatings(prev => ({
          ...prev,
          [requestToRate.id]: response.data
        }))
        setShowRatingModal(false)
        setRatingValue(0)
        setRequestToRate(null)
        alert("Оценка успешно отправлена!")
      } catch (error) {
        console.error("Failed to rate executor:", error)
        alert("Не удалось отправить оценку.")
      }
    }
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
      window.location.href = "/"
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setChatMessages((prev) => [...prev, { sender: "Вы", text: chatInput, time: currentTime }])
      setChatInput("")
      setTimeout(() => {
        const responseTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        setChatMessages((prev) => [
          ...prev,
          { sender: "Система", text: "Сообщение получено. Скоро отвечу.", time: responseTime },
        ])
      }, 1500)
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

  const handleAddExecutor = () => {
    if (newExecutorName.trim() && newExecutorSpecialty.trim()) {
      const newId = executors.length + 1
      setExecutors((prev) => [
        ...prev,
        {
          id: newId,
          name: newExecutorName.trim(),
          specialty: newExecutorSpecialty.trim(),
          rating: 5.0,
          workload: 0,
        },
      ])
      setNewExecutorName("")
      setNewExecutorSpecialty("")
    }
  }

  const handleRemoveExecutor = (executorId: number) => {
    setExecutors((prev) => prev.filter((executor) => executor.id !== executorId))
  }

  const handleAddCategory = async () => {
    if (newRequestCategory.trim() && !serviceCategories.some(c => c.name === newRequestCategory.trim())) {
      try {
        const response = await api.post('/service-categories', {
          name: newRequestCategory.trim()
        })
        setServiceCategories(prev => [...prev, response.data])
        setNewRequestCategory("")
      } catch (error) {
        console.error("Failed to add category:", error)
      }
    }
  }

  const handleRemoveCategory = async (categoryId: number) => {
    try {
      await api.delete(`/service-categories/${categoryId}`)
      setServiceCategories(prev => prev.filter(category => category.id !== categoryId))
    } catch (error) {
      console.error("Failed to remove category:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500"
      case "in_progress":
        return "bg-blue-500"
      case "in_execution":
        return "bg-orange-500"
      case "completed":
        return "bg-green-500"
      case "rejected":
        return "bg-red-500"
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

  const translateStatus = (status: string) => {
    switch (status) {
      case "draft": return "Черновик"
      case "in_progress": return "В обработке"
      case "in_execution": return "Исполнение"
      case "completed": return "Завершено"
      case "rejected": return "Отклонено"
      default: return status
    }
  }

  const translateType = (type: string) => {
    switch (type) {
      case "urgent": return "Экстренная"
      case "normal": return "Обычная"
      case "planned": return "Плановая"
      default: return type
    }
  }

  return (
      <div className="min-h-screen bg-gray-50">
        <Header
            setShowProfile={setShowProfile}
            handleLogout={handleLogout}
            notificationCount={3}
            role="Руководитель направления"
        />
        <UserProfile open={showProfile} onClose={() => setShowProfile(false)} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Stats */}
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
                      {incomingRequests.filter(req => req.status === "draft" || req.status === "in_progress").length}
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
                      {myRequests.filter(req => req.status === "in_execution").length}
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
                      {myRequests.filter(req => req.status === "completed").length}
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
                      {myRequests.filter(req =>
                          req.status === "in_execution" &&
                          req.planned_date &&
                          new Date(req.planned_date) < new Date()
                      ).length}
                    </p>
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
                    <TabsTrigger value="incoming">Входящие заявки</TabsTrigger>
                    <TabsTrigger value="my-requests">Мои заявки</TabsTrigger>
                    <TabsTrigger value="statistics">Статистика</TabsTrigger>
                    <TabsTrigger value="management">Управление</TabsTrigger>
                  </TabsList>
                  <Button
                      onClick={() => setShowCreateRequestModal(true)}
                      className="bg-violet-600 hover:bg-violet-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать заявку
                  </Button>
                </div>

                <TabsContent value="my-requests">
                  <div className="space-y-4">
                    {myRequests.map((request) => (
                        <Card
                            key={request.id}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedRequest(request)}
                        >
                          <CardContent className="p-6 relative">
                            {request.status === "completed" && !userRatings[request.id] && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setRequestToRate(request)
                                      setShowRatingModal(true)
                                    }}
                                >
                                  <Star className="w-5 h-5 text-yellow-500" />
                                </Button>
                            )}

                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge className={getTypeColor(request.request_type)}>
                                    {translateType(request.request_type)}
                                  </Badge>
                                  <Badge variant="outline" className={getStatusColor(request.status)}>
                                    {translateStatus(request.status)}
                                  </Badge>
                                  <span className="text-sm text-gray-500">#{request.id}</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
                                <div className="flex items-center text-sm text-gray-600 space-x-4">
                                  <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {request.location_detail || request.location}
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {new Date(request.created_date).toLocaleString("ru-RU")}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <p className="text-sm text-gray-700">{request.description}</p>
                          </CardContent>
                        </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="incoming">
                  <div className="space-y-4">
                    {incomingRequests.map((request) => (
                        <Card
                            key={request.id}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedRequest(request)}
                        >
                          <CardContent className="p-6 relative">
                            {request.status === "completed" && !userRatings[request.id] && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setRequestToRate(request)
                                      setShowRatingModal(true)
                                    }}
                                >
                                  <Star className="w-5 h-5 text-yellow-500" />
                                </Button>
                            )}

                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge className={getTypeColor(request.request_type)}>
                                    {translateType(request.request_type)}
                                  </Badge>
                                  <Badge variant="outline" className={getStatusColor(request.status)}>
                                    {translateStatus(request.status)}
                                  </Badge>
                                  <span className="text-sm text-gray-500">#{request.id}</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
                                <div className="flex items-center text-sm text-gray-600 space-x-4">
                                  <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {request.location_detail || request.location}
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {new Date(request.created_date).toLocaleString("ru-RU")}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <p className="text-sm text-gray-700">{request.description}</p>
                          </CardContent>
                        </Card>
                    ))}
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
                            <span className="font-bold">{incomingRequests.length + myRequests.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Завершено</span>
                            <span className="font-bold text-green-600">
                            {myRequests.filter(req => req.status === "completed").length}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>В работе</span>
                            <span className="font-bold text-blue-600">
                            {myRequests.filter(req => req.status === "in_execution").length}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Просрочено</span>
                            <span className="font-bold text-red-600">
                            {myRequests.filter(req =>
                                req.status === "in_execution" &&
                                req.planned_date &&
                                new Date(req.planned_date) < new Date()
                            ).length}
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
                            {[...incomingRequests, ...myRequests].filter(req => req.request_type === "normal").length}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Экстренные</span>
                            <span className="font-bold">
                            {[...incomingRequests, ...myRequests].filter(req => req.request_type === "urgent").length}
                          </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Плановые</span>
                            <span className="font-bold">
                            {[...incomingRequests, ...myRequests].filter(req => req.request_type === "planned").length}
                          </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="management">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Управление сотрудниками</CardTitle>
                        <CardDescription>Добавление и просмотр исполнителей</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                              placeholder="Имя исполнителя"
                              value={newExecutorName}
                              onChange={(e) => setNewExecutorName(e.target.value)}
                          />
                          <Input
                              placeholder="Специализация (напр. Электрик)"
                              value={newExecutorSpecialty}
                              onChange={(e) => setNewExecutorSpecialty(e.target.value)}
                          />
                        </div>
                        <Button
                            onClick={handleAddExecutor}
                            disabled={!newExecutorName.trim() || !newExecutorSpecialty.trim()}
                        >
                          Добавить исполнителя
                        </Button>
                        <div className="space-y-2">
                          <Label>Существующие исполнители:</Label>
                          {executors.length === 0 ? (
                              <p className="text-sm text-gray-500">Нет добавленных исполнителей.</p>
                          ) : (
                              <ul className="list-disc pl-5">
                                {executors.map((executor) => (
                                    <li key={executor.id} className="text-sm text-gray-700 flex justify-between items-center">
                                      {executor.name} ({executor.specialty})
                                      <Button variant="ghost" size="sm" onClick={() => handleRemoveExecutor(executor.id)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                      </Button>
                                    </li>
                                ))}
                              </ul>
                          )}
                        </div>
                      </CardContent>
                    </Card>

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
                          {serviceCategories.length === 0 ? (
                              <p className="text-sm text-gray-500">Нет добавленных категорий.</p>
                          ) : (
                              <ul className="list-disc pl-5">
                                {serviceCategories.map((category) => (
                                    <li key={category.id} className="text-sm text-gray-700 flex justify-between items-center">
                                      {category.name}
                                      <Button variant="ghost" size="sm" onClick={() => handleRemoveCategory(category.id)}>
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
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Команда исполнителей</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {executors.map((executor) => (
                        <div key={executor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{executor.name}</p>
                            <p className="text-sm text-gray-600">{executor.specialty}</p>
                            <div className="flex items-center mt-1">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-3 h-3 rounded-full mr-1 ${
                                            i < Math.floor(executor.rating) ? "bg-yellow-400" : "bg-gray-300"
                                        }`}
                                    />
                                ))}
                              </div>
                              <span className="text-sm text-gray-600 ml-2">{executor.rating}</span>
                            </div>
                          </div>
                          <div className="text-right">
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
                          </div>
                        </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Уведомления</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {myRequests
                        .filter(req => req.status === "in_execution" && req.planned_date && new Date(req.planned_date) < new Date())
                        .slice(0, 3)
                        .map(req => (
                            <div key={req.id} className="p-3 bg-red-50 rounded-lg">
                              <p className="text-sm font-medium">Просрочена заявка #{req.id}</p>
                              <p className="text-xs text-gray-600">{req.title}</p>
                            </div>
                        ))}
                    {incomingRequests.slice(0, 2).map(req => (
                        <div key={req.id} className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium">Новая заявка #{req.id}</p>
                          <p className="text-xs text-gray-600">{req.title}</p>
                        </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

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
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Отчеты по направлению
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Выгрузить в Excel
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Выгрузить в Power BI
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Управление командой
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Request Details Modal */}
        {selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Детали заявки #{selectedRequest.id}</CardTitle>
                  <CardDescription>Проверка и классификация заявки</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Тип заявки</Label>
                      <Badge className={getTypeColor(selectedRequest.request_type)}>
                        {translateType(selectedRequest.request_type)}
                      </Badge>
                    </div>
                    <div>
                      <Label>Статус</Label>
                      <Badge className={getStatusColor(selectedRequest.status)}>
                        {translateStatus(selectedRequest.status)}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label>Название</Label>
                    <p className="text-sm font-medium">{selectedRequest.title}</p>
                  </div>
                  {selectedRequest?.client_id && clientInfo[selectedRequest.client_id] && (
                      <div>
                        <Label>Клиент</Label>
                        <p className="text-sm font-medium">
                          {clientInfo[selectedRequest.client_id].full_name} ({clientInfo[selectedRequest.client_id].email})
                        </p>
                      </div>
                  )}
                  <div>
                    <Label>Локация</Label>
                    <p className="text-sm">{selectedRequest.location_detail || selectedRequest.location}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const locText = selectedRequest.location
                            const latMatch = locText.match(/Широта: (-?\d+\.\d+)/)
                            const lonMatch = locText.match(/Долгота: (-?\d+\.\d+)/)
                            const accMatch = locText.match(/±(\d+) м/)

                            if (latMatch && lonMatch && accMatch) {
                              setMapLocation({
                                lat: parseFloat(latMatch[1]),
                                lon: parseFloat(lonMatch[1]),
                                accuracy: parseInt(accMatch[1])
                              })
                              setShowMapModal(true)
                            } else {
                              alert("Не удалось определить координаты из локации")
                            }
                          }}
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        Показать на карте
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Описание</Label>
                    <p className="text-sm">{selectedRequest.description}</p>
                  </div>

                  <div>
                    <Label htmlFor="category">Категория услуги</Label>
                    <Select
                        value={selectedRequest.category_id?.toString() || ""}
                        onValueChange={(val) => setSelectedRequest({
                          ...selectedRequest,
                          category_id: parseInt(val)
                        })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceCategories.map(category => (
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
                      {selectedRequest.status === 'in_progress' ? (
                          <Select
                              value={selectedRequest.complexity}
                              onValueChange={(value: 'simple' | 'medium' | 'complex') => {
                                setSelectedRequest({
                                  ...selectedRequest,
                                  complexity: value
                                })
                              }}
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
                      ) : (
                          <Badge className="bg-blue-500">
                            {selectedRequest.complexity === 'simple' && 'Простая'}
                            {selectedRequest.complexity === 'medium' && 'Средняя'}
                            {selectedRequest.complexity === 'complex' && 'Сложная'}
                          </Badge>
                      )}
                    </div>

                    <div>
                      <Label>SLA</Label>
                      {selectedRequest.status === 'in_progress' ? (
                          <Select
                              value={selectedRequest.sla}
                              onValueChange={(value: string) => {
                                setSelectedRequest({
                                  ...selectedRequest,
                                  sla: value
                                })
                              }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите срок выполнения" />
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
                      ) : (
                          <p className="text-sm font-medium">
                            {selectedRequest.sla === '1h' && '1 час'}
                            {selectedRequest.sla === '4h' && '4 часа'}
                            {selectedRequest.sla === '8h' && '8 часов'}
                            {selectedRequest.sla === '1d' && '1 день'}
                            {selectedRequest.sla === '3d' && '3 дня'}
                            {selectedRequest.sla === '1w' && '1 неделя'}
                          </p>
                      )}
                    </div>
                  </div>

                  {selectedRequest.rating && (
                      <div>
                        <Label>Оценка</Label>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                              <Star
                                  key={i}
                                  className={`w-5 h-5 ${i < selectedRequest.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              />
                          ))}
                        </div>
                      </div>
                  )}

                  {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                      <div>
                        <Label>Фотографии</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {selectedRequest.photos.map((photo: any, index: number) => (
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

                  {selectedRequest.status === "completed" && (
                      <Button
                          onClick={() => {
                            setRequestToRate(selectedRequest)
                            setShowRatingModal(true)
                          }}
                          className="mt-4"
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Оценить клиента
                      </Button>
                  )}

                  <div className="flex space-x-4">
                    {selectedRequest.status === "in_progress" && (
                        <>
                          <Button
                              variant="outline"
                              onClick={() => {
                                if (rejectionReason) {
                                  handleRejectRequest(selectedRequest.id)
                                }
                              }}
                              className="flex-1 text-red-600 hover:text-red-700"
                              disabled={!rejectionReason}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Отклонить
                          </Button>
                        </>
                    )}
                    <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                      Закрыть
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                          setShowChatModal(true)
                          setCurrentChatRequestId(selectedRequest.id.toString())
                          setChatMessages([
                            {
                              sender: "Система",
                              text: `Чат по заявке #${selectedRequest.id} открыт.`,
                              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            },
                          ])
                        }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Чат
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                          setSelectedRequest(null)
                          handleDeleteRequest(selectedRequest)
                        }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить
                    </Button>
                  </div>

                  {selectedRequest.status === "in_progress" && (
                      <div className="mt-4">
                        <Label htmlFor="rejectionReason">Причина отклонения</Label>
                        <Textarea
                            id="rejectionReason"
                            placeholder="Укажите причину отклонения заявки..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                      </div>
                  )}

                  {/* Секция для комментариев */}
                  <div className="mt-6">
                    <Label>Комментарии</Label>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {comments.map((c: any) => (
                          <div key={c.id} className="p-2 bg-gray-50 rounded">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{c.user?.full_name || "Аноним"}</span>
                              <span className="text-gray-500">
                          {new Date(c.timestamp).toLocaleString()}
                        </span>
                            </div>
                            <p className="mt-1 text-sm">{c.comment}</p>
                          </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Написать комментарий..."
                          className="flex-1"
                      />
                      <Button onClick={handleSendComment}>Отправить</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

        {/* Create Request Modal */}
        {showCreateRequestModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Создать {translateType(newRequestType).toLowerCase()} заявку</CardTitle>
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
                        <SelectItem value="normal">Обычная</SelectItem>
                        <SelectItem value="urgent">Экстренная</SelectItem>
                        <SelectItem value="planned">Плановая</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="newRequestTitle">Название заявки</Label>
                    <Input
                        id="newRequestTitle"
                        placeholder="Краткое название проблемы"
                        value={newRequestTitle}
                        onChange={(e) => setNewRequestTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Локация</Label>
                    <div className="flex gap-2">
                      <Input
                          placeholder="Введите расположение"
                          value={newRequestLocation}
                          onChange={(e) => setNewRequestLocation(e.target.value)}
                      />
                      <Button
                          variant="outline"
                          onClick={() => {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                  (position) => {
                                    const { latitude, longitude, accuracy } = position.coords
                                    setNewRequestLocation(
                                        `Широта: ${latitude.toFixed(5)}, Долгота: ${longitude.toFixed(5)} (±${Math.round(accuracy)} м)`
                                    )
                                  },
                                  (error) => {
                                    console.error("Ошибка геолокации:", error)
                                    setNewRequestLocation("Не удалось определить местоположение")
                                  }
                              )
                            } else {
                              setNewRequestLocation("Геолокация не поддерживается вашим браузером")
                            }
                          }}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Определить местоположение
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Расположение в офисе</Label>
                    <Input
                        placeholder="Например: 3 этаж, кабинет 305"
                        value={newRequestLocationDetails}
                        onChange={(e) => setNewRequestLocationDetails(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="newRequestCategory">Категория услуги</Label>
                    <Select
                        value={newRequestCategory}
                        onValueChange={setNewRequestCategory}
                    >
                      <SelectTrigger id="newRequestCategory">
                        <SelectValue placeholder="Выберите категорию" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceCategories.map(category => (
                            <SelectItem key={category.id} value={category.name}>
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
                        <Label htmlFor="newRequestPlannedDate">Плановая дата выполнения</Label>
                        <Input
                            id="newRequestPlannedDate"
                            type="date"
                            value={newRequestPlannedDate}
                            onChange={(e) => setNewRequestPlannedDate(e.target.value)}
                        />
                      </div>
                  )}

                  <div>
                    <Label>Описание проблемы</Label>
                    <Textarea
                        placeholder="Опишите проблему подробно..."
                        className="min-h-[100px]"
                        value={newRequestDescription}
                        onChange={(e) => setNewRequestDescription(e.target.value)}
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
                    <Button
                        onClick={handleCreateNewRequest}
                        className="flex-1 bg-violet-600 hover:bg-violet-700"
                        disabled={
                            !newRequestType ||
                            !newRequestTitle ||
                            !newRequestLocation ||
                            !newRequestDescription ||
                            !newRequestCategory ||
                            (newRequestType === "planned" && !newRequestPlannedDate)
                        }
                    >
                      Отправить заявку
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowCreateRequestModal(false)}
                        className="flex-1"
                    >
                      Отмена
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
        )}

        {/* Rating Modal */}
        {showRatingModal && requestToRate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Оценить клиента</CardTitle>
                  <CardDescription>Пожалуйста, оцените взаимодействие по заявке #{requestToRate.id}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={`w-10 h-10 cursor-pointer ${
                                star <= ratingValue ? "text-yellow-400 fill-current" : "text-gray-300"
                            }`}
                            onClick={() => setRatingValue(star)}
                        />
                    ))}
                  </div>
                  <Button
                      onClick={handleRateExecutor}
                      disabled={ratingValue === 0}
                      className="w-full bg-violet-600 hover:bg-violet-700"
                  >
                    Отправить оценку
                  </Button>
                  <Button
                      variant="outline"
                      onClick={() => {
                        setShowRatingModal(false)
                        setRatingValue(0)
                        setRequestToRate(null)
                      }}
                      className="w-full"
                  >
                    Отмена
                  </Button>
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

        {/* Chat Modal */}
        {showChatModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-md max-h-[90vh] flex flex-col">
                <CardHeader className="border-b pb-4">
                  <CardTitle className="text-xl">Чат по заявке #{currentChatRequestId}</CardTitle>
                  <CardDescription>Общайтесь с исполнителем или клиентом</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.sender === "Вы" ? "justify-end" : "justify-start"}`}>
                        <div
                            className={`max-w-[75%] p-3 rounded-xl shadow-sm ${
                                msg.sender === "Вы"
                                    ? "bg-violet-600 text-white rounded-br-none"
                                    : "bg-gray-200 text-gray-800 rounded-bl-none"
                            }`}
                        >
                          <p className="text-sm">{msg.text}</p>
                          <span className={`block text-xs mt-1 ${msg.sender === "Вы" ? "text-violet-100" : "text-gray-500"}`}>
                      {msg.time}
                    </span>
                        </div>
                      </div>
                  ))}
                  <div ref={chatMessagesEndRef} />
                </CardContent>
                <div className="p-4 flex space-x-2 border-t pt-4">
                  <Input
                      placeholder="Введите сообщение..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") handleSendMessage()
                      }}
                      className="flex-1"
                  />
                  <Button onClick={handleSendMessage} className="bg-violet-600 hover:bg-violet-700">
                    Отправить
                  </Button>
                  <Button variant="outline" onClick={() => setShowChatModal(false)}>
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