'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Calendar, User, CheckCircle, Pause, Play, History, UserPlus, UserCog, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getRecurringTasks, toggleRecurringTask, RecurringTask } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TaskInstancesList } from './TaskInstancesList';
import { RecurringTaskDetails } from './RecurringTaskDetails';
import { CommentsModal } from '@/components/CommentsModal';
import { useAuthStore } from '@/stores/useAuthStore';

interface RecurringTasksListProps {
  userRole?: string;
  isDesktop?: boolean;
  onShowDetails?: (task: RecurringTask) => void;
  onRateRequest?: (request: any) => void;
  onRedirectToOtherDepartment?: (request: any) => void;
  onAssignExecutor?: (request: any) => void;
  onToggleLongTerm?: (requestId: number, requestGroupId: number, currentStatus: boolean) => void;
  onShowMap?: (location: { lat: number; lon: number; accuracy: number }) => void;
  onDeleteTask?: (taskId: number) => void;
  openModal?: (name: string) => void;
  closeModalWithHistory?: () => void;
}

export const RecurringTasksList: React.FC<RecurringTasksListProps> = ({ 
  userRole, 
  isDesktop = false,
  onShowDetails, 
  onRateRequest,
  onRedirectToOtherDepartment,
  onAssignExecutor,
  onToggleLongTerm,
  onShowMap,
  onDeleteTask,
  openModal,
  closeModalWithHistory
}) => {
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInstances, setShowInstances] = useState(false);
  const [selectedTask, setSelectedTask] = useState<RecurringTask | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showComments, setShowComments] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthStore();

  // Для Portal
  useEffect(() => {
    setMounted(true)
  }, []);

  // Обработка закрытия модального окна через историю браузера
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      console.log('RecurringTasksList popstate event:', event.state);
      
      // Если модальное окно деталей открыто и нет информации о модальном окне в истории
      if (selectedTask && !event.state?.modal) {
        console.log('Closing RecurringTaskDetails via popstate');
        setSelectedTask(null);
        setShowComments(null);
        setFormErrors(null);
      }
      
      // Если модальное окно истории открыто и нет информации о модальном окне в истории
      if (showInstances && !event.state?.modal) {
        console.log('Closing task history modal via popstate');
        setShowInstances(false);
        setSelectedTask(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedTask, showInstances]);

  const fetchTasks = async () => {
    try {
      const response = await getRecurringTasks();
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить повторяющиеся задачи',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggleTask = async (taskId: number, action: 'pause' | 'resume') => {
    try {
      await toggleRecurringTask(taskId, action);
      toast({
        title: 'Успешно',
        description: `Задача ${action === 'pause' ? 'приостановлена' : 'возобновлена'}`,
      });
      fetchTasks();
    } catch (error) {
      console.error('Ошибка переключения статуса:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус задачи',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (taskId: number) => {
    setTaskToDelete(taskId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (taskToDelete && onDeleteTask) {
      try {
        await onDeleteTask(taskToDelete);
        setShowDeleteConfirm(false);
        setTaskToDelete(null);
        fetchTasks(); // Обновляем список после удаления
      } catch (error) {
        console.error('Ошибка при удалении задачи:', error);
      }
    }
  };



  const getStatusBadge = (task: RecurringTask) => {
    // Используем recurring_status для отображения
    switch (task.recurring_status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 whitespace-nowrap">Активна</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800 whitespace-nowrap">Приостановлена</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800 whitespace-nowrap">Завершена</Badge>;
      default:
        return <Badge variant="secondary" className="whitespace-nowrap">{task.recurring_status}</Badge>;
    }
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

  const getCleanLocation = (location: string) => {
    // Убираем координаты из локации, оставляем только описание места
    if (location.includes('Широта:') && location.includes('Долгота:')) {
      // Ищем текст до координат
      const beforeCoords = location.split('Широта:')[0].trim();
      return beforeCoords || 'Локация не указана';
    }
    return location;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#114A65] mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка задач...</p>
        </div>
      </div>
    );
  }

  console.log('RecurringTasksList - Tasks state:', tasks);
  console.log('RecurringTasksList - Tasks length:', tasks.length);

  return (
    <div className="space-y-6 pt-6">

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2 text-lg">Повторяющихся задач пока нет</p>
              <p className="text-sm text-muted-foreground">Создавайте повторяющиеся задачи через форму создания заявок</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base sm:text-lg break-words flex-1 min-w-0">
                    {task.recurrence_type === 'weekly' && 'Еженедельная задача'}
                    {task.recurrence_type === 'daily' && 'Ежедневная задача'}
                    {task.recurrence_type === 'monthly' && 'Ежемесячная задача'}
                    {task.recurrence_type === 'yearly' && 'Ежегодная задача'}
                  </CardTitle>
                  <div className="flex-shrink-0 ml-2">
                    {getStatusBadge(task)}
                  </div>
                </div>

              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="break-words">{getRecurrenceText(task.recurrence_type, task.recurrence_interval)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="break-words">Следующая дата: {getNextDueDate(task)}</span>
                </div>

                {task.client && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="break-words">{task.client.name}</span>
                  </div>
                )}

                {/* Статус назначения исполнителя */}
                <div className="flex items-center gap-2 text-sm">
                  <UserPlus className={`h-4 w-4 flex-shrink-0 ${
                    task.executors && task.executors.length > 0 
                      ? 'text-green-500' 
                      : 'text-orange-500'
                  }`} />
                  <span className="break-words">
                    {task.executors && task.executors.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-green-600 font-medium">Исполнитель назначен</span>
                        <span className="text-xs text-gray-600">
                          {task.executors.map(exec => exec.full_name).join(', ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-orange-600 font-medium">Исполнитель не назначен</span>
                    )}
                  </span>
                </div>

                {task.taskInstances && Array.isArray(task.taskInstances) && task.taskInstances.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="break-words">
                      {task.taskInstances.filter((i: any) => i.status === 'completed').length} из {task.taskInstances.length} выполнено
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('Opening RecurringTaskDetails for task:', task.id);
                      setSelectedTask(task);
                      if (openModal) {
                        openModal('recurringTaskDetails');
                      }
                    }}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Подробнее
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowInstances(true);
                      if (openModal) {
                        openModal('taskHistory');
                      }
                    }}
                    className="w-full"
                  >
                    История
                  </Button>



                  {task.recurring_status === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleTask(task.id, 'pause')}
                      className="w-full"
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Приостановить
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleTask(task.id, 'resume')}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Возобновить
                    </Button>
                  )}

                  {/* Кнопка удаления для админа */}
                  {userRole === 'admin-worker' && onDeleteTask && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(task.id)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Удалить
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно с историей экземпляров */}
      <Dialog 
        open={showInstances} 
        onOpenChange={(open) => {
          setShowInstances(open);
          if (!open && closeModalWithHistory) {
            closeModalWithHistory();
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg sm:text-xl">
              История выполнения:
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {selectedTask && (
              <TaskInstancesList taskId={selectedTask.id} />
            )}
          </div>
        </DialogContent>
      </Dialog>

    {/* Модальное окно с деталями задачи - рендерится поверх всех элементов */}
    {selectedTask && (
      <RecurringTaskDetails
        task={selectedTask}
        userRole={userRole || ''}
        isDesktop={isDesktop}
        onClose={() => {
          console.log('RecurringTaskDetails onClose called');
          setSelectedTask(null);
          setShowComments(null);
          setFormErrors(null);
          if (closeModalWithHistory) {
            closeModalWithHistory();
          }
        }}
        onRateRequest={onRateRequest}
        onRedirectToOtherDepartment={onRedirectToOtherDepartment}
        onAssignExecutor={onAssignExecutor}
        onDeleteTask={onDeleteTask}
        showComments={showComments}
        setShowComments={setShowComments}
        formErrors={formErrors}
        onShowMap={onShowMap}
        onRefreshTask={fetchTasks}
      />
    )}

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
              onClick={() => {
                setShowDeleteConfirm(false);
                setTaskToDelete(null);
              }}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
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
