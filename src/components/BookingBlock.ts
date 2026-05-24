import { SkCanvas, SkFont, SkPaint, rect, Skia } from "@shopify/react-native-skia";
import { ROW_HEIGHT } from "../constants/grid";
import { Booking, BookingSegment } from "../store/useBookingStore";
import { getXFromTime, getYFromResourceId, getWidthByDuration } from "@/src/utils/gridMath";

// Интерфейс для шеринга подготовленных Paint-объектов (чтобы не пересоздавать их в цикле)
interface GridPaints {
  rectPaint: SkPaint;
  textPaint: SkPaint;
  deleteBtnPaint: SkPaint;
  crossPaint: SkPaint;
}

/**
 * Императивный хелпер для отрисовки блока бронирования прямо на Skia Canvas.
 * Пометка "worklet" обязательна, чтобы функция могла безопасно вызываться на UI-потоке.
 */
export const drawBookingBlock = (
  canvas: SkCanvas,
  segment: BookingSegment,
  booking: Booking,
  font: SkFont | null,
  paints: GridPaints
) => {
  "worklet"; // Гарантирует выполнение на UI Thread (C++) внутри Reanimated

  // 1. Вычисляем геометрию блока
  const x = getXFromTime(segment.startTime);
  const y = getYFromResourceId(segment.resourceId) + 6;
  const width = getWidthByDuration(segment.endTime - segment.startTime) - 4;
  const height = ROW_HEIGHT - 12;

  // 2. Отрисовка плашки брони
  paints.rectPaint.setColor(
    Skia.Color(booking.status === "confirmed" ? "#4F46E5" : "#FFC107")
  );
  const rrect = Skia.RRectXY(rect(x, y, width, height), 8, 8);
  canvas.drawRRect(rrect, paints.rectPaint);

  // 3. Отрисовка имени клиента
  if (font) {
    canvas.drawText(
      booking.customerName,
      x + 10,
      y + height / 2 + 4,
      paints.textPaint,
      font
    );
  }

  // 4. Отрисовка кнопки удаления
  if (width > 60) {
    const buttonRadius = 10;
    const buttonX = x + width - 22;
    const buttonY = y + height / 2;

    // Круг-подложка
    canvas.drawCircle(buttonX, buttonY, buttonRadius, paints.deleteBtnPaint);

    // Крестик
    const crossSize = 3.5;
    canvas.drawLine(
      buttonX - crossSize,
      buttonY - crossSize,
      buttonX + crossSize,
      buttonY + crossSize,
      paints.crossPaint
    );
    canvas.drawLine(
      buttonX + crossSize,
      buttonY - crossSize,
      buttonX - crossSize,
      buttonY + crossSize,
      paints.crossPaint
    );
  }
};