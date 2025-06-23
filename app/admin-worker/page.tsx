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
} from "lucide-react"

export default function AdminWorkerDashboard() {
  const [activeTab, setActiveTab] = useState("incoming")
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  // State for creating new requests
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [newRequestType, setNewRequestType] = useState("")
  const [newRequestTitle, setNewRequestTitle] = useState("")
  const [newRequestLocation, setNewRequestLocation] = useState("")
  const [newRequestCategory, setNewRequestCategory] = useState("")
  const [newRequestComplexity, setNewRequestComplexity] = useState("")
  const [newRequestSLA, setNewRequestSLA] = useState("")
  const [newRequestDescription, setNewRequestDescription] = useState("")
  const [newRequestPhotos, setNewRequestPhotos] = useState<string[]>([])
  const [newRequestPlannedDate, setNewRequestPlannedDate] = useState("") // New state for planned date

  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<any>(null)

  const [showChatModal, setShowChatModal] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([])
  const [chatInput, setChatInput] = useState("")
  const [currentChatRequestId, setCurrentChatRequestId] = useState<string | null>(null)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)

  const [incomingRequests, setIncomingRequests] = useState([
    {
      id: "REQ-003",
      type: "Обычная",
      title: "Не работает принтер",
      client: "Петрова М.А.",
      location: "Офис 205, Тимирязева 2Г",
      date: "2024-01-16 09:30",
      description: "Принтер HP LaserJet не печатает, горит красная лампочка",
      photos: ["/placeholder.svg?height=100&width=100&text=Photo1"],
      status: "Новая",
      category: null,
      complexity: null,
      sla: null,
    },
    {
      id: "REQ-004",
      type: "Экстренная",
      title: "Протечка воды в серверной",
      client: "Иванов С.П.",
      location: "Серверная, Алимжанова 51",
      date: "2024-01-16 08:15",
      description: "Обнаружена протечка воды в серверной комнате, есть риск повреждения оборудования",
      photos: [
        "/placeholder.svg?height=100&width=100&text=Photo1",
        "/placeholder.svg?height=100&width=100&text=Photo2",
      ],
      status: "Новая",
      category: null,
      complexity: null,
      sla: null,
    },
  ])

  const [myRequests, setMyRequests] = useState([
    {
      id: "REQ-001",
      type: "Обычная",
      title: "Замена лампочки",
      status: "Исполнение",
      executor: "Петров А.И.",
      location: "Коридор 3 этаж",
      date: "2024-01-15",
      sla: "4 часа",
      progress: 75,
      rating: null,
      plannedDate: null, // Added plannedDate
    },
    {
      id: "REQ-002",
      type: "Плановая",
      title: "Техническое обслуживание кондиционеров",
      status: "Завершено",
      executor: "Сидоров В.П.",
      location: "Все офисы",
      date: "2024-01-14",
      sla: "2 дня",
      progress: 100,
      rating: 5,
      plannedDate: "2024-01-20", // Example planned date
    },
    {
      id: "REQ-005",
      type: "Экстренная",
      title: "Устранение короткого замыкания",
      status: "Исполнение",
      executor: "Иванов И.И.",
      location: "Электрощитовая",
      date: "2024-01-17",
      sla: "1 час",
      progress: 90,
      rating: null,
      plannedDate: null,
    },
  ])

  // Auto-scroll to the bottom of the chat when messages change
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages])

  // Set default values for new request modal based on type
  useEffect(() => {
    if (newRequestType === "Плановая") {
      setNewRequestCategory("Техническое обслуживание")
      setNewRequestComplexity("Средняя")
      setNewRequestSLA("1 неделя")
      // Set a default planned date for next month (simple simulation)
      const today = new Date()
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      setNewRequestPlannedDate(nextMonth.toISOString().slice(0, 10))
    } else if (newRequestType === "Экстренная") {
      setNewRequestCategory("IT поддержка") // Example default
      setNewRequestComplexity("Простая") // Example default
      setNewRequestSLA("1 час") // Example default
      setNewRequestPlannedDate("") // Clear planned date for non-planned types
    } else if (newRequestType === "Обычная") {
      setNewRequestCategory("Клининг") // Example default
      setNewRequestComplexity("Простая") // Example default
      setNewRequestSLA("4 часа") // Example default
      setNewRequestPlannedDate("") // Clear planned date for non-planned types
    } else {
      setNewRequestCategory("")
      setNewRequestComplexity("")
      setNewRequestSLA("")
      setNewRequestPlannedDate("")
    }
  }, [newRequestType])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Новая":
        return "bg-yellow-500"
      case "В обработке":
        return "bg-blue-500"
      case "Исполнение":
        return "bg-orange-500"
      case "Завершено":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Экстренная":
        return "bg-red-500"
      case "Обычная":
        return "bg-blue-500"
      case "Плановая":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const handleApproveRequest = (requestId: string, category: string, complexity: string, sla: string) => {
    setIncomingRequests((prev) =>
      prev.filter((req) => {
        if (req.id === requestId) {
          // Simulate moving to "my requests" and setting status
          setMyRequests((prevMy) => [
            {
              ...req,
              status: "В обработке",
              category: category,
              complexity: complexity,
              sla: sla,
              executor: "Назначен", // Placeholder for now
              progress: 0,
              plannedDate: null, // Ensure no planned date for non-planned requests
            },
            ...prevMy,
          ])
          return false // Remove from incoming
        }
        return true
      }),
    )
    setSelectedRequest(null)
    console.log(`Request ${requestId} approved with category: ${category}, complexity: ${complexity}, SLA: ${sla}`)
  }

  const handleRejectRequest = (requestId: string) => {
    setIncomingRequests((prev) => prev.filter((req) => req.id !== requestId))
    setSelectedRequest(null)
    console.log(`Request ${requestId} rejected with reason: ${rejectionReason}`)
    setRejectionReason("")
  }

  const handleNewRequestPhotoUpload = () => {
    setNewRequestPhotos((prev) => [...prev, `/placeholder.svg?height=100&width=100&text=Photo${prev.length + 1}`])
  }

  const handleCreateNewRequest = () => {
    const newReq = {
      id: `REQ-${(incomingRequests.length + myRequests.length + 1).toString().padStart(3, "0")}`,
      type: newRequestType,
      title: newRequestTitle,
      client: "Админов А.А.", // Admin worker is the client for self-created requests
      location: newRequestLocation,
      date: new Date().toISOString().slice(0, 10),
      description: newRequestDescription,
      photos: newRequestPhotos,
      status: "В обработке", // Directly to processing, bypassing classification
      category: newRequestCategory,
      complexity: newRequestComplexity,
      sla: newRequestSLA,
      executor: null,
      progress: 0,
      rating: null,
      plannedDate: newRequestType === "Плановая" ? newRequestPlannedDate : null,
    }
    setMyRequests((prev) => [newReq, ...prev]) // Add directly to my requests
    setShowCreateRequestModal(false)
    // Reset form fields
    setNewRequestType("")
    setNewRequestTitle("")
    setNewRequestLocation("")
    setNewRequestCategory("")
    setNewRequestComplexity("")
    setNewRequestSLA("")
    setNewRequestDescription("")
    setNewRequestPhotos([])
    setNewRequestPlannedDate("")
    console.log("New request created:", newReq)
  }

  const handleConfirmCompletion = (requestId: string) => {
    const request = myRequests.find((req) => req.id === requestId)
    if (request) {
      setRequestToRate(request)
      setShowRatingModal(true)
    }
  }

  const handleRateExecutor = () => {
    if (requestToRate && ratingValue > 0) {
      setMyRequests((prev) =>
        prev.map((req) =>
          req.id === requestToRate.id ? { ...req, status: "Завершено", rating: ratingValue, progress: 100 } : req,
        ),
      )
      setShowRatingModal(false)
      setRatingValue(0)
      setRequestToRate(null)
      console.log(`Executor for ${requestToRate.id} rated ${ratingValue} stars. Request completed.`)
    }
  }

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setChatMessages((prev) => [...prev, { sender: "Вы", text: chatInput, time: currentTime }])
      setChatInput("")
      // Simulate a response
      setTimeout(() => {
        const responseTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        setChatMessages((prev) => [
          ...prev,
          { sender: "Исполнитель", text: "Сообщение получено. Скоро отвечу.", time: responseTime },
        ])
      }, 1500)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">K</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Kcell Service</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">5</span>
              </Button>
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">Админов А.А.</span>
                <Badge variant="secondary">Админ. работник</Badge>
              </div>
              <Button variant="ghost" size="sm">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

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
                  <p className="text-2xl font-bold text-gray-900">{incomingRequests.length}</p>
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
                    {myRequests.filter((r) => r.status === "Исполнение").length}
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
                    {myRequests.filter((r) => r.status === "Завершено").length}
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
                  <p className="text-2xl font-bold text-gray-900">2</p>
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
                </TabsList>
                <Button
                  onClick={() => {
                    setNewRequestType("Обычная") // Default to "Обычная" when opening
                    setShowCreateRequestModal(true)
                  }}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать заявку
                </Button>
              </div>

              <TabsContent value="incoming">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Фильтр
                    </Button>
                    <Select>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Тип заявки" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="regular">Обычная</SelectItem>
                        <SelectItem value="emergency">Экстренная</SelectItem>
                        <SelectItem value="planned">Плановая</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {incomingRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={getTypeColor(request.type)}>{request.type}</Badge>
                              <Badge variant="outline" className={getStatusColor(request.status)}>
                                {request.status}
                              </Badge>
                              <span className="text-sm text-gray-500">#{request.id}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>Клиент: {request.client}</p>
                              <p>Локация: {request.location}</p>
                              <p>Время: {request.date}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowChatModal(true)
                                setCurrentChatRequestId(request.id)
                                setChatMessages([
                                  {
                                    sender: "Система",
                                    text: `Чат по заявке #${request.id} открыт.`,
                                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                  },
                                ])
                              }}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">{request.description}</p>

                        {request.photos.length > 0 && (
                          <div className="flex space-x-2">
                            {request.photos.map((photo: string, index: number) => (
                              <img
                                key={index}
                                src={photo || "/placeholder.svg"}
                                alt={`Photo ${index + 1}`}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="my-requests">
                <div className="space-y-4">
                  {myRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={getTypeColor(request.type)}>{request.type}</Badge>
                              <Badge variant="outline" className={getStatusColor(request.status)}>
                                {request.status}
                              </Badge>
                              <span className="text-sm text-gray-500">#{request.id}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>Исполнитель: {request.executor}</p>
                              <p>Локация: {request.location}</p>
                              <p>SLA: {request.sla}</p>
                              {request.plannedDate && (
                                <p className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  Плановая дата: {request.plannedDate}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowChatModal(true)
                                setCurrentChatRequestId(request.id)
                                setChatMessages([
                                  {
                                    sender: "Система",
                                    text: `Чат по заявке #${request.id} открыт.`,
                                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                  },
                                ])
                              }}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            {request.status === "Исполнение" && !request.rating && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleConfirmCompletion(request.id)
                                }}
                              >
                                <CheckCircle className="w-4 h-4" />
                                Подтвердить
                              </Button>
                            )}
                            {request.status === "Завершено" && request.rating && (
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < request.rating! ? "text-yellow-400 fill-current" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {request.status === "Исполнение" && (
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">Прогресс</span>
                              <span className="text-sm text-gray-600">{request.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${request.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="statistics">
                <div className="flex items-center space-x-4 mb-4">
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Выберите офис" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все офисы</SelectItem>
                      <SelectItem value="timiryazeva">Тимирязева 2Г</SelectItem>
                      <SelectItem value="alimzhanova">Алимжанова 51</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Статистика по офису</CardTitle>
                      <CardDescription>Тимирязева 2Г</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Всего заявок за месяц</span>
                          <span className="font-bold">45</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Завершено в срок</span>
                          <span className="font-bold text-green-600">38</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Просрочено</span>
                          <span className="font-bold text-red-600">7</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Средняя оценка</span>
                          <span className="font-bold">4.6/5</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>SLA Performance</CardTitle>
                      <CardDescription>Соблюдение временных рамок</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Экстренные заявки</span>
                          <span className="font-bold text-green-600">95%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Обычные заявки</span>
                          <span className="font-bold text-yellow-600">84%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Плановые заявки</span>
                          <span className="font-bold text-green-600">92%</span>
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
                <CardTitle className="text-lg">Быстрые действия</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNewRequestType("Плановая")
                    setShowCreateRequestModal(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Создать плановую заявку
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNewRequestType("Экстренная")
                    setShowCreateRequestModal(true)
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                  Экстренная заявка
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Отчеты
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Уведомления</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium">Просрочена заявка #REQ-005</p>
                    <p className="text-xs text-gray-600">30 минут назад</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium">Новая экстренная заявка</p>
                    <p className="text-xs text-gray-600">1 час назад</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium">Заявка #REQ-003 завершена</p>
                    <p className="text-xs text-gray-600">2 часа назад</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium">Низкая оценка по заявке #REQ-002</p>
                    <p className="text-xs text-gray-600">4 часа назад</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium">Необходимо принять работу по #REQ-001</p>
                    <p className="text-xs text-gray-600">5 часов назад</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Request Details Modal (for incoming requests) */}
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
                  <Badge className={getTypeColor(selectedRequest.type)}>{selectedRequest.type}</Badge>
                </div>
                <div>
                  <Label>Статус</Label>
                  <Badge className={getStatusColor(selectedRequest.status)}>{selectedRequest.status}</Badge>
                </div>
              </div>

              <div>
                <Label>Клиент</Label>
                <p className="text-sm font-medium">{selectedRequest.client}</p>
              </div>

              <div>
                <Label>Локация</Label>
                <p className="text-sm">{selectedRequest.location}</p>
              </div>

              <div>
                <Label>Описание</Label>
                <p className="text-sm">{selectedRequest.description}</p>
              </div>

              {selectedRequest.photos.length > 0 && (
                <div>
                  <Label>Фотографии</Label>
                  <div className="flex space-x-2 mt-2">
                    {selectedRequest.photos.map((photo: string, index: number) => (
                      <img
                        key={index}
                        src={photo || "/placeholder.svg"}
                        alt={`Photo ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="category">Категория услуги</Label>
                <Select
                  defaultValue={selectedRequest.category || ""}
                  onValueChange={(val) => setSelectedRequest({ ...selectedRequest, category: val })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleaning">Клининг</SelectItem>
                    <SelectItem value="maintenance">Техническое обслуживание</SelectItem>
                    <SelectItem value="it">IT поддержка</SelectItem>
                    <SelectItem value="security">Безопасность</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="complexity">Сложность</Label>
                <Select
                  defaultValue={selectedRequest.complexity || ""}
                  onValueChange={(val) => setSelectedRequest({ ...selectedRequest, complexity: val })}
                >
                  <SelectTrigger id="complexity">
                    <SelectValue placeholder="Определите сложность" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Простая</SelectItem>
                    <SelectItem value="medium">Средняя</SelectItem>
                    <SelectItem value="complex">Сложная</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sla">SLA (Срок выполнения)</Label>
                <Select
                  defaultValue={selectedRequest.sla || ""}
                  onValueChange={(val) => setSelectedRequest({ ...selectedRequest, sla: val })}
                >
                  <SelectTrigger id="sla">
                    <SelectValue placeholder="Установите SLA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 час</SelectItem>
                    <SelectItem value="2h">2 часа</SelectItem>
                    <SelectItem value="4h">4 часа</SelectItem>
                    <SelectItem value="8h">8 часов</SelectItem>
                    <SelectItem value="1d">1 день</SelectItem>
                    <SelectItem value="2d">2 дня</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  *Для простых и экстренных заявок SLA может быть присвоен автоматически.
                </p>
              </div>

              <div>
                <Label htmlFor="comment">Комментарий</Label>
                <Textarea id="comment" placeholder="Добавьте комментарий..." />
              </div>

              <div className="flex space-x-4">
                <Button
                  onClick={() => {
                    handleApproveRequest(
                      selectedRequest.id,
                      selectedRequest.category,
                      selectedRequest.complexity,
                      selectedRequest.sla,
                    )
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={!selectedRequest.category || !selectedRequest.complexity || !selectedRequest.sla}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Принять
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (window.confirm("Вы уверены, что хотите отклонить заявку?")) {
                      handleRejectRequest(selectedRequest.id)
                    }
                  }}
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Отклонить
                </Button>
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Закрыть
                </Button>
              </div>
              {selectedRequest.status === "Новая" && (
                <div className="mt-4">
                  <Label htmlFor="rejectionReason">Причина отклонения (обязательно при отклонении)</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Укажите причину отклонения заявки..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Request Modal */}
      {showCreateRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Создать {newRequestType.toLowerCase()} заявку</CardTitle>
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
                    <SelectItem value="Обычная">Обычная</SelectItem>
                    <SelectItem value="Экстренная">Экстренная</SelectItem>
                    <SelectItem value="Плановая">Плановая</SelectItem>
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
                <Label>Офис</Label>
                <Select value={newRequestLocation} onValueChange={setNewRequestLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите офис" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Тимирязева 2Г">Тимирязева 2Г</SelectItem>
                    <SelectItem value="Алимжанова 51">Алимжанова 51</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Расположение в офисе</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите расположение" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office-301">Офис 301</SelectItem>
                    <SelectItem value="meeting-room-1">Переговорная 1</SelectItem>
                    <SelectItem value="kitchen">Кухня</SelectItem>
                    <SelectItem value="bathroom-2">Санузел 2 этаж</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="newRequestCategory">Категория услуги</Label>
                <Select value={newRequestCategory} onValueChange={setNewRequestCategory}>
                  <SelectTrigger id="newRequestCategory">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Клининг">Клининг</SelectItem>
                    <SelectItem value="Техническое обслуживание">Техническое обслуживание</SelectItem>
                    <SelectItem value="IT поддержка">IT поддержка</SelectItem>
                    <SelectItem value="Безопасность">Безопасность</SelectItem>
                    <SelectItem value="Мелкие строительные работы">Мелкие строительные работы</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="newRequestComplexity">Сложность</Label>
                <Select value={newRequestComplexity} onValueChange={setNewRequestComplexity}>
                  <SelectTrigger id="newRequestComplexity">
                    <SelectValue placeholder="Определите сложность" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Простая">Простая</SelectItem>
                    <SelectItem value="Средняя">Средняя</SelectItem>
                    <SelectItem value="Сложная">Сложная</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="newRequestSLA">SLA (Срок выполнения)</Label>
                <Select value={newRequestSLA} onValueChange={setNewRequestSLA}>
                  <SelectTrigger id="newRequestSLA">
                    <SelectValue placeholder="Установите SLA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 час">1 час</SelectItem>
                    <SelectItem value="2 часа">2 часа</SelectItem>
                    <SelectItem value="4 часа">4 часа</SelectItem>
                    <SelectItem value="8 часов">8 часов</SelectItem>
                    <SelectItem value="1 день">1 день</SelectItem>
                    <SelectItem value="2 дня">2 дня</SelectItem>
                    <SelectItem value="1 неделя">1 неделя</SelectItem>
                    <SelectItem value="2 недели">2 недели</SelectItem>
                    <SelectItem value="1 месяц">1 месяц</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newRequestType === "Плановая" && (
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
                <Label htmlFor="newRequestDescription">Описание проблемы</Label>
                <Textarea
                  id="newRequestDescription"
                  placeholder="Опишите проблему подробно..."
                  className="min-h-[100px]"
                  value={newRequestDescription}
                  onChange={(e) => setNewRequestDescription(e.target.value)}
                />
              </div>

              <div>
                <Label>Фотографии (до 3 шт.)</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {newRequestPhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo || "/placeholder.svg"}
                        alt={`Photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setNewRequestPhotos(newRequestPhotos.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {newRequestPhotos.length < 3 && (
                    <button
                      onClick={handleNewRequestPhotoUpload}
                      className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-violet-500 transition-colors"
                    >
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
                    (newRequestType === "Плановая" && !newRequestPlannedDate)
                  }
                >
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

      {/* Rating Modal (for admin to rate executor) */}
      {showRatingModal && requestToRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Оценить исполнителя</CardTitle>
              <CardDescription>Пожалуйста, оцените работу исполнителя по заявке #{requestToRate.id}</CardDescription>
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
              <div ref={chatMessagesEndRef} /> {/* For auto-scrolling */}
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
    </div>
  )
}
