'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { createRecurringTask } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateRecurringTaskModalProps {
  onTaskCreated?: () => void;
}

export function CreateRecurringTaskModal({ onTaskCreated }: CreateRecurringTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    location: '',
    location_detail: '',
    recurrence_type: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    recurrence_interval: 1,
    start_date: new Date(),
    request_type: 'planned'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createRecurringTask({
        ...formData,
        start_date: format(formData.start_date, 'yyyy-MM-dd')
      });

      toast({
        title: "Успешно!",
        description: "Повторяющаяся задача создана",
      });

      setOpen(false);
      setFormData({
        location: '',
        location_detail: '',
        recurrence_type: 'weekly',
        recurrence_interval: 1,
        start_date: new Date(),
        request_type: 'planned'
      });

      onTaskCreated?.();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать задачу",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const recurrenceOptions = [
    { value: 'daily', label: 'Ежедневно' },
    { value: 'weekly', label: 'Еженедельно' },
    { value: 'monthly', label: 'Ежемесячно' },
    { value: 'yearly', label: 'Ежегодно' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Создать повторяющуюся задачу
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать повторяющуюся задачу</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Местоположение *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Например: Офис 1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_detail">Детали местоположения</Label>
            <Input
              id="location_detail"
              value={formData.location_detail}
              onChange={(e) => setFormData({ ...formData, location_detail: e.target.value })}
              placeholder="Например: Общая зона, кабинет 101"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recurrence_type">Тип повторения</Label>
              <Select
                value={formData.recurrence_type}
                onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'yearly') =>
                  setFormData({ ...formData, recurrence_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence_interval">Интервал</Label>
              <Select
                value={String(formData.recurrence_interval)}
                onValueChange={(value) => setFormData({ ...formData, recurrence_interval: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Каждые 1</SelectItem>
                  <SelectItem value="2">Каждые 2</SelectItem>
                  <SelectItem value="3">Каждые 3</SelectItem>
                  <SelectItem value="4">Каждые 4</SelectItem>
                  <SelectItem value="6">Каждые 6</SelectItem>
                  <SelectItem value="12">Каждые 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Дата начала</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.start_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.start_date ? (
                    format(formData.start_date, "PPP", { locale: ru })
                  ) : (
                    <span>Выберите дату</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.start_date}
                  onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                  initialFocus
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Создание...' : 'Создать задачу'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
