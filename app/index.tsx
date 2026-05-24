import { Canvas, Group, rect, Skia } from "@shopify/react-native-skia";
import React, { useCallback, useEffect } from "react";
import { Alert, StyleSheet, useWindowDimensions, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookingBlock } from "@/src/components/BookingBlock";
import {
  getWidthByDuration,
  getXFromTime,
  getYFromResourceId,
  validateBookingSlot,
} from "@/src/utils/gridMath";
import { Grid } from "../src/components/Grid";
import {
  COLORS,
  HEADER_HEIGHT,
  MIN_DURATION,
  ROW_HEIGHT,
  SIDEBAR_WIDTH,
} from "../src/constants/grid";
import { useGridGestureEngine } from "../src/hooks/useGridGestureEngine";
import { useBookingStore } from "../src/store/useBookingStore";

export default function MainScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Достаем данные из Zustand
  const segments = useBookingStore((state) => state.segments);
  const bookings = useBookingStore((state) => state.bookings);
  const addBookingWithSegments = useBookingStore(
    (state) => state.addBookingWithSegments,
  );
  const deleteBooking = useBookingStore((state) => state.deleteBooking);

  const segmentsSV = useSharedValue(segments);
  const bookingsSV = useSharedValue(bookings);

  useEffect(() => {
    segmentsSV.value = segments;
    bookingsSV.value = bookings;
  }, [segments, bookings]);

  const bookingPicture = useDerivedValue(() => {
    // Инициализируем рекордер Skia
    const recorder = Skia.PictureRecorder();
    // Создаем холст для записи (размер равен экрану или контенту)
    const canvas = recorder.beginRecording(
      rect(0, 0, screenWidth * 3, screenHeight * 3),
    );

    const currentSegments = segmentsSV.value;
    const currentBookings = bookingsSV.value;

    // Настраиваем краску один раз
    const paint = Skia.Paint();
    paint.setAntiAlias(true);

    // Проходим по массиву и пишем команды напрямую в GPU-команды
    currentSegments.forEach((segment) => {
      const booking = currentBookings[segment.bookingId];
      if (!booking) return;

      const x = getXFromTime(segment.startTime);
      const y = getYFromResourceId(segment.resourceId);
      const width = getWidthByDuration(segment.endTime - segment.startTime);
      const height = ROW_HEIGHT - 4;

      // Цвет в зависимости от статуса
      paint.setColor(
        Skia.Color(booking.status === "confirmed" ? "#4CAF50" : "#FFC10750"),
      );

      // Записываем команду отрисовки прямоугольника
      canvas.drawRect(rect(x, y, width, height), paint);
    });

    // Возвращаем скомпилированную картинку
    return recorder.finishRecordingAsPicture();
  });

  const handleCellTap = useCallback(
    (tableId: string, startTime: number, canvasX: number, canvasY: number) => {
      // 1. Ищем сегмент, по которому кликнули
      const clickedSegment = segments.find(
        (seg) =>
          seg.resourceId === tableId &&
          startTime >= seg.startTime &&
          startTime < seg.endTime,
      );

      // 2. Если сегмент найден — проверяем, попали ли в кнопку удаления
      if (clickedSegment) {
        // Воспроизводим геометрию блока для расчета положения кнопки
        const x = getXFromTime(clickedSegment.startTime);
        const width = getWidthByDuration(
          clickedSegment.endTime - clickedSegment.startTime,
        );
        const y = getYFromResourceId(clickedSegment.resourceId) + 6;
        const height = ROW_HEIGHT - 12;

        const buttonX = x + width - 22;
        const buttonY = y + height / 2;
        const buttonRadius = 12; // Даем радиус чуть больше (12 вместо 10) для облегчения тапа пальцем

        // Считаем расстояние от точки клика до центра кнопки по формуле гипотенузы
        const dx = canvasX - buttonX;
        const dy = canvasY - buttonY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Если кликнули в область кнопки удаления (+ небольшой зазор на погрешность пальца)
        if (distance <= buttonRadius + 4) {
          Alert.alert(
            "Удалить бронирование?",
            `Вы действительно хотите удалить бронь на имя ${bookings[clickedSegment.bookingId]?.customerName}?`,
            [
              { text: "Отмена", style: "cancel" },
              {
                text: "Удалить",
                style: "destructive",
                onPress: () => deleteBooking(clickedSegment.bookingId),
              },
            ],
          );
          return; // Завершаем выполнение, чтобы не открывать карточку редактирования
        }

        // 3. Если в кнопку не попали — это обычный клик по телу брони (например, просмотр/редактирование)
        const targetBooking = bookings[clickedSegment.bookingId];
        Alert.alert("Инфо", `Просмотр брони: ${targetBooking?.customerName}`);
        return;
      }

      // 4. Логика создания НОВОЙ брони (если кликнули на пустую ячейку)
      const bookingId = `booking_${Date.now()}`;
      const segmentId = `seg_${Date.now()}`;
      const endTime = startTime + MIN_DURATION;

      const validation = validateBookingSlot(tableId, startTime, segments);

      if (!validation.isValid) {
        Alert.alert("Ошибка", validation.error || "Невозможно забронировать");
      } else {
        const newBooking = {
          id: bookingId,
          customerName: "Новый гость",
          status: "confirmed" as const,
        };

        const newSegment = {
          id: segmentId,
          bookingId: bookingId,
          resourceId: tableId,
          startTime: startTime,
          endTime: endTime,
        };

        addBookingWithSegments(newBooking, [newSegment]);
      }
    },
    [segments, bookings, deleteBooking, addBookingWithSegments],
  );

  // Инициализируем движок, передавая topInset и изолированный коллбэк
  const { scrollX, scrollY, composedGesture } = useGridGestureEngine({
    topInset: insets.top,
    onCellTap: handleCellTap,
  });

  const contentTransform = useDerivedValue(() => [
    { translateY: insets.top },
    { translateX: -scrollX.value },
    { translateY: -scrollY.value },
  ]);

  const clipBounds = rect(
    SIDEBAR_WIDTH,
    HEADER_HEIGHT + insets.top,
    screenWidth - SIDEBAR_WIDTH,
    screenHeight - (HEADER_HEIGHT + insets.top + insets.bottom),
  );

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View
          style={{ width: screenWidth, height: screenHeight }}
          collapsable={false}
        >
          <Canvas style={styles.canvas}>
            <Grid scrollX={scrollX} scrollY={scrollY} topInset={insets.top} />

            <Group clip={clipBounds}>
              <Group transform={contentTransform}>
                {segments.map((segment) => {
                  const booking = bookings[segment.bookingId];
                  if (!booking) return null;

                  return (
                    <BookingBlock
                      key={segment.id}
                      segment={segment}
                      booking={booking}
                    />
                  );
                })}
              </Group>
            </Group>
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgBackground },
  canvas: { flex: 1 },
});
