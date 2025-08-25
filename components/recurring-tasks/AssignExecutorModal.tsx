'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Users } from 'lucide-react';
import { getUsers, assignRecurringTaskExecutor, changeRecurringTaskExecutor } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AssignExecutorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number;
  currentExecutorId?: number;
  onExecutorAssigned: () => void;
  mode: 'assign' | 'change'; // assign - назначить, change - изменить
}

export const AssignExecutorModal: React.FC<AssignExecutorModalProps> = ({
  open,
  onOpenChange,
  taskId,
  currentExecutorId,
  onExecutorAssigned,
  mode
}) => {
  const [loading, setLoading] = useState(false);
  const [executors, setExecutors] = useState<any[]>([]);
  const [selectedExecutorId, setSelectedExecutorId] = useState<string>('');
  const { toast } = useToast();

  const fetchExecutors = async () => {
    try {
      const response = await getUsers();
      // Фильтруем только исполнителей (executor role)
      const executorUsers = response.data.filter((user: any) => user.role === 'executor');
      setExecutors(executorUsers);
    } catch (error) {
      console.error('Ошибка загрузки исполнителей:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список исполнителей',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (open) {
      fetchExecutors();
      if (mode === 'change' && currentExecutorId) {
        setSelectedExecutorId(currentExecutorId.toString());
      } else {
        setSelectedExecutorId('');
      }
    }
  }, [open, mode, currentExecutorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedExecutorId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите исполнителя',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'assign') {
        await assignRecurringTaskExecutor(taskId, parseInt(selectedExecutorId));
        toast({
          title: 'Успешно',
          description: 'Исполнитель назначен',
        });
      } else {
        await changeRecurringTaskExecutor(taskId, parseInt(selectedExecutorId));
        toast({
          title: 'Успешно',
          description: 'Исполнитель изменен',
        });
      }

      onOpenChange(false);
      onExecutorAssigned();
    } catch (error) {
      console.error('Ошибка назначения исполнителя:', error);
      toast({
        title: 'Ошибка',
        description: mode === 'assign' ? 'Не удалось назначить исполнителя' : 'Не удалось изменить исполнителя',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {mode === 'assign' ? 'Назначить исполнителя' : 'Изменить исполнителя'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="executor">Исполнитель *</Label>
            <Select
              value={selectedExecutorId}
              onValueChange={setSelectedExecutorId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите исполнителя" />
              </SelectTrigger>
              <SelectContent>
                {executors.map((executor) => (
                  <SelectItem key={executor.id} value={executor.id.toString()}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {executor.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : (mode === 'assign' ? 'Назначить' : 'Изменить')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
