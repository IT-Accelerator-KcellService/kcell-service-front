/**
 * Утилиты для работы с уведомлениями
 */

import React from 'react';

/**
 * Парсит ID заявок из контента уведомления
 * Ищет паттерны типа "№ 123", "№ 123/1", "заявка № 123", "заявка № 123/1"
 * @param content - контент уведомления
 * @returns массив найденных ID заявок
 */
export function parseRequestIdsFromContent(content: string): string[] {
  if (!content) return [];
  
  // Паттерны для поиска ID заявок
  const patterns = [
    /№\s*(\d+(?:\/\d+)?)/g,  // № 123 или № 123/1
    /заявк[аи]\s*№\s*(\d+(?:\/\d+)?)/gi,  // заявка № 123 или заявка № 123/1
    /подзаявк[аи]\s*№\s*(\d+(?:\/\d+)?)/gi,  // подзаявка № 123/1
  ];
  
  const foundIds = new Set<string>();
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      foundIds.add(match[1]);
    }
  });
  
  return Array.from(foundIds);
}

/**
 * Проверяет, содержит ли контент уведомления ID заявок
 * @param content - контент уведомления
 * @returns true, если найдены ID заявок
 */
export function hasRequestIds(content: string): boolean {
  return parseRequestIdsFromContent(content).length > 0;
}

/**
 * Создает JSX элементы с кликабельными ID заявок
 * @param content - контент уведомления
 * @param onRequestIdClick - обработчик клика по ID заявки
 * @returns JSX элементы с кликабельными ID
 */
export function createClickableRequestIds(
  content: string, 
  onRequestIdClick: (requestId: string) => void
): React.ReactNode[] {
  if (!content) return [content];
  
  const requestIds = parseRequestIdsFromContent(content);
  if (requestIds.length === 0) return [content];
  
  // Создаем регулярное выражение для замены всех найденных ID
  const allPatterns = [
    /№\s*(\d+(?:\/\d+)?)/g,
    /заявк[аи]\s*№\s*(\d+(?:\/\d+)?)/gi,
    /подзаявк[аи]\s*№\s*(\d+(?:\/\d+)?)/gi,
  ];
  
  let result = content;
  
  allPatterns.forEach(pattern => {
    result = result.replace(pattern, (match, requestId) => {
      return match.replace(requestId, `<span class="request-id-link" data-request-id="${requestId}">${requestId}</span>`);
    });
  });

  // Разбиваем на части и создаем элементы
  const parts = result.split(/(<span class="request-id-link"[^>]*>.*?<\/span>)/);
  
  return parts.map((part, index) => {
    if (part.startsWith('<span class="request-id-link"')) {
      const match = part.match(/data-request-id="([^"]*)"/);
      if (match) {
        const requestId = match[1];
        return React.createElement('span', {
          key: index,
          className: "text-blue-600 underline cursor-pointer hover:text-blue-800",
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onRequestIdClick(requestId);
          }
        }, requestId);
      }
    }
    return part;
  });
}