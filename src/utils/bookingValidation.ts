import { END_HOUR, MIN_DURATION, MIN_GAP, START_HOUR } from "../constants/grid";
import { BookingSegment } from "../store/useBookingStore";

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateBookingSlot = (
  targetResourceId: string,
  startTime: number,
  existingSegments: BookingSegment[],
  nowTimestamp: number,
  customEndTime?: number,
): ValidationResult => {
  const endTime = customEndTime ?? startTime + MIN_DURATION;

  // 1. Проверка на прошлое время
  if (startTime < nowTimestamp) {
    return { isValid: false, error: "Нельзя забронировать прошедшее время" };
  }

  // 2. Проверка на рабочие часы (избегаем мутаций дат, работаем через границы дня)
  const baseDay = new Date(startTime);
  const workStart = new Date(baseDay).setHours(START_HOUR, 0, 0, 0);
  const workEnd = new Date(baseDay).setHours(END_HOUR, 0, 0, 0);

  if (startTime < workStart || endTime > workEnd) {
    return {
      isValid: false,
      error: "Бронь выходит за рамки рабочего дня",
    };
  }

  // 3. Проверка пересечений с учетом буферной зоны (Collision Detection)
  const tableSegments = existingSegments.filter(
    (seg) => seg.resourceId === targetResourceId,
  );

  for (const seg of tableSegments) {
    const hasCollision =
      startTime < seg.endTime + MIN_GAP && endTime > seg.startTime - MIN_GAP;

    if (hasCollision) {
      return {
        isValid: false,
        error: "Пересечение с другой бронью или нарушение зазора между гостями",
      };
    }
  }

  return { isValid: true };
};
