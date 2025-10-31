import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Download,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { importRecurringTasksFromExcel } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userRole: 'admin-worker' | 'department-head';
  isFullScreen?: boolean;
}

interface ImportResult {
  successCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    errors: string[];
  }>;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userRole,
  isFullScreen = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Проверяем расширение файла
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите файл Excel (.xlsx или .xls)",
        variant: "destructive",
      });
      return;
    }

    // Проверяем размер файла (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('excelFile', selectedFile);

    try {
      const response = await importRecurringTasksFromExcel(formData);

      setImportResult(response.data);
      
      if (response.data.successCount > 0) {
        toast({
          title: "Успешно!",
          description: `Импортировано ${response.data.successCount} повторяющихся задач`,
        });
        onSuccess?.();
      }

      if (response.data.errorCount > 0) {
        toast({
          title: "Внимание",
          description: `Импортировано ${response.data.successCount} задач, ${response.data.errorCount} ошибок`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Ошибка импорта:', error);
      toast({
        title: "Ошибка",
        description: error.response?.data?.message || "Произошла ошибка при импорте файла",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Создаем шаблон Excel файла с реальными данными
    const templateData = [
      ['Название', 'Описание', 'Локация', 'Категория', 'Тип_повторения', 'Интервал', 'Дата_начала'],
      ['Ежедневная уборка офиса', 'Уборка рабочих мест, протирка столов, вынос мусора', '3 этаж, открытое пространство', 'Уборка', 'daily', '1', '2024-01-15'],
      ['Проверка систем безопасности', 'Проверка работы камер наблюдения и систем доступа', 'Весь офис, серверная', 'Безопасность', 'weekly', '1', '2024-01-15'],
      ['Техническое обслуживание серверов', 'Проверка температуры, очистка от пыли, резервное копирование', 'Серверная комната', 'Техническое обслуживание', 'weekly', '1', '2024-01-15'],
      ['Подготовка финансового отчета', 'Сбор данных, формирование отчетов, отправка руководству', 'Бухгалтерия, кабинет 201', 'Документооборот', 'monthly', '1', '2024-01-15'],
      ['Инвентаризация оборудования', 'Проверка наличия и состояния офисной техники', 'Весь офис', 'Инвентаризация', 'monthly', '1', '2024-01-15'],
      ['Проверка пожарной безопасности', 'Проверка огнетушителей, путей эвакуации, сигнализации', 'Весь офис', 'Безопасность', 'monthly', '1', '2024-01-15'],
      ['Капитальный ремонт оборудования', 'Плановый ремонт и модернизация офисной техники', 'IT отдел, серверная', 'Ремонт', 'yearly', '1', '2024-01-15'],
      ['Полная инвентаризация склада', 'Подсчет всех товарно-материальных ценностей', 'Склад №1, склад №2', 'Инвентаризация', 'yearly', '1', '2024-01-15'],
      ['Проверка систем вентиляции', 'Техническое обслуживание и очистка вентиляционных систем', 'Весь офис', 'Техническое обслуживание', 'quarterly', '3', '2024-01-15'],
      ['Уборка территории', 'Уборка прилегающей территории, очистка от снега/листьев', 'Территория офиса', 'Уборка', 'weekly', '1', '2024-01-15'],
    ];

    // Создаем рабочую книгу Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // Устанавливаем ширину столбцов
    const columnWidths = [
      { wch: 25 }, // Название
      { wch: 35 }, // Описание
      { wch: 25 }, // Локация
      { wch: 20 }, // Категория
      { wch: 15 }, // Тип_повторения
      { wch: 10 }, // Интервал
      { wch: 15 }, // Дата_начала
    ];
    worksheet['!cols'] = columnWidths;

    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Повторяющиеся задачи');

    // Создаем файл и скачиваем
    XLSX.writeFile(workbook, 'шаблон_повторяющихся_задач.xlsx');
  };

  const resetForm = () => {
    setSelectedFile(null);
    setImportResult(null);
    setDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
        isFullScreen ? 'p-0' : 'p-4'
      }`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }}
    >
      <Card className={`w-full overflow-y-auto ${
        isFullScreen 
          ? 'max-w-none max-h-none h-full rounded-none' 
          : 'max-w-2xl max-h-[90vh]'
      }`} onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isFullScreen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div>
                <CardTitle>Импорт повторяющихся задач</CardTitle>
                <CardDescription>
                  Загрузите Excel файл для создания повторяющихся задач
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Инструкции */}
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Файл должен содержать следующие столбцы:</p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div><strong>Название</strong> - название повторяющейся задачи (минимум 3 символа)</div>
                  <div><strong>Описание</strong> - подробное описание задачи (необязательно)</div>
                  <div><strong>Локация</strong> - место выполнения задачи (минимум 3 символа)</div>
                  <div><strong>Категория</strong> - категория услуги (должна существовать в системе)</div>
                  <div><strong>Тип_повторения</strong> - daily (ежедневно), weekly (еженедельно), monthly (ежемесячно), yearly (ежегодно)</div>
                  <div><strong>Интервал</strong> - число от 1 до 365 (например: 1, 2, 3, 7, 30)</div>
                  <div><strong>Дата_начала</strong> - дата начала в формате YYYY-MM-DD (не может быть в прошлом)</div>
                </div>
                <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                  <strong>Примеры интервалов:</strong><br/>
                  • daily + интервал 1 = каждый день<br/>
                  • weekly + интервал 1 = каждую неделю<br/>
                  • monthly + интервал 3 = каждые 3 месяца<br/>
                  • yearly + интервал 1 = каждый год
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Скачать шаблон */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Скачать шаблон
            </Button>
          </div>

          {/* Загрузка файла */}
          <div>
            <Label className="text-sm font-medium">Выберите Excel файл</Label>
            <div
              className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-violet-500 bg-violet-50' 
                  : selectedFile 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="p-1 h-6 w-6"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Размер: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Перетащите файл сюда или{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-violet-600 hover:text-violet-700 underline"
                    >
                      выберите файл
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">
                    Поддерживаются файлы .xlsx и .xls до 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Результаты импорта */}
          {importResult && (
            <div className="space-y-4">
              <h3 className="font-semibold">Результаты импорта:</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-semibold">{importResult.successCount}</span>
                  </div>
                  <p className="text-sm text-green-600">Успешно</p>
                </div>
                
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-yellow-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold">{importResult.skippedCount}</span>
                  </div>
                  <p className="text-sm text-yellow-600">Пропущено</p>
                </div>
                
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-red-700">
                    <X className="w-4 h-4" />
                    <span className="font-semibold">{importResult.errorCount}</span>
                  </div>
                  <p className="text-sm text-red-600">Ошибок</p>
                </div>
              </div>

              {/* Список ошибок */}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-700">Ошибки:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="p-2 bg-red-50 rounded border border-red-200">
                        <p className="text-sm font-medium text-red-800">
                          Строка {error.row}:
                        </p>
                        <ul className="text-xs text-red-700 mt-1 space-y-1">
                          {error.errors.map((err, errIndex) => (
                            <li key={errIndex}>• {err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Кнопки действий */}
          <div className="flex space-x-4">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1 bg-violet-600 hover:bg-violet-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Импорт...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Импортировать
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Закрыть
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
