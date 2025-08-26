'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Calendar, User, CheckCircle, Pause, Play, History, FileText, ChevronDown, ChevronUp, MessageCircle, Zap, XCircle, Hourglass, MapPin, Edit, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { RecurringTask, getExecutors } from '@/lib/api';
import { RoleBasedActionMenu } from '@/components/action-menu';
import { TaskInstancesList } from './TaskInstancesList';
import { AssignExecutorsModal } from '@/components/AssignExecutorsModal';
import { CommentsModal } from '@/components/CommentsModal';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/useAuthStore';


interface RecurringTaskDetailsProps {
  task: RecurringTask;
  userRole: string;
  isDesktop: boolean;
  onClose: () => void;
  onRateRequest?: (request: any) => void;
  onRedirectToOtherDepartment?: (request: any) => void;
  onAssignExecutor?: (request: any) => void;
  onDeleteTask?: (taskId: number) => void;
  // Убираем onToggleLongTerm для повторяющихся задач
  showComments?: number | null;
  setShowComments?: (id: number | null) => void;
  formErrors?: string | null;
  onShowMap?: (location: { lat: number; lon: number; accuracy: number }) => void;
  onRefreshTask?: () => void; // Функция для обновления данных задачи
}

export const RecurringTaskDetails: React.FC<RecurringTaskDetailsProps> = ({
  task,
  userRole,
  isDesktop,
  onClose,
  onRateRequest,
  onRedirectToOtherDepartment,
  onAssignExecutor,
  onDeleteTask,
  // Убираем onToggleLongTerm для повторяющихся задач
  showComments: externalShowComments,
  setShowComments: externalSetShowComments,
  formErrors,
  onShowMap,
  onRefreshTask
}) => {
  const [expandedSubRequests, setExpandedSubRequests] = useState<Set<number>>(new Set());
  const [internalShowComments, setInternalShowComments] = useState<number | null>(null);
  const [showInstances, setShowInstances] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showAssignExecutorsModal, setShowAssignExecutorsModal] = useState(false);
  const [selectedSubRequest, setSelectedSubRequest] = useState<any>(null);
  const [executors, setExecutors] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthStore();
  
  // Для Portal
  useEffect(() => {
    setMounted(true)
  }, []);
  
  // Используем внешние состояния, если они переданы, иначе внутренние
  const showComments = externalShowComments !== undefined ? externalShowComments : internalShowComments;
  const setShowComments = externalSetShowComments || setInternalShowComments;



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
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'awaiting_assignment':
        return 'bg-yellow-100 text-yellow-800';
      case 'execution':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      case 'recurring':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'В обработке';
      case 'awaiting_assignment':
        return 'Ожидает назначения';
      case 'assigned':
        return 'Назначена';
      case 'execution':
        return 'Исполнение';
      case 'completed':
        return 'Завершено';
      case 'rejected':
        return 'Отклонено';
      default:
        return status;
    }
  };

  const translateType = (type: string) => {
    switch (type) {
      case 'normal':
        return 'Обычная';
      case 'urgent':
        return 'Экстренная';
      case 'planned':
        return 'Плановая';
      case 'recurring':
        return 'Повторяющаяся';
      default:
        return type;
    }
  };

  const renderStatusWithTooltip = (status: string) => {
    const icon = getStatusIcon(status);
    const text = translateStatus(status);

    return (
      <div className="flex items-center gap-1 cursor-pointer p-1 rounded">
        {icon}
      </div>
    );
  };

  const renderLongTermWithTooltip = (isLongTerm: boolean) => {
    if (!isLongTerm) return null;
    
    return (
      <div className="flex items-center gap-1 cursor-pointer p-1 rounded">
        <Clock className="w-3 h-3 text-blue-600" />
      </div>
    );
  };

  const getRecurrenceText = (type: string, interval: number) => {
    switch (type) {
      case 'daily':
        return interval === 1 ? 'Ежедневно' : `Каждые ${interval} дней`;
      case 'weekly':
        return interval === 1 ? 'Еженедельно' : `Каждые ${interval} недель`;
      case 'monthly':
        return interval === 1 ? 'Ежемесячно' : `Каждые ${interval} месяцев`;
      case 'yearly':
        return interval === 1 ? 'Ежегодно' : `Каждые ${interval} лет`;
      default:
        return `${type} каждые ${interval}`;
    }
  };

  const getNextDueDate = (task: RecurringTask) => {
    if (!task.next_due_date) return 'Не установлена';
    return format(new Date(task.next_due_date), 'dd.MM.yyyy', { locale: ru });
  };

  // Функция для загрузки исполнителей
  const loadExecutors = async () => {
    try {
      const response = await getExecutors();
      setExecutors(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке исполнителей:', error);
    }
  };

  // Обработчик для открытия модального окна назначения исполнителей
  const handleEditExecutors = (subRequest: any) => {
    setSelectedSubRequest(subRequest);
    loadExecutors();
    setShowAssignExecutorsModal(true);
  };

  // Обработчик успешного назначения исполнителей
  const handleExecutorsAssigned = () => {
    setShowAssignExecutorsModal(false);
    setSelectedSubRequest(null);
    
    // Обновляем данные задачи после назначения исполнителей
    if (onRefreshTask) {
      onRefreshTask();
    }
    
    // Показываем уведомление об успехе
    toast({
      title: 'Успешно',
      description: 'Исполнители успешно назначены',
    });
  };

      return (
      <div className={`${isDesktop ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50' : 'fixed inset-0 bg-white z-50'} ${isDesktop ? '' : 'flex flex-col'}`} onClick={() => {
        if (isDesktop) onClose();
      }}>
        <Card className={`${isDesktop ? 'w-full max-w-2xl max-h-[90vh] overflow-y-auto' : 'w-full h-full flex flex-col'} ${isDesktop ? '' : 'rounded-none border-0 shadow-none'}`} onClick={(e) => e.stopPropagation()}>
                  <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="font-medium text-gray-900 text-base sm:text-lg">Повторяющаяся задача #{task.id}</CardTitle>
              {!isDesktop && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className={`space-y-3 pb-2 p-4 sm:p-6 ${isDesktop ? '' : 'flex-1 overflow-y-auto pb-6'}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Тип заявки</Label>
              <Badge className={getTypeColor(task.request_type)}>{translateType(task.request_type)}</Badge>
            </div>
            <div>
              <Label>Статус</Label>
              <Badge className={`${getStatusColor(task.status)} whitespace-nowrap`}>{translateStatus(task.status)}</Badge>
            </div>
          </div>

          {/* Информация о повторяющейся задаче */}
          <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <Clock className="w-4 h-4 text-purple-600" />
            <div>
              <Label className="text-sm font-medium text-purple-800">Повторение: </Label>
              <span className="text-sm text-purple-700">
                {getRecurrenceText(task.recurrence_type, task.recurrence_interval)}
              </span>
            </div>
          </div>

          {/* Следующая дата выполнения */}
          {task.next_due_date && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <Label className="text-sm font-medium text-blue-800">Следующая дата: </Label>
                <span className="text-sm text-blue-700">
                  {getNextDueDate(task)}
                </span>
              </div>
            </div>
          )}
          

          {/* Клиент */}
          {task.client && (
            <div>
              <Label>Клиент</Label>
              <p className="text-sm text-gray-600 mt-1">{task.client.name}</p>
            </div>
          )}

          {/* Локация в офисе */}
          <div>
            <Label className="font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">Локация в офисе</Label>
            <p className="text-sm">{task.location_detail}</p>
          </div>
          {/* Кнопка "Показать на карте" - показываем только если есть координаты */}
          {task.location && task.location.includes('Широта:') && task.location.includes('Долгота:') && (
            <div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const locText = task.location;
                    const latMatch = locText.match(/Широта: (-?\d+\.\d+)/);
                    const lonMatch = locText.match(/Долгота: (-?\d+\.\d+)/);
                    const accMatch = locText.match(/±(\d+) м/);

                    if (latMatch && lonMatch && accMatch && onShowMap) {
                      onShowMap({
                        lat: parseFloat(latMatch[1]),
                        lon: parseFloat(lonMatch[1]),
                        accuracy: parseInt(accMatch[1])
                      });
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
          )}

          {/* Дата создания */}
          <div className="flex items-center font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">
            <Clock className="w-4 h-4 mr-1" />
            {task.created_date && new Date(task.created_date).toLocaleString("ru-RU", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </div>

          {/* Фотографии группы заявок (только before) */}
          {task.photos && task.photos.filter((photo: any) => photo.type === 'before').length > 0 && (
            <div className="mt-4">
              <Label className="font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">Фотографии (до выполнения)</Label>
              <div className="flex space-x-2 mt-2 flex-wrap">
                {task.photos
                  .filter((photo: any) => photo.type === 'before')
                  .map((photo: any, index: number) => (
                    <img
                      key={index}
                      src={photo.photo_url || "/placeholder.svg"}
                      alt={`Фото ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-purple-400 transition-colors"
                      onClick={() => {
                        setSelectedPhoto(photo.photo_url);
                      }}
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Фотографии группы заявок (только after) */}
          {task.photos && task.photos.filter((photo: any) => photo.type === 'after').length > 0 && (
            <div className="mt-4">
              <Label className="font-medium text-sm sm:text-base mb-3 sm:mb-4 text-gray-900">Фотографии (после выполнения)</Label>
              <div className="flex space-x-2 mt-2 flex-wrap">
                {task.photos
                  .filter((photo: any) => photo.type === 'after')
                  .map((photo: any, index: number) => (
                    <img
                      key={index}
                      src={photo.photo_url || "/placeholder.svg"}
                      alt={`Фото ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-purple-400 transition-colors"
                      onClick={() => {
                        setSelectedPhoto(photo.photo_url);
                      }}
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Модальное окно для просмотра фото */}
          {selectedPhoto && (
            <div
              className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
              onClick={() => {setSelectedPhoto(null);}}
            >
              <img
                src={selectedPhoto}
                alt="Увеличенное фото"
                className="max-w-full max-h-full rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Подзаявки */}
          <div>
            <Label className={isDesktop ? '' : 'text-base font-medium'}>Подзаявки</Label>
            <div className={`space-y-3 mt-2 ${isDesktop ? '' : 'space-y-4'}`}>
              {task.requests && task.requests.length > 0 ? (
                task.requests.map((subRequest) => {
                  const isExpanded = expandedSubRequests.has(subRequest.id);
                  const hasComments = showComments === subRequest.id;

                  return (
                    <div key={subRequest.id} className={`border rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 ${isDesktop ? 'border-gray-200' : 'border-gray-200'}`}>
                      {/* Заголовок подзаявки */}
                      <div className={`p-5 ${isDesktop ? '' : 'p-5'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className={`font-semibold text-gray-900 ${isDesktop ? 'text-base' : 'text-md'}`}>#{subRequest.id} {subRequest.title}</h4>
                            </div>
                            <div className={`${isDesktop ? 'flex items-center gap-3' : 'flex flex-col gap-1'} text-gray-600 ${isDesktop ? 'text-sm' : 'text-base'}`}>
                              <span className={`${isDesktop ? 'truncate' : ''} flex items-center gap-1`}>
                                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                {subRequest.category?.name || 'Без категории'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {renderStatusWithTooltip(subRequest.status)}
                            {/* Скрываем информацию о долгосрочных задачах для повторяющихся задач */}

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

                            {/* Отладочная информация для меню */}
                        
                            <RoleBasedActionMenu
                              request={subRequest}
                              requestGroup={task}
                              isDesktop={isDesktop}
                              userRole={userRole}
                              isSubRequest={true}
                              onRateRequest={onRateRequest}
                              onRedirectToOtherDepartment={onRedirectToOtherDepartment}
                              onAssignExecutor={onAssignExecutor}
                              // Убираем onToggleLongTerm для повторяющихся задач
                            />
                          </div>
                        </div>

                        {/* Краткое описание */}
                        <div className={`text-gray-600 mb-3 ${isDesktop ? 'text-sm' : 'text-base leading-relaxed'}`}>
                          {isDesktop ? (
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
                           {/* Полное описание */}
                           <div className="text-gray-600 text-sm whitespace-pre-wrap break-words">
                             {subRequest.description}
                           </div>
                           
                           {/* Дополнительная информация */}
                           <div className="mt-4 space-y-2">
                             <div className="flex justify-between text-sm">
                               <span className="text-gray-500">ID подзаявки:</span>
                               <span className="font-medium">{subRequest.id}</span>
                             </div>
                             <div className="flex justify-between text-sm">
                               <span className="text-gray-500">Категория:</span>
                               <span className="font-medium">{subRequest.category?.name || 'Не указана'}</span>
                             </div>
                             {/* Скрываем информацию о долгосрочных задачах для повторяющихся задач */}
                           </div>

                           {/* Исполнители */}
                           <div className="mt-4">
                             <div className="flex items-center justify-between mb-3">
                               <h5 className="font-medium text-sm text-gray-900">Исполнители:</h5>
                                                               {(userRole === 'manager' || userRole === 'department-head' || userRole === 'admin') &&
                                 ( subRequest.status === 'assigned') && (
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => handleEditExecutors(subRequest)}
                                   className="h-7 px-2 text-xs"
                                 >
                                   <Edit className="w-3 h-3 mr-1" />
                                   Изменить
                                 </Button>
                               )}
                             </div>
                             {subRequest.requestExecutors && subRequest.requestExecutors.length > 0 ? (
                               <div className="space-y-1">
                                 {subRequest.requestExecutors.map((requestExecutor: any, index: number) => (
                                   <div
                                     key={index}
                                     className="flex items-start sm:items-center justify-between py-2 sm:py-3 px-0 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors duration-200"
                                   >
                                     <div className="flex items-start sm:items-center gap-2 sm:gap-3 w-full">
                                       <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                                         <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                                       </div>
                                       <div className="flex-1 min-w-0">
                                         <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                           <span className="text-sm sm:text-sm font-medium text-gray-900 truncate">
                                             {requestExecutor.executor?.user?.full_name
                                               .split(" ")
                                               .map((word: string, idx: number) => (idx === 0 ? word : `${word.charAt(0)}.`))
                                               .join(" ")}
                                             {requestExecutor.role === "leader" && (
                                               <span className="text-xs text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full self-start sm:self-auto ml-1">
                                                 Ответственный
                                               </span>
                                             )}
                                           </span>
                                         </div>
                                         {requestExecutor.executor?.user?.email && (
                                           <div className="text-xs text-gray-500 mt-1 sm:mt-0.5">{requestExecutor.executor.user.email}</div>
                                         )}
                                       </div>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <div className="text-center py-4 text-gray-500 text-sm">
                                 Исполнители не назначены
                               </div>
                             )}
                           </div>
                         </div>
                       )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Подзаявки не найдены</p>
                </div>
              )}
            </div>
          </div>
          

          {/* Кнопки действий */}
          <div className={`flex flex-col gap-2 pt-1 pb-1 ${isDesktop ? '' : 'mt-auto'}`}>
            {task.recurring_status === 'active' ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Pause className="h-4 w-4 mr-1" />
                Приостановить задачу
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Play className="h-4 w-4 mr-1" />
                Возобновить задачу
              </Button>
            )}
            
            {/* Кнопка удаления для админа */}
            {userRole === 'admin-worker' && onDeleteTask && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Удалить задачу
              </Button>
            )}
            
            {/* Кнопка закрытия - только для десктопа */}
            {isDesktop && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="w-full mt-1"
              >
                Закрыть
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Модальное окно с историей экземпляров */}
      <Dialog open={showInstances} onOpenChange={setShowInstances}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-2 sm:p-4 md:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="text-base sm:text-lg md:text-xl">
              История выполнения
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] sm:max-h-[70vh] overflow-y-auto">
            <TaskInstancesList taskId={task.id} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно назначения исполнителей */}
      <AssignExecutorsModal
        isOpen={showAssignExecutorsModal}
        onClose={() => {
          setShowAssignExecutorsModal(false);
          setSelectedSubRequest(null);
        }}
        subRequest={selectedSubRequest}
        executors={executors}
        onSuccess={handleExecutorsAssigned}
      />

      {/* Модальное окно подтверждения удаления */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Вы уверены, что хотите удалить эту повторяющуюся задачу? Это действие нельзя отменить.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (onDeleteTask) {
                  onDeleteTask(task.id);
                  onClose();
                }
                setShowDeleteConfirm(false);
              }}
            >
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      {isDesktop ? (
        <CommentsModal
          isOpen={!!showComments}
          onClose={() => {
            setShowComments(null);
          }}
          requestId={showComments}
          currentUserId={user?.id || null}
          isDesktop={isDesktop}
        />
      ) : (
        // Мобильная версия через Portal
        mounted && showComments && createPortal(
          <CommentsModal
            isOpen={!!showComments}
            onClose={() => {
              setShowComments(null);
            }}
            requestId={showComments}
            currentUserId={user?.id || null}
            isDesktop={isDesktop}
          />,
          document.body
        )
      )}
    </div>
  );
};
