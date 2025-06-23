"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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
  Bell,
  User,
  LogOut,
  Building2,
  Plus,
  Menu,
  Trash2,
  Camera,
  Calendar,
  Eye,
  MessageCircle,
} from "lucide-react"

export default function ManagerDashboard() {
  const [period, setPeriod] = useState("month")
  const [office, setOffice] = useState("all")
  const [tab, setTab] = useState("overview")

  // State for office management
  const [offices, setOffices] = useState(["Тимирязева 2Г", "Алимжанова 51"])
  const [newOfficeName, setNewOfficeName] = useState("")

  // State for creating new requests
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false)
  const [newRequestType, setNewRequestType] = useState("Обычная") // Default type
  const [newRequestTitle, setNewRequestTitle] = useState("")
  const [newRequestLocation, setNewRequestLocation] = useState("")
  const [newRequestCategory, setNewRequestCategory] = useState("")
  const [newRequestComplexity, setNewRequestComplexity] = useState("")
  const [newRequestSLA, setNewRequestSLA] = useState("")
  const [newRequestDescription, setNewRequestDescription] = useState("")
  const [newRequestPhotos, setNewRequestPhotos] = useState<string[]>([])
  const [newRequestPlannedDate, setNewRequestPlannedDate] = useState("")

  // State for requests created by the manager
  const [managerSubmittedRequests, setManagerSubmittedRequests] = useState([
    {
      id: "REQ-M01",
      type: "Обычная",
      title: "Проверка системы отопления",
      client: "Менеджеров М.М.",
      location: "Офис 101, Тимирязева 2Г",
      date: "2024-06-20",
      description: "Плановая проверка системы отопления перед зимним сезоном.",
      photos: [],
      status: "Ожидает назначения",
      category: "Техническое обслуживание",
      complexity: "Средняя",
      sla: "1 неделя",
      executor: null,
      plannedDate: "2024-07-15",
    },
  ])

  // State for viewing request details
  const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false)
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<any>(null)

  // State for chat
  const [showChatModal, setShowChatModal] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([])
  const [chatInput, setChatInput] = useState("")
  const [currentChatRequestId, setCurrentChatRequestId] = useState<string | null>(null)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)

  const kpi = {
    total: 156,
    completed: 142,
    overdue: 8,
    rating: 4.7,
    sla: "2.3 ч",
    emergency: 12,
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

  const alerts = [
    { type: "SLA", message: "Просрочена заявка #REQ-015", time: "15 мин", severity: "high" },
    { type: "Rating", message: "Низкая оценка заявки #REQ-014", time: "1 ч", severity: "medium" },
    { type: "Emergency", message: "Экстренная заявка #REQ-016", time: "2 ч", severity: "high" },
  ]

  const serviceCategories = [
    "Клининг",
    "Техническое обслуживание",
    "IT поддержка",
    "Безопасность",
    "Мелкие строительные работы",
    "Электрика",
    "Сантехника",
  ]

  const complexities = ["Простая", "Средняя", "Сложная"]

  const slas = ["1 час", "2 часа", "4 часа", "8 часов", "1 день", "2 дня", "1 неделя", "2 недели", "1 месяц"]

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
      const today = new Date()
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      setNewRequestPlannedDate(nextMonth.toISOString().slice(0, 10))
    } else if (newRequestType === "Экстренная") {
      setNewRequestCategory("IT поддержка")
      setNewRequestComplexity("Простая")
      setNewRequestSLA("1 час")
      setNewRequestPlannedDate("")
    } else if (newRequestType === "Обычная") {
      setNewRequestCategory("Клининг")
      setNewRequestComplexity("Простая")
      setNewRequestSLA("4 часа")
      setNewRequestPlannedDate("")
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
      case "Ожидает назначения":
        return "bg-yellow-500"
      case "Ожидает SLA":
        return "bg-orange-500"
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
      case "Сложная":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  // Handlers for office management
  const handleAddOffice = () => {
    const trimmedName = newOfficeName.trim()
    if (trimmedName && !offices.includes(trimmedName)) {
      setOffices((prev) => [...prev, trimmedName])
      setNewOfficeName("")
      console.log("Новый офис добавлен:", trimmedName)
    } else if (offices.includes(trimmedName)) {
      alert("Офис с таким названием уже существует!")
    }
  }

  const handleRemoveOffice = (officeToRemove: string) => {
    setOffices((prev) => prev.filter((office) => office !== officeToRemove))
  }

  const handleNewRequestPhotoUpload = () => {
    setNewRequestPhotos((prev) => [...prev, `/placeholder.svg?height=100&width=100&text=Photo${prev.length + 1}`])
  }

  const handleCreateNewRequest = () => {
    const newReq = {
      id: `REQ-M${(managerSubmittedRequests.length + 1).toString().padStart(2, "0")}`,
      type: newRequestType,
      title: newRequestTitle,
      client: "Менеджеров М.М.", // Manager is the client for self-created requests
      location: newRequestLocation,
      date: new Date().toISOString().slice(0, 10),
      description: newRequestDescription,
      photos: newRequestPhotos,
      status: "Ожидает назначения", // New requests from Manager go to pending for admin worker/department head
      category: newRequestCategory,
      complexity: newRequestComplexity,
      sla: newRequestSLA,
      executor: null,
      plannedDate: newRequestType === "Плановая" ? newRequestPlannedDate : null,
    }
    setManagerSubmittedRequests((prev) => [newReq, ...prev])
    setShowCreateRequestModal(false)
    // Reset form fields
    setNewRequestType("Обычная")
    setNewRequestTitle("")
    setNewRequestLocation("")
    setNewRequestCategory("")
    setNewRequestComplexity("")
    setNewRequestSLA("")
    setNewRequestDescription("")
    setNewRequestPhotos([])
    setNewRequestPlannedDate("")
    console.log("New request created by Manager:", newReq)
  }

  const openRequestDetails = (request: any) => {
    setSelectedRequestDetails(request)
    setShowRequestDetailsModal(true)
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
          { sender: "Система", text: "Сообщение получено. Скоро отвечу.", time: responseTime },
        ])
      }, 1500)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm sm:text-base">K</span>
            </div>
            <span className="font-bold text-lg sm:text-xl truncate">Kcell Service</span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                7
              </span>
            </Button>

            {/* Desktop user info */}
            <div className="hidden sm:flex items-center space-x-2">
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium">Менеджеров М.М.</span>
              <Badge variant="secondary">Руководитель</Badge>
            </div>

            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="sm:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col space-y-4 mt-6">
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium">Менеджеров М.М.</span>
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    Руководитель
                  </Badge>
                  <Button variant="ghost" className="justify-start">
                    <LogOut className="w-5 h-5 mr-2" />
                    Выйти
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

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
                {offices.map((officeName) => (
                  <SelectItem key={officeName} value={officeName}>
                    {officeName}
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
                <SelectItem value="quarter">Квартал</SelectItem>
                <SelectItem value="year">Год</SelectItem>
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
                setNewRequestType("Обычная") // Default to "Обычная" when opening
                setShowCreateRequestModal(true)
              }}
              className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать заявку
            </Button>
          </div>
        </div>

        {/* KPI Cards - Mobile optimized grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6 mb-6 sm:mb-8">
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
            title="Ср. оценка"
            value={kpi.rating}
            icon={<Star className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />}
            delta="+0.2"
            positive
            bg="bg-yellow-100"
          />
          <StatCard
            title="Ср. SLA"
            value={kpi.sla}
            icon={<Clock className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />}
            bg="bg-purple-100"
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
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Обзор
            </TabsTrigger>
            <TabsTrigger value="offices" className="text-xs sm:text-sm">
              Офисы
            </TabsTrigger>
            <TabsTrigger value="executors" className="text-xs sm:text-sm">
              Команда
            </TabsTrigger>
            <TabsTrigger value="management" className="text-xs sm:text-sm">
              Управление
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Chart placeholder */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Динамика заявок</CardTitle>
                <CardDescription className="text-sm">Количество заявок по дням</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500 text-sm">График будет здесь</span>
                </div>
              </CardContent>
            </Card>

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
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: "75%" }}></div>
                      </div>
                      <span className="text-sm font-medium w-8">117</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Экстренные</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-red-600 h-2 rounded-full" style={{ width: "15%" }}></div>
                      </div>
                      <span className="text-sm font-medium w-8">23</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base">Плановые</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: "10%" }}></div>
                      </div>
                      <span className="text-sm font-medium w-8">16</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Уведомления</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg ${
                        alert.severity === "high"
                          ? "bg-red-50 border border-red-200"
                          : "bg-yellow-50 border border-yellow-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium flex-1 pr-2">{alert.message}</p>
                        <span className="text-xs text-gray-500 flex-shrink-0">{alert.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offices" className="space-y-4 sm:space-y-6">
            {officeStats.map((office) => (
              <Card key={office.name}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-lg sm:text-xl">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    <span className="truncate">{office.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                    <div>
                      <p className="text-xl sm:text-2xl font-bold">{office.total}</p>
                      <p className="text-xs sm:text-sm text-gray-600">Всего</p>
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">{office.completed}</p>
                      <p className="text-xs sm:text-sm text-gray-600">Завершено</p>
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-red-600">{office.overdue}</p>
                      <p className="text-xs sm:text-sm text-gray-600">Просрочено</p>
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-600">{office.rating}</p>
                      <p className="text-xs sm:text-sm text-gray-600">Оценка</p>
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{office.sla}%</p>
                      <p className="text-xs sm:text-sm text-gray-600">SLA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="executors">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg sm:text-xl">Топ исполнители</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {topExecutors.map((ex) => (
                    <div key={ex.name} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{ex.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{ex.specialty}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-bold text-sm sm:text-base">{ex.done} зав.</p>
                        <div className="flex items-center justify-end">
                          <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current mr-1" />
                          <span className="text-xs sm:text-sm text-yellow-600">{ex.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
                      placeholder="Название нового офиса (например: Сатпаева 30А)"
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
                        {offices.map((officeItem, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border"
                          >
                            <span className="font-medium text-gray-700">{officeItem}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOffice(officeItem)}
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

              {/* Manager's Created Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>Мои созданные заявки</CardTitle>
                  <CardDescription>Заявки, созданные вами</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {managerSubmittedRequests.length === 0 ? (
                    <p className="text-center text-gray-500">Вы еще не создавали заявок.</p>
                  ) : (
                    managerSubmittedRequests.map((request) => (
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
                                <p>Дата подачи: {request.date}</p>
                                {request.plannedDate && (
                                  <p className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    Плановая дата: {request.plannedDate}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => openRequestDetails(request)}>
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
                        </CardContent>
                      </Card>
                    ))
                  )}
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
                    {offices.map((officeItem) => (
                      <SelectItem key={officeItem} value={officeItem}>
                        {officeItem}
                      </SelectItem>
                    ))}
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
                    {serviceCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
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
                    {complexities.map((complexity) => (
                      <SelectItem key={complexity} value={complexity}>
                        {complexity}
                      </SelectItem>
                    ))}
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
                    {slas.map((sla) => (
                      <SelectItem key={sla} value={sla}>
                        {sla}
                      </SelectItem>
                    ))}
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
                    (newRequestType === "Плановая" && !newRequestPlannedDate) ||
                    !newRequestCategory ||
                    !newRequestComplexity ||
                    !newRequestSLA
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

      {/* Request Details Modal (for Manager) */}
      {showRequestDetailsModal && selectedRequestDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Детали заявки #{selectedRequestDetails.id}</CardTitle>
              <CardDescription>Подробная информация о заявке</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Тип заявки</Label>
                  <Badge className={getTypeColor(selectedRequestDetails.type)}>{selectedRequestDetails.type}</Badge>
                </div>
                <div>
                  <Label>Статус</Label>
                  <Badge className={getStatusColor(selectedRequestDetails.status)}>
                    {selectedRequestDetails.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Название</Label>
                <p className="text-sm font-medium">{selectedRequestDetails.title}</p>
              </div>

              {selectedRequestDetails.client && (
                <div>
                  <Label>Клиент</Label>
                  <p className="text-sm">{selectedRequestDetails.client}</p>
                </div>
              )}

              {selectedRequestDetails.executor && (
                <div>
                  <Label>Исполнитель</Label>
                  <p className="text-sm">{selectedRequestDetails.executor}</p>
                </div>
              )}

              <div>
                <Label>Локация</Label>
                <p className="text-sm">{selectedRequestDetails.location}</p>
              </div>

              <div>
                <Label>Дата подачи</Label>
                <p className="text-sm">{selectedRequestDetails.date}</p>
              </div>

              {selectedRequestDetails.category && (
                <div>
                  <Label>Категория услуги</Label>
                  <p className="text-sm">{selectedRequestDetails.category}</p>
                </div>
              )}

              {selectedRequestDetails.complexity && (
                <div>
                  <Label>Сложность</Label>
                  <p className="text-sm">{selectedRequestDetails.complexity}</p>
                </div>
              )}

              {selectedRequestDetails.sla && (
                <div>
                  <Label>SLA (Срок выполнения)</Label>
                  <p className="text-sm">{selectedRequestDetails.sla}</p>
                </div>
              )}

              {selectedRequestDetails.plannedDate && (
                <div>
                  <Label>Плановая дата выполнения</Label>
                  <p className="text-sm">{selectedRequestDetails.plannedDate}</p>
                </div>
              )}

              <div>
                <Label>Описание проблемы</Label>
                <p className="text-sm">{selectedRequestDetails.description}</p>
              </div>

              {selectedRequestDetails.photos && selectedRequestDetails.photos.length > 0 && (
                <div>
                  <Label>Фотографии</Label>
                  <div className="flex space-x-2 mt-2">
                    {selectedRequestDetails.photos.map((photo: string, index: number) => (
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

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowRequestDetailsModal(false)}>
                  Закрыть
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChatModal(true)
                    setCurrentChatRequestId(selectedRequestDetails.id)
                    setChatMessages([
                      {
                        sender: "Система",
                        text: `Чат по заявке #${selectedRequestDetails.id} открыт.`,
                        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      },
                    ])
                    setShowRequestDetailsModal(false) // Close details modal when opening chat
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Чат
                </Button>
              </div>
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
