'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, User, MessageSquare, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getTaskInstances, completeTaskInstance, skipTaskInstance, TaskInstance } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface TaskInstancesListProps {
  taskId: number;
}

export const TaskInstancesList: React.FC<TaskInstancesListProps> = ({ taskId }) => {
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<TaskInstance | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const fetchInstances = async () => {
    try {
      const response = await getTaskInstances(taskId);
      setInstances(response.data.instances || []);
    } catch (error) {
      console.error('Ошибка загрузки экземпляров:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить экземпляры задачи',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, [taskId]);

  const handleComplete = async () => {
    if (!selectedInstance) return;
    
    setActionLoading(true);
    try {
      await completeTaskInstance(selectedInstance.id, notes);
      toast({
        title: 'Успешно',
        description: 'Экземпляр отмечен как выполненный',
      });
      setShowCompleteDialog(false);
      setNotes('');
      fetchInstances();
    } catch (error) {
      console.error('Ошибка отметки выполнения:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отметить как выполненный',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!selectedInstance) return;
    
    setActionLoading(true);
    try {
      await skipTaskInstance(selectedInstance.id, notes);
      toast({
        title: 'Успешно',
        description: 'Экземпляр пропущен',
      });
      setShowSkipDialog(false);
      setNotes('');
      fetchInstances();
    } catch (error) {
      console.error('Ошибка пропуска:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось пропустить экземпляр',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 text-xs sm:text-sm px-2 py-1">Выполнено</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs sm:text-sm px-2 py-1">Ожидает</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 text-xs sm:text-sm px-2 py-1">Просрочено</Badge>;
      case 'skipped':
        return <Badge className="bg-gray-100 text-gray-800 text-xs sm:text-sm px-2 py-1">Пропущено</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-1">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'skipped':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-40">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#114A65] mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm sm:text-base">Загрузка экземпляров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {instances.length === 0 ? (
        <div className="text-center py-6 sm:py-8">
          <p className="text-muted-foreground text-sm sm:text-base">Экземпляров задачи пока нет</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {instances.map((instance) => (
            <Card key={instance.id} className="hover:shadow-md transition-shadow border border-gray-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col gap-3">
                  {/* Основная информация */}
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(instance.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm sm:text-base text-gray-900">
                            {format(new Date(instance.due_date), 'dd.MM.yyyy', { locale: ru })}
                          </span>
                          <div className="flex-shrink-0">
                            {getStatusBadge(instance.status)}
                          </div>
                        </div>
                        
                        {/* Дополнительная информация */}
                        {instance.completed_date && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-green-600">
                            <CheckCircle className="h-3 w-3 flex-shrink-0" />
                            <span>Выполнено: {format(new Date(instance.completed_date), 'dd.MM.yyyy', { locale: ru })}</span>
                          </div>
                        )}
                        
                        {instance.taskCompletedByUser && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{instance.taskCompletedByUser.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Статус и действия */}
                  <div className="flex flex-col gap-2">
                    {/* Для выполненных экземпляров показываем информацию о выполнении */}
                    {instance.status === 'completed' && (
                      <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        <span>Задача выполнена</span>
                      </div>
                    )}
                    
                    {/* Для пропущенных экземпляров показываем информацию */}
                    {instance.status === 'skipped' && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 font-medium bg-gray-50 px-3 py-2 rounded-lg">
                        <XCircle className="h-4 w-4 flex-shrink-0" />
                        <span>Пропущено</span>
                      </div>
                    )}
                    
                    {/* Для ожидающих экземпляров */}
                    {instance.status === 'pending' && (
                      <div className="flex items-center gap-2 text-sm text-yellow-600 font-medium bg-yellow-50 px-3 py-2 rounded-lg">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>Ожидает выполнения</span>
                      </div>
                    )}
                    
                    {/* Для просроченных экземпляров */}
                    {instance.status === 'overdue' && (
                      <div className="flex items-center gap-2 text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>Просрочено</span>
                      </div>
                    )}
                    
                    
                  </div>

                  {/* Заметки */}
                  {instance.notes && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-700 break-words leading-relaxed">{instance.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Диалог отметки выполнения */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="w-[95vw] max-w-[500px] p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-base sm:text-lg">Отметить как выполненное</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes" className="text-sm sm:text-base">Заметки (необязательно)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Опишите выполненную работу..."
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompleteDialog(false);
                  setNotes('');
                }}
                className="w-full sm:w-auto h-10 sm:h-9"
              >
                Отмена
              </Button>
              <Button 
                onClick={handleComplete} 
                disabled={actionLoading} 
                className="w-full sm:w-auto h-10 sm:h-9"
              >
                {actionLoading ? 'Сохранение...' : 'Отметить выполненным'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог пропуска */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent className="w-[95vw] max-w-[500px] p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-base sm:text-lg">Пропустить задачу</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="skip-notes" className="text-sm sm:text-base">Причина пропуска (необязательно)</Label>
              <Textarea
                id="skip-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Укажите причину пропуска..."
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSkipDialog(false);
                  setNotes('');
                }}
                className="w-full sm:w-auto h-10 sm:h-9"
              >
                Отмена
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleSkip} 
                disabled={actionLoading}
                className="w-full sm:w-auto h-10 sm:h-9"
              >
                {actionLoading ? 'Сохранение...' : 'Пропустить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
