import {
  getWidthByDuration,
  getXFromTime,
  getYFromResourceId,
} from "@/src/utils/gridMath";
import {
  Circle,
  Group,
  Line,
  matchFont,
  RoundedRect,
  Text,
  vec,
} from "@shopify/react-native-skia";
import React from "react";
import { Platform } from "react-native";
import { ROW_HEIGHT } from "../constants/grid";
import { Booking, BookingSegment } from "../store/useBookingStore";

interface BookingBlockProps {
  segment: BookingSegment;
  booking: Booking;
}

export const BookingBlock: React.FC<BookingBlockProps> = ({
  segment,
  booking,
}) => {
  const x = getXFromTime(segment.startTime);
  const width = getWidthByDuration(segment.endTime - segment.startTime);
  const y = getYFromResourceId(segment.resourceId) + 6;
  const height = ROW_HEIGHT - 12;

  const fontFamily = Platform.select({
    ios: "Arial",
    android: "sans-serif",
    default: "System",
  });
  const font = matchFont({ fontFamily, fontSize: 13, fontWeight: "bold" });

  // 1. Вычисляем центр кнопки удаления
  const buttonRadius = 10;
  const buttonX = x + width - 22; // Отступ 22px от правого края блока
  const buttonY = y + height / 2;

  // 2. Математика крестика: вычисляем смещение векторов от центра кнопки
  const crossSize = 3.5; // Половина размера крестика (итоговый размах будет 7px)

  // Линия 1: Слева-сверху -> Справа-снизу
  const line1Start = vec(buttonX - crossSize, buttonY - crossSize);
  const line1End = vec(buttonX + crossSize, buttonY + crossSize);

  // Линия 2: Справа-сверху -> Слева-снизу
  const line2Start = vec(buttonX + crossSize, buttonY - crossSize);
  const line2End = vec(buttonX - crossSize, buttonY + crossSize);

  return (
    <Group>
      {/* Основной плашка брони */}
      <RoundedRect
        x={x}
        y={y}
        width={width - 4}
        height={height}
        r={8}
        color="#4F46E5"
      />

      {/* Имя клиента */}
      {font && (
        <Text
          x={x + 10}
          y={y + height / 2 + 4}
          text={booking.customerName}
          font={font}
          color="#FFFFFF"
        />
      )}

      {/* ВЕКТОРНАЯ КНОПКА УДАЛЕНИЯ */}
      {/* Рисуем кнопку только если карточка достаточно длинная */}
      {width > 60 && (
        <Group>
          {/* Красный круг-подложка */}
          <Circle cx={buttonX} cy={buttonY} r={buttonRadius} color="#EF4444" />

          {/* Рисуем крестик из двух честных линий */}
          <Line
            p1={line1Start}
            p2={line1End}
            color="#FFFFFF"
            strokeWidth={2}
            strokeCap="round"
          />
          <Line
            p1={line2Start}
            p2={line2End}
            color="#FFFFFF"
            strokeWidth={2}
            strokeCap="round"
          />
        </Group>
      )}
    </Group>
  );
};
