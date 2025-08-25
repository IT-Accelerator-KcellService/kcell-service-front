'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Calendar, User, CheckCircle, Pause, Play, History, FileText, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { RecurringTask } from '@/lib/api';
import { RoleBasedActionMenu } from '@/components/action-menu';
import { TaskInstancesList } from './TaskInstancesList';

interface RecurringTaskDetailsProps {
  task: RecurringTask;
  userRole: string;
  isDesktop: boolean;
  onClose: () => void;
  onRateRequest?: (request: any) => void;
  onRedirectToOtherDepartment?: (request: any) => void;
  onAssignExecutor?: (request: any) => void;
  onToggleLongTerm?: (requestId: number, requestGroupId: number, currentStatus: boolean) => void;
}

export const RecurringTaskDetails: React.FC<RecurringTaskDetailsProps> = ({
  task,
  userRole,
  isDesktop,
  onClose,
  onRateRequest,
  onRedirectToOtherDepartment,
  onAssignExecutor,
  onToggleLongTerm
}) => {
  const [expandedSubRequests, setExpandedSubRequests] = useState<Set<number>>(new Set());
  const [showComments, setShowComments] = useState<number | null>(null);
  const [showInstances, setShowInstances] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">В обработке</Badge>;
      case 'awaiting_assignment':
        return <Badge className="bg-yellow-100 text-yellow-800">Ожидает назначения</Badge>;
      case 'execution':
        return <Badge className="bg-purple-100 text-purple-800">Исполнение</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Завершено</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Отклонено</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg sm:text-xl">
            Детали повторяющейся задачи
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Основная информация о задаче */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                {task.recurrence_type === 'weekly' && 'Еженедельная задача'}
                {task.recurrence_type === 'daily' && 'Ежедневная задача'}
                {task.recurrence_type === 'monthly' && 'Ежемесячная задача'}
                {task.recurrence_type === 'yearly' && 'Ежегодная задача'}
              </CardTitle>
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

              <div className="flex items-center gap-2 text-sm">
                <span className="break-words">Локация: {task.location}</span>
              </div>

              {task.location_detail && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="break-words">Детали: {task.location_detail}</span>
                </div>
              )}

                                                             {task.taskInstances && Array.isArray(task.taskInstances) && task.taskInstances.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="break-words">
                                         {task.taskInstances.filter((i: any) => i.status === 'completed').length} из {task.taskInstances.length} выполнено
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Подзаявки */}
          {task.requests && Array.isArray(task.requests) && task.requests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Подзаявки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {task.requests.map((subRequest) => {
                    const isExpanded = expandedSubRequests.has(subRequest.id);
                    const hasComments = showComments === subRequest.id;

                    return (
                      <div key={subRequest.id} className="border rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900 text-base">{subRequest.title}</h4>
                              </div>
                              <div className="flex items-center gap-3 text-gray-600 text-sm">
                                <span className="truncate flex items-center gap-1">
                                  <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                  {subRequest.category?.name || 'Без категории'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getStatusBadge(subRequest.status)}

                              {/* Кнопка комментариев */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-purple-50"
                                onClick={() => {
                                  if (hasComments) {
                                    setShowComments(null);
                                  } else {
                                    setShowComments(subRequest.id);
                                  }
                                }}
                              >
                                <MessageCircle className={`h-4 w-4 ${hasComments ? 'text-purple-600' : 'text-gray-500'}`} />
                              </Button>

                              <RoleBasedActionMenu
                                request={subRequest}
                                requestGroup={task}
                                isDesktop={isDesktop}
                                userRole={userRole}
                                isSubRequest={true}
                                onRateRequest={onRateRequest}
                                onRedirectToOtherDepartment={onRedirectToOtherDepartment}
                                onAssignExecutor={onAssignExecutor}
                                onToggleLongTerm={onToggleLongTerm}
                              />
                            </div>
                          </div>

                          {/* Краткое описание */}
                          <div className="text-gray-600 mb-3 text-sm">
                            <p className="line-clamp-2">{subRequest.description}</p>
                          </div>

                          {/* Кнопка раскрытия */}
                          {subRequest.status !== 'in_progress' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-center text-sm"
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
                          )}
                        </div>

                        {/* Раскрытое содержимое */}
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t pt-4">
                            <div className="text-gray-600 text-sm whitespace-pre-wrap break-words">
                              {subRequest.description}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Кнопки действий */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInstances(true)}
              className="w-full"
            >
              <History className="h-4 w-4 mr-1" />
              История выполнения
            </Button>

            {task.recurring_status === 'active' ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Pause className="h-4 w-4 mr-1" />
                Приостановить
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Play className="h-4 w-4 mr-1" />
                Возобновить
              </Button>
            )}
          </div>
        </div>

        {/* Модальное окно с историей экземпляров */}
        <Dialog open={showInstances} onOpenChange={setShowInstances}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg sm:text-xl">
                История выполнения: {task.location}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              <TaskInstancesList taskId={task.id} />
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
