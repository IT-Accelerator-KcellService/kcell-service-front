import { OfficeLocation } from "@/stores/useOfficeLocationsStore";

/**
 * Получить все блоки для офиса по office_id (возвращает массив названий)
 * Совместимость со старым API, которое использовало названия офисов
 */
export const getBlocksForOffice = (locations: OfficeLocation[], officeId: number): string[] => {
  const blocks = locations.filter(
    loc => loc.office_id === officeId && loc.type === 'block'
  );
  // Сортируем по order, затем по названию
  return blocks
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    })
    .map(block => block.name);
};

/**
 * Получить все местонахождения для блока по названию блока и office_id (возвращает массив названий)
 * Совместимость со старым API
 */
export const getLocationsForBlock = (locations: OfficeLocation[], officeId: number, blockName: string): string[] => {
  // Находим блок по названию
  const block = locations.find(
    loc => loc.office_id === officeId && loc.type === 'block' && loc.name === blockName
  );
  
  if (!block) return [];
  
  // Получаем все местонахождения для этого блока
  const locationList = locations.filter(
    loc => loc.parent_id === block.id && loc.type === 'location'
  );
  
  // Сортируем по order, затем по названию
  return locationList
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    })
    .map(loc => loc.name);
};

/**
 * Получить все помещения для местонахождения (возвращает массив названий)
 * Совместимость со старым API
 */
export const getRoomsForLocation = (
  locations: OfficeLocation[], 
  officeId: number,
  blockName: string, 
  locationName?: string
): string[] => {
  // Находим блок
  const block = locations.find(
    loc => loc.office_id === officeId && loc.type === 'block' && loc.name === blockName
  );
  
  if (!block) return [];
  
  let parentId: number | null = null;
  
  // Если указано местонахождение, находим его
  if (locationName && locationName !== "") {
    const location = locations.find(
      loc => loc.parent_id === block.id && loc.type === 'location' && loc.name === locationName
    );
    parentId = location?.id || null;
  } else {
    // Если местонахождение не указано, используем блок как родителя
    parentId = block.id;
  }
  
  if (!parentId) return [];
  
  // Получаем все помещения для этого родителя
  const rooms = locations.filter(
    loc => loc.parent_id === parentId && loc.type === 'room'
  );
  
  // Сортируем по order, затем по названию
  return rooms
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    })
    .map(room => room.name);
};

/**
 * Проверить, есть ли местонахождения для блока
 * Совместимость со старым API
 */
export const hasLocationsForBlock = (locations: OfficeLocation[], officeId: number, blockName: string): boolean => {
  const block = locations.find(
    loc => loc.office_id === officeId && loc.type === 'block' && loc.name === blockName
  );
  
  if (!block) return false;
  
  return locations.some(
    loc => loc.parent_id === block.id && loc.type === 'location'
  );
};

/**
 * Проверить, есть ли помещения для местонахождения или блока
 * Совместимость со старым API
 */
export const hasRoomsForLocation = (
  locations: OfficeLocation[], 
  officeId: number,
  blockName: string, 
  locationName?: string
): boolean => {
  const block = locations.find(
    loc => loc.office_id === officeId && loc.type === 'block' && loc.name === blockName
  );
  
  if (!block) return false;
  
  let parentId: number | null = null;
  
  if (locationName && locationName !== "") {
    const location = locations.find(
      loc => loc.parent_id === block.id && loc.type === 'location' && loc.name === locationName
    );
    parentId = location?.id || null;
  } else {
    parentId = block.id;
  }
  
  if (!parentId) return false;
  
  return locations.some(
    loc => loc.parent_id === parentId && loc.type === 'room'
  );
};

