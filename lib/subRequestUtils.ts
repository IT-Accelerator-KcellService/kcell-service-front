/**
 * Утилиты для работы с подзаявками
 */

/**
 * Форматирует ID подзаявки в новый формат: {requestGroupId}/{subRequestNumber}
 * @param requestGroupId - ID главной заявки
 * @param subRequestNumber - Номер подзаявки (1, 2, 3, ...)
 * @returns Отформатированный ID подзаявки
 */
export function formatSubRequestId(requestGroupId: number, subRequestNumber: number): string {
  return `${requestGroupId}/${subRequestNumber}`;
}

/**
 * Получает отформатированный ID подзаявки из объекта подзаявки
 * @param subRequest - Объект подзаявки
 * @param requestGroupId - ID главной заявки
 * @returns Отформатированный ID подзаявки
 */
export function getSubRequestDisplayId(subRequest: any, requestGroupId: number): string {
  // Если есть sub_request_number, используем его
  if (subRequest.sub_request_number) {
    return formatSubRequestId(requestGroupId, subRequest.sub_request_number);
  }
  
  // Fallback: если sub_request_number нет, используем старый формат
  return `#${subRequest.id}`;
}
