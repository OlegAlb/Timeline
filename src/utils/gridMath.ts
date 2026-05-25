import {
  END_HOUR,
  HEADER_HEIGHT,
  HOUR_WIDTH,
  MAX_SCROLL_X,
  MIN_DURATION,
  MIN_GAP,
  ROW_HEIGHT,
  SIDEBAR_WIDTH,
  START_HOUR,
  TIME_STEP_MINUTES,
} from "../constants/grid";

interface Segment {
  id: string;
  resourceId: string;
  startTime: number;
  endTime: number;
}

/**
 * Переводит таймстамп в координату X на холсте
 */
export const getXFromTime = (timestamp: number): number => {
  "worklet";

  const date = new Date(timestamp);
  const hours = date.getHours() + date.getMinutes() / 60;
  const relativeHours = hours - START_HOUR;

  return SIDEBAR_WIDTH + relativeHours * HOUR_WIDTH;
};

/**
 * Переводит координату X на экране (с учетом скролла) в таймстамп,
 * округленный до ближайшего шага сетки (например, 15 минут) — SNAP TO GRID
 */
export const getTimeFromX = (absoluteX: number): number => {
  "worklet";
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
  "worklet";

  const relativeY = absoluteY - HEADER_HEIGHT;
  if (relativeY < 0) return null;

  // Индекс стола в массиве
  const tableIndex = Math.floor(relativeY / ROW_HEIGHT);

  // Возвращаем ID стола (1-based индекс, как в наших моках)
  return `table_${tableIndex + 1}`;
};

/**
 * Переводит строковый ID стола (например "table_5") в координату Y
 */
export const getYFromResourceId = (resourceId: string): number => {
  "worklet";

  const tableIndex = parseInt(resourceId.replace("table_", ""), 10) - 1;
  return HEADER_HEIGHT + tableIndex * ROW_HEIGHT;
};

export const getInitialScrollX = (): number => {
  "worklet";

  const now = new Date();
  const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
  const hoursPassed = currentDecimalHour - START_HOUR;
  if (hoursPassed <= 0) return 0;
  const targetX = hoursPassed * HOUR_WIDTH;
  return Math.min(Math.max(0, targetX), MAX_SCROLL_X);
};

export const getWidthByDuration = (
  durationMs: number,
  hourWidth: number = HOUR_WIDTH,
): number => {
  "worklet";

  const ONE_HOUR_MS = 60 * 60 * 1000;

  const durationInHours = durationMs / ONE_HOUR_MS;

  // Умножаем долю на ширину одного часа
  return durationInHours * hourWidth;
};

export const validateBookingSlot = (
  tableId: string,
  startTime: number,
  existingSegments: Segment[],
  currentTime: number = Date.now(),
): { isValid: boolean; error?: string } => {
  const endTime = startTime + MIN_DURATION;

  // 1. Клик по ячейке во времени, которое уже прошло
  if (startTime < currentTime) {
    return { isValid: false, error: "Нельзя забронировать прошедшее время" };
  }

  // 2. Проверка рамок рабочего дня
  const startDay = new Date(startTime);
  const workStart = new Date(startDay).setHours(START_HOUR, 0, 0, 0);
  const workEnd = new Date(startDay).setHours(END_HOUR, 0, 0, 0);

  if (startTime < workStart || endTime > workEnd) {
    return {
      isValid: false,
      error: "Бронь выходит за рамки рабочего дня",
    };
  }

  // Фильтруем сегменты только для текущего стола
  const tableSegments = existingSegments.filter(
    (seg) => seg.resourceId === tableId,
  );

  for (const seg of tableSegments) {
    // 3. Проверка на прямое пересечение (овербукинг / наложение тел)
    const isOverlapping = startTime < seg.endTime && endTime > seg.startTime;
    if (isOverlapping) {
      return {
        isValid: false,
        error: "Бронь пересекается с существующим резервом",
      };
    }

    // 4. Проверка зазора ДО следующей брони (новая бронь перед существующей)
    // Сдвигаем виртуальную границу существующей брони назад на MIN_GAP
    if (endTime > seg.startTime - MIN_GAP && startTime < seg.startTime) {
      return {
        isValid: false,
        error: "До следующей брони должно оставаться минимум 15 минут",
      };
    }

    // 5. Проверка зазора ПОСЛЕ предыдущей брони (новая бронь после существующей)
    // Сдвигаем виртуальную границу существующей брони вперед на MIN_GAP
    if (startTime < seg.endTime + MIN_GAP && endTime > seg.endTime) {
      return {
        isValid: false,
        error: "После предыдущей брони должно оставаться минимум 15 минут",
      };
    }
  }

  // Все проверки успешно пройдены
  return { isValid: true };
};
