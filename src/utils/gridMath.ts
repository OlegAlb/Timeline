import {
  HEADER_HEIGHT,
  HOUR_WIDTH,
  ROW_HEIGHT,
  SIDEBAR_WIDTH,
  START_HOUR,
  TIME_STEP_MINUTES,
  TOTAL_HOURS,
} from "../constants/grid";

/**
 * Переводит таймстамп в координату X на холсте
 */
export const getXFromTime = (timestamp: number): number => {
  const date = new Date(timestamp);
  const hours = date.getHours() + date.getMinutes() / 60;
  const relativeHours = hours - START_HOUR;

  return SIDEBAR_WIDTH + relativeHours * HOUR_WIDTH;
};

/**
 * Переводит строковый ID стола (например "table_5") в координату Y
 */
export const getYFromResourceId = (resourceId: string): number => {
  // Вытаскиваем число из строки "table_5" -> 5
  const tableIndex = parseInt(resourceId.replace("table_", ""), 10) - 1;
  return HEADER_HEIGHT + tableIndex * ROW_HEIGHT;
};

/**
 * Переводит координату X на экране (с учетом скролла) в таймстамп,
 * округленный до ближайшего шага сетки (например, 15 минут) — SNAP TO GRID
 */
export const getTimeFromX = (absoluteX: number): number => {
  // Убираем сайдбар из расчетов
  const relativeX = absoluteX - SIDEBAR_WIDTH;
  if (relativeX < 0) return 0;

  // Вычисляем, сколько это в часах от времени открытия (START_HOUR)
  const hoursFromStart = relativeX / HOUR_WIDTH;
  const totalMinutes = hoursFromStart * 60;

  // КРИТИЧНО ДЛЯ SENIOR: Эффект "Snap to Grid".
  // Округляем минуты до ближайшего шага (например, кратно 15 минутам)
  const snappedMinutes =
    Math.round(totalMinutes / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Возвращаем итоговый таймстамп
  return today.getTime() + (START_HOUR * 60 + snappedMinutes) * 60 * 1000;
};

/**
 * Переводит координату Y на экране (с учетом скролла) в строковый ID стола ("table_3")
 */
export const getResourceIdFromY = (absoluteY: number): string | null => {
  const relativeY = absoluteY - HEADER_HEIGHT;
  if (relativeY < 0) return null;

  // Индекс стола в массиве
  const tableIndex = Math.floor(relativeY / ROW_HEIGHT);

  // Возвращаем ID стола (1-based индекс, как в наших моках)
  return `table_${tableIndex + 1}`;
};

export const getInitialScrollX = (screenWidth: number): number => {
  const now = new Date();

  // Получаем текущее время в десятичном формате (например, 14:30 -> 14.5)
  const currentDecimalHour = now.getHours() + now.getMinutes() / 60;

  // Сколько часов прошло с момента старта сетки
  const hoursPassed = currentDecimalHour - START_HOUR;

  // Если текущее время раньше, чем начало сетки — остаёмся в начале (0)
  if (hoursPassed <= 0) return 0;

  // Если текущее время позже, чем конец сетки — мотаем до упора
  if (hoursPassed >= TOTAL_HOURS) {
    return TOTAL_HOURS * HOUR_WIDTH;
  }

  // Базовый сдвиг: текущее время встанет ровно к левому краю (у сайдбара)
  const targetX = hoursPassed * HOUR_WIDTH;

  const availableWidth = screenWidth - SIDEBAR_WIDTH;

  return Math.max(0, targetX - availableWidth / 2);
};
