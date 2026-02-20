"use client"

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Plus,
  XCircle,
  Hourglass,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ArrowLeft,
} from "lucide-react"
import api from "@/lib/api"
import { useRouter, useSearchParams } from "next/navigation"
import { useMediaQuery } from "@/hooks/use-media-query"
import { BottomNav } from "@/components/BottomNav"
import { useRequestStore } from "@/stores/useRequestStore"
import { RequestGroup, SubRequest } from '@/stores/useRequestStore'
import PullToRefresh from "@/components/pull-to-refresh"
import { useAuthStore } from "@/stores/useAuthStore"
import { RoleBasedActionMenu } from "@/components/action-menu/RoleBasedActionMenu"
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal"
import { RatingModal } from "@/components/RatingModal"
import { RequestCard } from "@/components/RequestCard"
import { getPreviewUrl } from '@/lib/imageOptimization'
import { CommentsModal } from "@/components/CommentsModal"
import SubRequestInfo from "@/components/SubRequestInfo"
import PhotoModal from "@/components/photo/PhotoModal"

interface Rating {
  id: number;
  rating: number;
  request_id: number;
  created_at: string;
}

export default function RequestsPage() {
  const role = useAuthStore(state => state.role)
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const requests = useRequestStore(state => state.requests)
  const addRequests = useRequestStore(state => state.addRequests)
  const clearRequests = useRequestStore(state => state.clearRequests)
  const removeRequest = useRequestStore(state => state.removeRequest)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  
  // Tab state: "create" or "my-requests"
  const [activeTab, setActiveTab] = useState<"create" | "my-requests">("create")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  const [selectedRequest, setSelectedRequest] = useState<RequestGroup | null>(null)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [requestToRate, setRequestToRate] = useState<SubRequest | null>(null)
  const [ratingComment, setRatingComment] = useState("")
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({})
  const [clientRatings, setClientRatings] = useState<Record<number, any>>({})
  
  const [requestToDelete, setRequestToDelete] = useState<RequestGroup | null>(null)
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, created_at?: string} | null>(null)
  const [expandedSubRequests, setExpandedSubRequests] = useState<Set<number>>(new Set())
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [selectedSubRequestForComments, setSelectedSubRequestForComments] = useState<SubRequest | null>(null)
  
  const observer = useRef<IntersectionObserver | null>(null)
  const lastRequestRef = useRef<HTMLDivElement>(null)

  const filteredRequests = useMemo(() => requests
    .filter((request) => {
      const statusMatch = filterStatus === "all" || 
        (filterStatus === "long_term" ? request.requests.some(req => req.is_long_term) : request.status === filterStatus)
      const requestType = request.request_type
      const typeMatch = filterType === "all" || requestType === filterType
      return statusMatch && typeMatch
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_date).getTime()
      const dateB = new Date(b.created_date).getTime()
      const safeDateA = isNaN(dateA) ? 0 : dateA
      const safeDateB = isNaN(dateB) ? 0 : dateB
      return safeDateB - safeDateA
    }), [requests, filterStatus, filterType])

  // Check rating for specific request
  const checkUserRating = useCallback(async (requestId: number) => {
    try {
      const response = await api.get(`/ratings/user/${requestId}`)
      if (response.data && response.data.length > 0) {
        const ratingData = response.data[0]
        setUserRatings(prev => ({
          ...prev,
          [requestId]: {
            ...ratingData,
            comments: ratingData.comment ? [ratingData.comment] : []
          }
        }))
      }
    } catch (error) {
      // Rating may not exist for this request
    }
  }, [])

  // Process client ratings from request groups data
  const processClientRatings = useCallback((requestGroups: RequestGroup[]) => {
    setClientRatings(prev => {
      const newRatingsData = { ...prev }
      requestGroups.forEach((requestGroup: RequestGroup) => {
        if (requestGroup.clientRatings && requestGroup.clientRatings.length > 0) {
          newRatingsData[requestGroup.id] = requestGroup.clientRatings.map((rating: any) => ({
            id: rating.id,
            rating: rating.rating,
            comment: rating.comment,
            request_group_id: requestGroup.id,
            created_at: rating.created_at,
            ratedByUser: rating.ratedByUser
          }))
        }
      })
      return newRatingsData
    })
  }, [])

  // Fetch requests
  const fetchRequests = useCallback(async (pageNum: number = 1) => {
    if (!token) return
    
    try {
      setLoading(true)
      const response = await api.get(`/request-groups?page=${pageNum}&pageSize=20`)
      
      if (pageNum === 1) {
        clearRequests()
      }
      
      const newRequests = response.data.requests || []
      addRequests(newRequests)
      
      // Process client ratings from response
      processClientRatings(newRequests)
      
      // Check user ratings for completed requests
      newRequests.forEach((requestGroup: RequestGroup) => {
        requestGroup.requests.forEach((subRequest: SubRequest) => {
          if (subRequest.status === "completed") {
            checkUserRating(subRequest.id)
          }
        })
      })
      
      setHasMore(newRequests.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }, [token, addRequests, clearRequests, processClientRatings, checkUserRating])

  useEffect(() => {
    if (user?.role !== 'client') {
      router.push('/login')
      return
    }
    
    fetchRequests(1)
  }, [user, router, fetchRequests])

  // Infinite scroll observer
  useEffect(() => {
    if (loading) return

    if (observer.current) {
      observer.current.disconnect()
    }

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        fetchRequests(page + 1)
      }
    })

    if (lastRequestRef.current) {
      observer.current.observe(lastRequestRef.current)
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [loading, hasMore, page, fetchRequests])

  const handleRefresh = async () => {
    await fetchRequests(1)
  }

  // Status helpers
  const getStatusIcon = (status: string) => {
    const iconClasses = "w-4 h-4"
    switch (status) {
      case "completed":
        return <CheckCircle className={`${iconClasses} text-green-500`} />
      case "in_progress":
        return <Clock className={`${iconClasses} text-blue-500`} />
      case "awaiting_assignment":
        return <Hourglass className={`${iconClasses} text-yellow-500`} />
      case "execution":
        return <AlertTriangle className={`${iconClasses} text-orange-500`} />
      case "rejected":
        return <XCircle className={`${iconClasses} text-red-500`} />
      default:
        return <Clock className={`${iconClasses} text-gray-500`} />
    }
  }

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': 'Завершено',
      'in_progress': 'В обработке',
      'awaiting_assignment': 'Ожидает назначения',
      'execution': 'Исполнение',
      'rejected': 'Отклонено',
      'cancelled': 'Отменено'
    }
    return statusMap[status] || status
  }

  const renderStatusWithTooltip = (status: string) => {
    const icon = getStatusIcon(status)
    const text = translateStatus(status)

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
      )
    }
    return icon
  }

  const renderLongTermWithTooltip = (isLongTerm: boolean) => {
    if (!isLongTerm) return null
    
    if (isDesktop) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-[#114A65] border-[#114A65] cursor-help">
                Долгосрочная
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Эта заявка отмечена как долгосрочная</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    return (
      <Badge variant="outline" className="text-[#114A65] border-[#114A65] text-xs">
        Долго
      </Badge>
    )
  }

  // Delete request handler
  const handleDeleteRequest = (request: RequestGroup) => {
    setRequestToDelete(request)
    setShowDeleteRequestModal(true)
  }

  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return
    
    setDeleteLoading(true)
    try {
      await api.delete(`/request-groups/${requestToDelete.id}`)
      removeRequest(requestToDelete.id)
      setShowDeleteRequestModal(false)
      setRequestToDelete(null)
    } catch (error) {
      console.error('Error deleting request:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Rating handler
  const handleRateRequest = async () => {
    if (!requestToRate || ratingValue === 0) return
    
    try {
      await api.post('/ratings', {
        request_id: requestToRate.id,
        rating: ratingValue,
        comment: ratingComment
      })
      
      setUserRatings(prev => ({
        ...prev,
        [requestToRate.id]: {
          id: Date.now(),
          rating: ratingValue,
          request_id: requestToRate.id,
          created_at: new Date().toISOString()
        }
      }))
      
      setShowRatingModal(false)
      setRatingValue(0)
      setRequestToRate(null)
      setRatingComment("")
    } catch (error) {
      console.error('Error rating request:', error)
    }
  }

  const renderCardHeader = useCallback((requestGroup: RequestGroup) => {
    const isLongTerm = requestGroup.requests.some(req => req.is_long_term)

    return (
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base leading-tight line-clamp-2 text-[#040404]">
                Заявка #{requestGroup.id}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                isLongTerm 
                  ? 'text-[#114A65] bg-[#114A65]/20' 
                  : requestGroup.request_type === 'urgent'
                    ? 'text-white bg-gradient-to-r from-[#B8400E] to-[#B8400E]/80'
                    : requestGroup.request_type === 'planned'
                      ? 'text-white bg-gradient-to-r from-[#114A65] to-[#114A65]/80'
                      : 'text-white bg-[#114A65]'
              }`}>
                {requestGroup.request_type === 'urgent' ? 'Экстренная' : requestGroup.request_type === 'planned' ? 'Плановая' : 'Обычная'}
              </span>
            </div>
          </div>
          <div className="flex gap-1 items-center">
            {renderStatusWithTooltip(requestGroup.status)}
            {isLongTerm && renderLongTermWithTooltip(true)}
            <RoleBasedActionMenu
              request={requestGroup}
              isDesktop={isDesktop}
              userRole="client"
              isSubRequest={false}
              onViewDetails={(request) => {
                setSelectedRequest(request)
              }}
              onRateRequest={(subReq) => {
                setRequestToRate(subReq)
                const currentRating = userRatings[subReq.id]?.rating || 0
                setRatingValue(currentRating)
                setRatingComment("")
                setShowRatingModal(true)
              }}
              onDelete={(request) => {
                handleDeleteRequest(request)
              }}
            />
          </div>
        </div>
      </CardHeader>
    )
  }, [isDesktop, userRatings])

  const handleCardClick = useCallback((request: RequestGroup) => {
    setSelectedRequest(request)
  }, [])

  // Request detail modal content
  const renderRequestDetail = () => {
    if (!selectedRequest) return null
    
    const subRequest = selectedRequest.requests[0]
    if (!subRequest) return null

    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-800">
            <button 
              onClick={() => setSelectedRequest(null)}
              className="p-2 rounded-full hover:bg-gray-800"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">Заявка #{selectedRequest.id}</h1>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              {getStatusIcon(selectedRequest.status)}
              <span className="text-white">{translateStatus(selectedRequest.status)}</span>
            </div>

            {/* Type badge */}
            <div>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                selectedRequest.request_type === 'urgent'
                  ? 'text-white bg-[#B8400E]'
                  : selectedRequest.request_type === 'planned'
                    ? 'text-white bg-[#114A65]'
                    : 'text-white bg-[#114A65]'
              }`}>
                {selectedRequest.request_type === 'urgent' ? 'Экстренная' : selectedRequest.request_type === 'planned' ? 'Плановая' : 'Обычная'}
              </span>
            </div>

            {/* Category */}
            {subRequest.category?.name && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Категория</p>
                <p className="text-white">{subRequest.category.name}</p>
              </div>
            )}

            {/* Description */}
            {subRequest.description && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Описание</p>
                <p className="text-white">{subRequest.description}</p>
              </div>
            )}

            {/* Location */}
            {subRequest.location && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="text-white">{subRequest.location}</p>
                </div>
              </div>
            )}

            {/* Photos */}
            {subRequest.photos && subRequest.photos.length > 0 && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-3">Фотографии</p>
                <div className="grid grid-cols-3 gap-2">
                  {subRequest.photos.map((photo: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPhoto({ url: photo.photo_url, created_at: photo.created_at })}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-800"
                    >
                      <img 
                        src={getPreviewUrl(photo.photo_url)} 
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            <div className="bg-[#1C1C1E] rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Дата создания</p>
              <p className="text-white">
                {new Date(selectedRequest.created_date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Rate button for completed requests */}
            {selectedRequest.status === 'completed' && !userRatings[subRequest.id] && (
              <Button
                onClick={() => {
                  setRequestToRate(subRequest)
                  setShowRatingModal(true)
                }}
                className="w-full bg-[#F35713] hover:bg-[#E04A0A] text-white"
              >
                Оценить заявку
              </Button>
            )}

            {/* Show rating if exists */}
            {userRatings[subRequest.id] && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Ваша оценка</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star} 
                      className={`text-xl ${star <= userRatings[subRequest.id].rating ? 'text-yellow-400' : 'text-gray-600'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh}>
        <div 
          className="min-h-screen bg-black relative z-10"
          style={{ 
            paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            minHeight: '100vh',
          }}
        >
          {/* Main content container */}
          <div 
            className="flex flex-col items-start px-3 pt-16"
            style={{ gap: '24px' }}
          >
            {/* Page Title */}
            <h1 
              style={{
                fontFamily: "'Yandex Sans Text', -apple-system, sans-serif",
                fontWeight: 700,
                fontSize: '24px',
                lineHeight: '115%',
                color: '#FFFFFF',
              }}
            >
              Сервисные заявки
            </h1>

            {/* Tab Switcher - matches Frame 1171274981 */}
            <div 
              className="flex flex-row justify-between items-center w-full"
              style={{
                height: '36px',
                background: '#262626',
                borderRadius: '10px',
              }}
            >
              {/* Create Tab - matches Frame 1171274979 */}
              <button
                onClick={() => setActiveTab("create")}
                className="flex flex-row justify-center items-center flex-1"
                style={{
                  padding: '5px 50px',
                  gap: '8px',
                  height: '36px',
                  background: activeTab === "create" ? '#909090' : 'transparent',
                  borderRadius: '10px',
                }}
              >
                <span 
                  className="text-center"
                  style={{
                    fontFamily: "'Yandex Sans Text', -apple-system, sans-serif",
                    fontWeight: 500,
                    fontSize: '10px',
                    lineHeight: '80%',
                    color: '#FFFFFF',
                  }}
                >
                  Создать заявку
                </span>
              </button>

              {/* My Requests Tab - matches Frame 1171274980 */}
              <button
                onClick={() => setActiveTab("my-requests")}
                className="flex flex-row justify-center items-center flex-1"
                style={{
                  padding: '5px 38px',
                  gap: '8px',
                  height: '36px',
                  background: activeTab === "my-requests" ? '#909090' : 'transparent',
                  borderRadius: '10px',
                }}
              >
                <span 
                  className="text-center"
                  style={{
                    fontFamily: "'Yandex Sans Text', -apple-system, sans-serif",
                    fontWeight: 500,
                    fontSize: '10px',
                    lineHeight: '80%',
                    color: '#FFFFFF',
                  }}
                >
                  Мои заявки
                </span>
              </button>
            </div>

            {/* Content based on active tab */}
            {activeTab === "create" ? (
              /* Create Request Content - matches Frame 1171275004 */
              <div 
                className="flex flex-col items-start w-full"
                style={{ gap: '16px' }}
              >
                {/* Title - matches Frame 1171274962 */}
                <h2 
                  style={{
                    fontFamily: "'Yandex Sans Text', -apple-system, sans-serif",
                    fontWeight: 700,
                    fontSize: '16px',
                    lineHeight: '115%',
                    color: '#FFFFFF',
                  }}
                >
                  Все сценарий
                </h2>

                {/* Create Button - matches Frame 1171275005 */}
                <button
                  onClick={() => router.push('/create-request')}
                  className="flex flex-row justify-center items-center w-full"
                  style={{
                    padding: '15px 138px',
                    gap: '8px',
                    height: '42px',
                    background: '#F35713',
                    borderRadius: '10px',
                  }}
                >
                  <span 
                    style={{
                      fontFamily: "'Yandex Sans Text', -apple-system, sans-serif",
                      fontWeight: 700,
                      fontSize: '10px',
                      lineHeight: '115%',
                      color: '#FFFFFF',
                    }}
                  >
                    Создать заявку
                  </span>
                </button>
              </div>
            ) : (
              /* My Requests Content */
              <div className="flex flex-col items-start w-full" style={{ gap: '16px' }}>
                {/* Title */}
                <h2 
                  style={{
                    fontFamily: "'Yandex Sans Text', -apple-system, sans-serif",
                    fontWeight: 700,
                    fontSize: '16px',
                    lineHeight: '115%',
                    color: '#FFFFFF',
                  }}
                >
                  Все заявки
                </h2>

                {/* Filters */}
                <div className="flex gap-2 w-full">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger 
                      className="flex-1 border-0 text-white"
                      style={{
                        background: '#262626',
                        borderRadius: '10px',
                        height: '36px',
                      }}
                    >
                      <SelectValue placeholder="Статус" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#262626] border-gray-700">
                      <SelectItem value="all" className="text-white">Все</SelectItem>
                      <SelectItem value="in_progress" className="text-white">В обработке</SelectItem>
                      <SelectItem value="awaiting_assignment" className="text-white">Ожидает</SelectItem>
                      <SelectItem value="execution" className="text-white">Исполнение</SelectItem>
                      <SelectItem value="completed" className="text-white">Завершено</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger 
                      className="flex-1 border-0 text-white"
                      style={{
                        background: '#262626',
                        borderRadius: '10px',
                        height: '36px',
                      }}
                    >
                      <SelectValue placeholder="Тип" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#262626] border-gray-700">
                      <SelectItem value="all" className="text-white">Все</SelectItem>
                      <SelectItem value="normal" className="text-white">Обычная</SelectItem>
                      <SelectItem value="urgent" className="text-white">Экстренная</SelectItem>
                      <SelectItem value="planned" className="text-white">Плановая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Request list */}
                <div className="space-y-3 w-full pb-4">
                  {loading && filteredRequests.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F35713]"></div>
                    </div>
                  ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p>У вас пока нет заявок</p>
                      <button
                        onClick={() => setActiveTab("create")}
                        className="mt-4 px-6 py-3 text-white"
                        style={{
                          background: '#F35713',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '10px',
                        }}
                      >
                        Создать первую заявку
                      </button>
                    </div>
                  ) : (
                    filteredRequests.map((requestGroup, index) => {
                      const isLast = index === filteredRequests.length - 1
                      return (
                        <RequestCard
                          key={`request-${requestGroup.id}`}
                          request={requestGroup}
                          onCardClick={handleCardClick}
                          renderCardHeader={renderCardHeader}
                          isLast={isLast}
                          lastElementRef={isLast ? lastRequestRef as React.RefObject<HTMLDivElement> : undefined}
                          clientRating={clientRatings[requestGroup.id]}
                          userRole="client"
                          variant="compact"
                        />
                      )
                    })
                  )}
                  
                  {/* Loading more indicator */}
                  {loading && filteredRequests.length > 0 && (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F35713]"></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      {/* Нижняя подложка под навбар — закрывает safe area, чтобы не было белой полосы */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-0 bg-black"
        style={{ height: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}
      />

      {/* Bottom Navigation */}
      {!isDesktop && <BottomNav activeTab="requests" />}

      {/* Request Detail Modal */}
      {selectedRequest && renderRequestDetail()}

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          selectedPhoto={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => {
          setShowRatingModal(false)
          setRatingValue(0)
          setRequestToRate(null)
          setRatingComment("")
        }}
        onSubmit={handleRateRequest}
        ratingValue={ratingValue}
        onRatingChange={setRatingValue}
        comment={ratingComment}
        onCommentChange={setRatingComment}
        title="Оцените заявку"
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteRequestModal}
        onClose={() => {
          setShowDeleteRequestModal(false)
          setRequestToDelete(null)
        }}
        onConfirm={confirmDeleteRequest}
        title="Удалить заявку?"
        description="Вы уверены, что хотите удалить эту заявку? Это действие нельзя отменить."
        isLoading={deleteLoading}
      />
    </>
  )
}
