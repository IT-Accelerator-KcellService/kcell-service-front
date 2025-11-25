import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Функция для расчета расстояния между двумя точками по координатам (в километрах)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Радиус Земли в километрах
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Расстояние в километрах
  return distance;
}

// Функция для поиска ближайшего офиса
export function findNearestOffice(
  userLat: number,
  userLon: number,
  offices: Array<{ id: number; name: string; city: string; address: string; lat?: number | null; lon?: number | null }>
): { office: any; distance: number } | null {
  let nearestOffice = null;
  let minDistance = Infinity;

  for (const office of offices) {
    if (office.lat !== null && office.lon !== null) {
      const distance = calculateDistance(userLat, userLon, office.lat, office.lon);
      if (distance < minDistance) {
        minDistance = distance;
        nearestOffice = office;
      }
    }
  }

  if (nearestOffice) {
    return { office: nearestOffice, distance: minDistance };
  }

  return null;
}

// Функция для определения местоположения по IP адресу
export async function getLocationByIP(): Promise<{lat: number, lon: number} | null> {
  // Список API для определения местоположения по IP (fallback)
  const ipApis = [
    'https://ipapi.co/json/',
    'https://ip-api.com/json/'
  ];

  for (let i = 0; i < ipApis.length; i++) {
    const apiUrl = ipApis[i];
    try {
      console.log(`Пробуем API: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Добавляем timeout
        signal: AbortSignal.timeout(5000) // 5 секунд timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Обрабатываем разные форматы ответов от разных API
      let lat: number | null = null;
      let lon: number | null = null;
      
      if (apiUrl.includes('ipapi.co')) {
        lat = data.latitude;
        lon = data.longitude;
      } else if (apiUrl.includes('ip-api.com')) {
        lat = data.lat;
        lon = data.lon;
      }
      
      if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
        console.log(`Успешно получены координаты: ${lat}, ${lon} от ${apiUrl}`);
        return {
          lat: parseFloat(lat.toString()),
          lon: parseFloat(lon.toString())
        };
      }
    } catch (error) {
      console.error(`Ошибка при использовании API ${apiUrl}:`, error);
      
      // Добавляем небольшую задержку перед следующей попыткой (кроме последней)
      if (i < ipApis.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 секунда задержки
      }
      
      continue; // Пробуем следующий API
    }
  }
  
  console.error('Все API для определения местоположения по IP не сработали');
  return null;
}
