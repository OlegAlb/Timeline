import {
  Group,
  RoundedRect,
  Text,
  matchFont,
} from "@shopify/react-native-skia";
import React from "react";
import { Platform } from "react-native";
import {
  HEADER_HEIGHT,
  HOUR_WIDTH,
  ROW_HEIGHT,
  SIDEBAR_WIDTH,
  START_HOUR,
} from "../constants/grid";
import { Booking, BookingSegment } from "../store/useBookingStore";

interface BookingBlockProps {
  segment: BookingSegment;
  booking: Booking;
}

export const BookingBlock: React.FC<BookingBlockProps> = ({
  segment,
  booking,
}) => {
  // 1. Вычисляем координату X на основе минут
  const minutesFromTimelineStart = segment.startTime - START_HOUR * 60;
  const x = SIDEBAR_WIDTH + (minutesFromTimelineStart / 60) * HOUR_WIDTH;

  // 2. Вычисляем ширину на основе длительности в минутах
  const durationMinutes = segment.endTime - segment.startTime;
  const width = (durationMinutes / 60) * HOUR_WIDTH;

  const tableIndex = parseInt(segment.resourceId.replace("table_", ""), 10) - 1;
  const y = HEADER_HEIGHT + tableIndex * ROW_HEIGHT + 6; // +6 для отступа внутри ячейки
  const height = ROW_HEIGHT - 12; // уменьшаем высоту для красивого зазора

  const fontFamily = Platform.select({
    ios: "Arial",
    android: "sans-serif",
    default: "System",
  });

  const font = matchFont({ fontFamily, fontSize: 13, fontWeight: "bold" });

  return (
    <Group>
      <RoundedRect
        x={x}
        y={y}
        width={width - 4}
        height={height}
        r={8}
        color="#4F46E5"
      />
      {/* Текст внутри брони */}
      {font && (
        <Text
          x={x + 10}
          y={y + ROW_HEIGHT / 2 - 2}
          text={booking.customerName}
          font={font}
          color="#FFFFFF"
        />
      )}
    </Group>
  );
};
