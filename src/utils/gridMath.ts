import {
  HEADER_HEIGHT,
  HOUR_WIDTH,
  ROW_HEIGHT,
  SIDEBAR_WIDTH,
  START_HOUR,
  TIME_STEP_MINUTES,
  VIRTUAL_GRID_WIDTH,
} from "../constants/grid";
import { ONE_HOUR_MS, ONE_MINUTE_MS } from "../constants/time";
import { BookingSegment } from "../store/useBookingStore";

/**
 * Переводит таймстамп в X-координату на холсте относительно начала выбранного дня.
 */
export const getXFromTime = (
  timestamp: number,
  baseDayStartMs: number,
): number => {
  "worklet";

  const msFromMidnight = timestamp - baseDayStartMs;
  const hoursFromMidnight = msFromMidnight / ONE_HOUR_MS;
  const relativeHours = hoursFromMidnight - START_HOUR;

  return SIDEBAR_WIDTH + relativeHours * HOUR_WIDTH;
};

/**
 * Переводит X-координату холста в таймстамп для конкретного дня.
 */
export const getTimeFromX = (
  absoluteX: number,
  baseDayStartMs: number,
): number => {
  "worklet";

  const relativeX = absoluteX - SIDEBAR_WIDTH;
  if (relativeX < 0) return baseDayStartMs + START_HOUR * ONE_HOUR_MS;

  const hoursFromStart = relativeX / HOUR_WIDTH;
  const totalMinutes = hoursFromStart * 60;

  const snappedMinutes =
    Math.round(totalMinutes / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;

  const startHourMs = START_HOUR * ONE_HOUR_MS;
  const snappedMs = snappedMinutes * ONE_MINUTE_MS;

  return baseDayStartMs + startHourMs + snappedMs;
};

/**
 * Возвращает индекс строки (0, 1, 2...) по Y-координате
 */
export const getRowIndexFromY = (absoluteY: number): number | null => {
  "worklet";

  const relativeY = absoluteY - HEADER_HEIGHT;
  if (relativeY < 0) return 0;

  return Math.floor(relativeY / ROW_HEIGHT);
};

/**
 * Возвращает Y-координату начала строки по её индексу
 */
export const getYFromRowIndex = (index: number): number => {
  "worklet";
  return HEADER_HEIGHT + index * ROW_HEIGHT;
};

export const getRowIndexFromResourceId = (resourceId: string): number => {
  "worklet";
  const cleanId = resourceId.replace(/\D/g, "");
  const index = parseInt(cleanId, 10) - 1;
  return isNaN(index) ? 0 : index;
};

/**
 * Рассчитывает начальный скролл на основе переданного текущего времени
 */
export const getInitialScrollX = (
  currentTimestamp: number,
  baseDayStartMs: number,
  screenWidth: number,
): number => {
  "worklet";

  const hoursPassed =
    (currentTimestamp - baseDayStartMs) / ONE_HOUR_MS - START_HOUR;

  const MAX_SCROLL_X = Math.max(
    0,
    VIRTUAL_GRID_WIDTH - (screenWidth - SIDEBAR_WIDTH),
  );

  if (hoursPassed <= 0) return 0;
  const targetX = hoursPassed * HOUR_WIDTH;
  return Math.min(Math.max(0, targetX), MAX_SCROLL_X);
};

export const getWidthByDuration = (
  durationMs: number,
  hourWidth: number = HOUR_WIDTH,
): number => {
  "worklet";
  return (durationMs / ONE_HOUR_MS) * hourWidth;
};

/**
 * Переводит экранные координаты касания в координаты виртуального холста (canvas)
 * с учетом скролла, масштабирования и системных отступов.
 */
export function getCanvasCoords(
  screenX: number,
  screenY: number,
  scrollX: number,
  scrollY: number,
  scale: number,
  topInset: number,
  sidebarWidth: number,
  headerHeight: number,
) {
  "worklet";
  const canvasX = (screenX - sidebarWidth + scrollX) / scale + sidebarWidth;
  const canvasY =
    (screenY - topInset - headerHeight + scrollY) / scale + headerHeight;
  return { canvasX, canvasY };
}

/**
 * Выполняет хит-тестинг: ищет, над каким сегментом бронирования
 * находятся виртуальные координаты холста.
 */
export function findSegmentAtCoords(
  canvasX: number,
  canvasY: number,
  segments: BookingSegment[],
  baseDayStartMs: number,
  rowHeight: number,
  getXFromTime: (time: number, baseMs: number) => number,
  getYFromRowIndex: (index: number) => number,
  getWidthByDuration: (duration: number) => number,
): BookingSegment | null {
  "worklet";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg.resourceId) continue;

    const tableIndex = parseInt(seg.resourceId.replace("table_", ""), 10) - 1;
    if (isNaN(tableIndex)) continue;

    const segX = getXFromTime(seg.startTime, baseDayStartMs);
    const segY = getYFromRowIndex(tableIndex);
    const segW = getWidthByDuration(seg.endTime - seg.startTime);

    if (
      canvasX >= segX &&
      canvasX <= segX + segW &&
      canvasY >= segY &&
      canvasY <= segY + rowHeight
    ) {
      return seg;
    }
  }
  return null;
}

/**
 * Вычисляет максимально доступное время окончания (endTime) для ресайза сегмента,
 * предотвращая наложение на следующие бронирования той же строки или выход за рамки сетки.
 */
export function calculateMaxEndTime(
  currentSeg: BookingSegment,
  segments: BookingSegment[],
  endHour: number,
  minGapMs: number,
  baseDayStartMs: number,
): number {
  "worklet";

  const dayEndMs = baseDayStartMs + endHour * 60 * 60 * 1000;
  let maxEndTime = dayEndMs;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (
      seg.id !== currentSeg.id &&
      seg.resourceId === currentSeg.resourceId &&
      seg.startTime > currentSeg.startTime
    ) {
      const allowedLimitBeforeSeg = seg.startTime - minGapMs;
      if (allowedLimitBeforeSeg < maxEndTime) {
        maxEndTime = allowedLimitBeforeSeg;
      }
    }
  }

  return maxEndTime;
}
