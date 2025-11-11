/**
 * Оптимизация изображений Cloudinary для улучшения производительности
 */

/**
 * Оптимизирует URL изображения Cloudinary для уменьшения размера
 * @param url - исходный URL изображения
 * @param width - желаемая ширина (опционально)
 * @param height - желаемая высота (опционально)
 * @param quality - качество (auto для автоматического выбора)
 * @returns оптимизированный URL
 */
export function optimizeCloudinaryUrl(
  url: string | null | undefined,
  width?: number,
  height?: number,
  quality: 'auto' | number = 'auto'
): string {
  if (!url || url.startsWith('/')) {
    return url || '/placeholder.svg';
  }

  // Если URL уже оптимизирован или не Cloudinary, возвращаем как есть
  if (!url.includes('cloudinary') || url.includes('w_') || url.includes('q_auto')) {
    return url;
  }

  try {
    // Простая замена для добавления параметров оптимизации Cloudinary
    // Формат: .../upload/... -> .../upload/w_XXX,h_XXX,q_auto:best,f_auto,c_limit/...
    const optimizedUrl = url.replace(
      /\/upload\//,
      `/upload/w_${width || 'auto'},h_${height || 'auto'},q_auto:best,f_auto,c_limit/`
    );
    
    return optimizedUrl;
  } catch (error) {
    // Если ошибка парсинга URL, возвращаем исходный URL
    return url;
  }
}


export function getThumbnailUrl(url: string | null | undefined): string {
  if (!url || url.startsWith('/')) {
    return url || '/placeholder.svg';
  }

  if (!url.includes('cloudinary') || url.includes('w_') || url.includes('q_')) {
    return url;
  }

  try {
    const optimizedUrl = url.replace(
      /\/upload\//,
      `/upload/w_32,h_32,q_30,f_auto,c_fill/`
    );
    
    return optimizedUrl;
  } catch (error) {
    return url;
  }
}

/**
 * Оптимизированный URL для средних превью (96x96 для модальных окон)
 */
export function getPreviewUrl(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, 96, 96);
}

/**
 * Оптимизированный URL для больших изображений (для полноэкранного просмотра)
 */
export function getFullSizeUrl(url: string | null | undefined, maxWidth: number = 1200): string {
  return optimizeCloudinaryUrl(url, maxWidth, undefined);
}
