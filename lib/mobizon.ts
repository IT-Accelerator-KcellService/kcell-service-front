/**
 * Утилита для работы с Mobizon API
 * Документация: https://mobizon.kz/help/api-docs
 */

interface MobizonConfig {
  apiKey: string;
  apiUrl?: string;
  from?: string; // Подпись отправителя
}

interface SendSmsResponse {
  code: number;
  data?: {
    messageId: string;
  };
  message?: string;
}

class MobizonService {
  private apiKey: string;
  private apiUrl: string;
  private from: string;

  constructor(config: MobizonConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.mobizon.kz/service';
    this.from = config.from || 'Kcell Service';
  }

  /**
   * Отправка SMS сообщения
   * @param phone - Номер телефона в международном формате (например: 77001234567)
   * @param text - Текст сообщения
   * @returns Promise с результатом отправки
   */
  async sendSms(phone: string, text: string): Promise<SendSmsResponse> {
    try {
      // Убираем все нецифровые символы из номера
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Если номер начинается с 8, заменяем на 7
      const formattedPhone = cleanPhone.startsWith('8') 
        ? '7' + cleanPhone.slice(1) 
        : cleanPhone.startsWith('7') 
        ? cleanPhone 
        : '7' + cleanPhone;

      const params = new URLSearchParams({
        apiKey: this.apiKey,
        recipient: formattedPhone,
        text: text,
        from: this.from,
      });

      const response = await fetch(`${this.apiUrl}/message/sendsmsmessage?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.code === 0) {
        return {
          code: 0,
          data: {
            messageId: data.data?.messageId || '',
          },
        };
      } else {
        return {
          code: data.code || -1,
          message: data.message || 'Ошибка при отправке SMS',
        };
      }
    } catch (error: any) {
      console.error('Ошибка отправки SMS через Mobizon:', error);
      return {
        code: -1,
        message: error.message || 'Ошибка при отправке SMS',
      };
    }
  }

  /**
   * Отправка кода верификации
   * @param phone - Номер телефона
   * @param code - Код верификации
   * @returns Promise с результатом отправки
   */
  async sendVerificationCode(phone: string, code: string): Promise<SendSmsResponse> {
    const message = `Ваш код верификации: ${code}. Код действителен в течение 5 минут.`;
    return this.sendSms(phone, message);
  }
}

// Создаем экземпляр сервиса
// API ключ должен быть в переменных окружения
let mobizonService: MobizonService | null = null;

export function getMobizonService(): MobizonService {
  if (!mobizonService) {
    const apiKey = process.env.NEXT_PUBLIC_MOBIZON_API_KEY || '';
    
    if (!apiKey) {
      console.warn('MOBIZON_API_KEY не установлен в переменных окружения');
    }

    mobizonService = new MobizonService({
      apiKey,
      from: process.env.NEXT_PUBLIC_MOBIZON_FROM || 'Kcell Service',
    });
  }
  
  return mobizonService;
}

// Функция для генерации кода верификации
export function generateVerificationCode(length: number = 6): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

// Функция для отправки кода верификации (для использования на клиенте)
export async function sendVerificationCode(phone: string, code: string): Promise<{ success: boolean; message?: string }> {
  try {
    // Отправляем запрос на бэкенд, который будет отправлять SMS через Mobizon
    // Это нужно, чтобы не раскрывать API ключ на клиенте
    const response = await fetch('https://kcell-service.onrender.com/api/auth/send-verification-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, code }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true };
    } else {
      // Бэкенд возвращает ошибки в формате details: [{ message }] или message
      const errorMessage = data.details?.[0]?.message || data.message || 'Ошибка при отправке SMS';
      return { 
        success: false, 
        message: errorMessage
      };
    }
  } catch (error: any) {
    console.error('Ошибка отправки кода верификации:', error);
    return { 
      success: false, 
      message: error.message || 'Ошибка при отправке SMS' 
    };
  }
}

export default getMobizonService;


