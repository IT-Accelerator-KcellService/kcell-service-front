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
  MessageCircle,
  Calendar as CalendarLucid,
  Star,
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
import Executors from "@/components/Executors"
import { CompletedTaskReport } from "@/components/CompletedTaskReport"
import { MapModal } from "@/components/MapModal"
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
  const isGuest = useAuthStore(state => state.isGuest)
  const requests = useRequestStore(state => state.requests)
  const addRequests = useRequestStore(state => state.addRequests)
  const clearRequests = useRequestStore(state => state.clearRequests)
  const removeRequest = useRequestStore(state => state.removeRequest)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  
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
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapLocation, setMapLocation] = useState({ lat: 0, lon: 0, accuracy: 0 })
  const [showComments, setShowComments] = useState<number | null>(null)
  
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
    if (isGuest) {
      setLoading(true)
      if (pageNum === 1) {
        // Не очищаем стор — показываем локально созданные заявки гостя
      }
      setHasMore(false)
      setPage(1)
      setLoading(false)
      return
    }
    if (!token) return
    try {
      setLoading(true)
      const response = await api.get(`/request-groups?page=${pageNum}&pageSize=20`)
      if (pageNum === 1) clearRequests()
      const newRequests = response.data.requests || []
      addRequests(newRequests)
      processClientRatings(newRequests)
      newRequests.forEach((requestGroup: RequestGroup) => {
        requestGroup.requests.forEach((subRequest: SubRequest) => {
          if (subRequest.status === "completed") checkUserRating(subRequest.id)
        })
      })
      setHasMore(newRequests.length === 20)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }, [token, isGuest, addRequests, clearRequests, processClientRatings, checkUserRating])

  useEffect(() => {
    if (user?.role !== 'client' && !isGuest) {
      router.push('/login')
      return
    }
    fetchRequests(1)
  }, [user, isGuest, router, fetchRequests])

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
      if (isGuest) {
        removeRequest(requestToDelete.id)
        setShowDeleteRequestModal(false)
        setRequestToDelete(null)
        return
      }
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
    if (role === "client" && !isDesktop && !isGuest) {
      router.push(`/client/requests/${request.id}`)
      return
    }
    setSelectedRequest(request)
  }, [role, isDesktop, isGuest, router])

  // Request detail modal content — все данные как на десктопе (client/page)
  const renderRequestDetail = () => {
    if (!selectedRequest) return null
    
    const subRequest = selectedRequest.requests[0]
    if (!subRequest) return null
    const hasComments = showComments === subRequest.id

    return (
      <div className="fixed inset-0 z-[100] bg-[#1C1C1E]" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-800">
            <button 
              onClick={() => {
                setSelectedRequest(null)
                setShowComments(null)
              }}
              className="p-2 rounded-full hover:bg-gray-800"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white flex-1">Заявка #{selectedRequest.id}</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (hasComments) setShowComments(null)
                  else setShowComments(subRequest.id)
                }}
                className="p-2 rounded-full hover:bg-gray-800"
              >
                <MessageCircle className={`w-5 h-5 ${hasComments ? 'text-[#F35713]' : 'text-gray-400'}`} />
              </button>
              <RoleBasedActionMenu
                request={subRequest}
                requestGroup={selectedRequest}
                isDesktop={false}
                userRole="client"
                isSubRequest={true}
                onRateRequest={(subReq) => {
                  setRequestToRate(subReq)
                  setRatingValue(userRatings[subReq.id]?.rating || 0)
                  setRatingComment("")
                  setShowRatingModal(true)
                }}
                onDelete={() => {
                  setRequestToDelete(selectedRequest)
                  setShowDeleteRequestModal(true)
                }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Status + Type */}
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusIcon(selectedRequest.status)}
              <span className="text-white">{translateStatus(selectedRequest.status)}</span>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                selectedRequest.request_type === 'urgent'
                  ? 'text-white bg-[#B8400E]'
                  : selectedRequest.request_type === 'planned'
                    ? 'text-white bg-[#114A65]'
                    : 'text-white bg-[#114A65]'
              }`}>
                {selectedRequest.request_type === 'urgent' ? 'Экстренная' : selectedRequest.request_type === 'planned' ? 'Плановая' : 'Обычная'}
              </span>
              {(subRequest.is_long_term || selectedRequest.requests?.some((r: SubRequest) => r.is_long_term)) && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full text-[#114A65] border border-[#114A65]">Долгосрочная</span>
              )}
            </div>

            {/* Запланировано на (для плановых) */}
            {selectedRequest.request_type === 'planned' && selectedRequest.planned_date && (
              <div className="bg-[#1C1C1E] rounded-xl p-4 flex items-center gap-2">
                <CalendarLucid className="w-4 h-4 text-[#114A65]" />
                <div>
                  <p className="text-gray-400 text-sm">Запланировано на</p>
                  <p className="text-white">
                    {new Date(selectedRequest.planned_date).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Заголовок подзаявки + категория */}
            {subRequest.title && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Заявка</p>
                <p className="text-white font-medium">{subRequest.title}</p>
                {subRequest.category?.name && (
                  <p className="text-gray-400 text-sm mt-1">{subRequest.category.name}</p>
                )}
              </div>
            )}

            {/* Category (если нет title) */}
            {!subRequest.title && subRequest.category?.name && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Категория</p>
                <p className="text-white">{subRequest.category.name}</p>
              </div>
            )}

            {/* Description */}
            {subRequest.description && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Описание</p>
                <p className="text-white whitespace-pre-wrap break-words">{subRequest.description}</p>
              </div>
            )}

            {/* Сложность / SLA (SubRequestInfo) */}
            {(subRequest.complexity || subRequest.sla) && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-2">Доп. информация</p>
                <div className="flex flex-wrap gap-3 text-white text-sm">
                  {subRequest.complexity && (
                    <span>Сложность: {subRequest.complexity === 'complex' ? 'комплексный' : subRequest.complexity === 'simple' ? 'простой' : subRequest.complexity === 'medium' ? 'средний' : subRequest.complexity}</span>
                  )}
                  {subRequest.sla && <span>Срок: {subRequest.sla}</span>}
                </div>
              </div>
            )}

            {/* Исполнители */}
            <div className="bg-[#1C1C1E] rounded-xl p-4">
              {(subRequest.executors && subRequest.executors.length > 0) || subRequest.executor ? (
                <Executors subRequest={subRequest} userRatings={userRatings} />
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-1">Исполнители</p>
                  <p className="text-white/80 text-sm">Исполнители не назначены</p>
                </>
              )}
            </div>

            {/* Отчёт о выполнении (для завершённых) */}
            {subRequest.status === 'completed' && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <CompletedTaskReport
                  subRequest={subRequest}
                  isDesktop={false}
                  onPhotoClick={(url) => setSelectedPhoto({ url, created_at: undefined })}
                />
              </div>
            )}

            {/* Локация в офисе */}
            {selectedRequest.location_detail && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Локация в офисе</p>
                <p className="text-white">{selectedRequest.location_detail}</p>
              </div>
            )}

            {/* Location + Показать на карте */}
            {selectedRequest.location && (
              <div className="bg-[#1C1C1E] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="text-white text-sm">Координаты заявки</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const locText = selectedRequest.location
                    const latMatch = locText?.match(/Широта: (-?\d+\.\d+)/)
                    const lonMatch = locText?.match(/Долгота: (-?\d+\.\d+)/)
                    const accMatch = locText?.match(/±(\d+) м/)
                    if (latMatch && lonMatch && accMatch) {
                      setMapLocation({
                        lat: parseFloat(latMatch[1]),
                        lon: parseFloat(lonMatch[1]),
                        accuracy: parseInt(accMatch[1], 10)
                      })
                      setShowMapModal(true)
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#262626] border border-gray-600 text-white text-sm font-medium active:bg-gray-700"
                >
                  <MapPin className="w-4 h-4" />
                  Показать на карте
                </button>
              </div>
            )}

            {/* Дата создания */}
            <div className="bg-[#1C1C1E] rounded-xl p-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-white">
                {new Date(selectedRequest.created_date).toLocaleString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Фотографии до выполнения (группа заявок) */}
            {selectedRequest.photos && selectedRequest.photos.filter((p: any) => p.type === 'before').length > 0 && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-3">Фотографии (до выполнения)</p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedRequest.photos
                    .filter((p: any) => p.type === 'before')
                    .map((photo: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedPhoto({ url: photo.photo_url, created_at: photo.created_at })}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-800"
                      >
                        <img src={getPreviewUrl(photo.photo_url)} alt={`До ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Фотографии после выполнения */}
            {selectedRequest.photos && selectedRequest.photos.filter((p: any) => p.type === 'after').length > 0 && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-3">Фотографии (после выполнения)</p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedRequest.photos
                    .filter((p: any) => p.type === 'after')
                    .slice(0, 10)
                    .map((photo: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedPhoto({ url: photo.photo_url, created_at: photo.created_at })}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-800"
                      >
                        <img src={getPreviewUrl(photo.photo_url)} alt={`После ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Если нет photos на группе — показываем с подзаявки */}
            {(!selectedRequest.photos || selectedRequest.photos.length === 0) && subRequest.photos && subRequest.photos.length > 0 && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-3">Фотографии</p>
                <div className="grid grid-cols-3 gap-2">
                  {subRequest.photos.map((photo: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPhoto({ url: photo.photo_url, created_at: photo.created_at })}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-800"
                    >
                      <img src={getPreviewUrl(photo.photo_url)} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Оценки от исполнителей (clientRatings) */}
            {selectedRequest.status === 'completed' && clientRatings[selectedRequest.id] && Array.isArray(clientRatings[selectedRequest.id]) && clientRatings[selectedRequest.id].length > 0 && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <p className="text-white font-medium">Оценки от исполнителей ({clientRatings[selectedRequest.id].length})</p>
                </div>
                <div className="space-y-3">
                  {clientRatings[selectedRequest.id].map((rating: any, index: number) => (
                    <div key={rating.id || index} className={index > 0 ? 'pt-3 border-t border-gray-700' : ''}>
                      <div className="flex items-center gap-2 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`text-lg ${star <= rating.rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                        ))}
                        <span className="text-gray-400 text-sm">{rating.rating} из 5</span>
                      </div>
                      {rating.comment && <p className="text-gray-300 text-sm break-words">"{rating.comment}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Кнопка оценить / ваша оценка */}
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
            {userRatings[subRequest.id] && (
              <div className="bg-[#1C1C1E] rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-1">Ваша оценка</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-xl ${star <= userRatings[subRequest.id].rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
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

            {/* Мои заявки - единый раздел */}
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
                  Мои заявки
                </h2>

                {/* Create Button */}
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
                    <SelectContent className="z-[110] bg-[#262626] border-gray-700">
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
                    <SelectContent className="z-[110] bg-[#262626] border-gray-700">
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
                        onClick={() => router.push('/create-request')}
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

      {/* Map Modal */}
      <MapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        mapLocation={mapLocation}
      />

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showComments !== null}
        onClose={() => setShowComments(null)}
        requestId={showComments}
        currentUserId={user?.id ?? null}
        isDesktop={false}
      />

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
