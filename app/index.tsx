import {
  Canvas,
  Group,
  matchFont,
  PaintStyle,
  Picture,
  rect,
  Skia,
  StrokeCap,
} from "@shopify/react-native-skia";
import React, { useCallback, useEffect } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { drawBookingBlock } from "@/src/components/BookingBlock";
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
  const { scrollX, scrollY, scale, composedGesture } = useGridGestureEngine({
    topInset: insets.top,
    bottomInset: insets.bottom,
    screenWidth,
    screenHeight,
    onCellTap: handleCellTap,
  });

  const contentTransform = useDerivedValue(() => [
    { translateY: insets.top },
    { translateX: SIDEBAR_WIDTH },
    { translateY: HEADER_HEIGHT },
    { translateX: -scrollX.value },
    { translateY: -scrollY.value },
    { scale: scale.value },
    { translateX: -SIDEBAR_WIDTH },
    { translateY: -HEADER_HEIGHT },
  ]);

  const clipBounds = rect(
    SIDEBAR_WIDTH,
    HEADER_HEIGHT + insets.top,
    screenWidth - SIDEBAR_WIDTH,
    screenHeight - (HEADER_HEIGHT + insets.top + insets.bottom),
  );

  const font = matchFont({
    fontFamily: Platform.select({
      ios: "Arial",
      android: "sans-serif",
      default: "System",
    }),
    fontSize: 13,
    fontWeight: "bold",
  });

  const bookingPicture = useDerivedValue(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(
      rect(0, 0, screenWidth * 4, screenHeight * 4),
    );

    const paints = {
      rectPaint: Skia.Paint(),
      textPaint: Skia.Paint(),
      deleteBtnPaint: Skia.Paint(),
      crossPaint: Skia.Paint(),
    };

    // Конфигурируем paints (антиалиасинг, цвета, strokeWidth)...
    paints.rectPaint.setAntiAlias(true);
    paints.textPaint.setColor(Skia.Color("#FFFFFF"));
    paints.deleteBtnPaint.setAntiAlias(true);
    paints.deleteBtnPaint.setColor(Skia.Color("#EF4444"));
    paints.crossPaint.setAntiAlias(true);
    paints.crossPaint.setColor(Skia.Color("#FFFFFF"));
    paints.crossPaint.setStrokeWidth(2);
    paints.crossPaint.setStyle(PaintStyle.Stroke);
    paints.crossPaint.setStrokeCap(StrokeCap.Round);

    const sc = scale.value;
    const sx = scrollX.value;
    const sy = scrollY.value;
    const BUFFER = 150 / sc; // Масштабируем буфер отсечения

    const visibleWidth = screenWidth - SIDEBAR_WIDTH;
    const visibleHeight =
      screenHeight - HEADER_HEIGHT - insets.top - insets.bottom;

    // Границы видимости
    const viewportLeft = SIDEBAR_WIDTH + (sx - BUFFER) / sc;
    const viewportRight = SIDEBAR_WIDTH + (sx + visibleWidth + BUFFER) / sc;
    const viewportTop = HEADER_HEIGHT + (sy - BUFFER) / sc;
    const viewportBottom = HEADER_HEIGHT + (sy + visibleHeight + BUFFER) / sc;

    segmentsSV.value.forEach((segment) => {
      const booking = bookingsSV.value[segment.bookingId];
      if (!booking) return;

      const x = getXFromTime(segment.startTime);
      const y = getYFromResourceId(segment.resourceId) + 6;
      const width = getWidthByDuration(segment.endTime - segment.startTime) - 4;
      const height = ROW_HEIGHT - 12;

      const isVisible =
        x + width >= viewportLeft &&
        x <= viewportRight &&
        y + height >= viewportTop &&
        y <= viewportBottom;

      if (isVisible) {
        drawBookingBlock(canvas, segment, booking, font, paints);
      }
    });

    return recorder.finishRecordingAsPicture();
  }, [screenWidth, screenHeight, font]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View
          style={{ width: screenWidth, height: screenHeight }}
          collapsable={false}
        >
          <Canvas style={styles.canvas}>
            {/* Передаем scale внутрь сетки */}
            <Grid
              scrollX={scrollX}
              scrollY={scrollY}
              scale={scale}
              topInset={insets.top}
            />

            <Group clip={clipBounds}>
              <Group transform={contentTransform}>
                <Picture picture={bookingPicture} />
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
