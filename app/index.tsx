import {
  Canvas,
  Group,
  matchFont,
  PaintStyle,
  Picture,
  rect,
  RoundedRect,
  Skia,
  StrokeCap,
  Text,
} from "@shopify/react-native-skia";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  getResourceIdFromY,
  getTimeFromX,
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
  VIRTUAL_GRID_HEIGHT, // Не забудь экспортировать/импортировать эти константы
  VIRTUAL_GRID_WIDTH,
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
  const updateSegment = useBookingStore((state) => state.updateSegment);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedWidthState, setDraggedWidthState] = useState(0);

  const segmentsSV = useSharedValue(segments);
  useEffect(() => {
    segmentsSV.value = segments;
  }, [segments]);

  const handleDragStart = useCallback((id: string, width: number) => {
    setDraggedId(id);
    setDraggedWidthState(width);
  }, []);

  const handleDragEnd = useCallback(
    (id: string, finalCanvasX: number, finalCanvasY: number) => {
      setDraggedId(null); // Возвращаем видимость в основной снимок

      // 1. Пересчитываем координаты холста обратно в понятные сетке сущности
      // Берем центр строки (финальный Y + половина высоты строки), чтобы точнее попадать в нужный стол
      const targetTableId = getResourceIdFromY(
        finalCanvasY + (ROW_HEIGHT - 12) / 2,
      );
      const targetStartTime = getTimeFromX(finalCanvasX);

      if (!targetTableId || !targetStartTime) return;

      // 2. Ищем оригинальный сегмент для расчета его длительности
      const originalSegment = segments.find((s) => s.id === id);
      if (!originalSegment) return;

      const duration = originalSegment.endTime - originalSegment.startTime;
      const targetEndTime = targetStartTime + duration;

      // 3. ВАЖНО: Валидируем слот. Передаем ВСЕ сегменты, КРОМЕ текущего перемещаемого,
      // иначе он будет пересекаться сам с собой в своей старой точке!
      const otherSegments = segments.filter((s) => s.id !== id);
      const validation = validateBookingSlot(
        targetTableId,
        targetStartTime,
        otherSegments,
      );

      if (!validation.isValid) {
        Alert.alert("Ошибка перемещения", validation.error || "Слот занят");
      } else {
        // 4. Если всё ок — обновляем стор
        updateSegment(id, targetTableId, targetStartTime, targetEndTime);
      }
    },
    [segments, updateSegment],
  );

  // Стабилизируем шрифт, чтобы он не пересоздавался при каждом рендере
  const font = useMemo(
    () =>
      matchFont({
        fontFamily: Platform.select({
          ios: "Arial",
          android: "sans-serif",
          default: "System",
        }),
        fontSize: 13,
        fontWeight: "bold",
      }),
    [],
  );

  const handleCellTap = useCallback(
    (tableId: string, startTime: number, canvasX: number, canvasY: number) => {
      const clickedSegment = segments.find(
        (seg) =>
          seg.resourceId === tableId &&
          startTime >= seg.startTime &&
          startTime < seg.endTime,
      );

      if (clickedSegment) {
        const x = getXFromTime(clickedSegment.startTime);
        const width = getWidthByDuration(
          clickedSegment.endTime - clickedSegment.startTime,
        );
        const y = getYFromResourceId(clickedSegment.resourceId) + 6;
        const height = ROW_HEIGHT - 12;

        const buttonX = x + width - 22;
        const buttonY = y + height / 2;
        const buttonRadius = 12;

        const dx = canvasX - buttonX;
        const dy = canvasY - buttonY;
        const distance = Math.sqrt(dx * dx + dy * dy);

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
          return;
        }

        const targetBooking = bookings[clickedSegment.bookingId];
        Alert.alert("Инфо", `Просмотр брони: ${targetBooking?.customerName}`);
        return;
      }

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

  const { scrollX, scrollY, scale, draggedX, draggedY, composedGesture } =
    useGridGestureEngine({
      topInset: insets.top,
      bottomInset: insets.bottom,
      screenWidth,
      screenHeight,
      segmentsSV,
      onCellTap: handleCellTap,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    });

  const dragBlockTransform = useDerivedValue(() => [
    { translateX: draggedX.value },
    { translateY: draggedY.value },
  ]);

  const draggedBookingName = useMemo(() => {
    if (!draggedId) return "";
    const seg = segments.find((s) => s.id === draggedId);
    return bookings[seg?.bookingId || ""]?.customerName || "Перенос...";
  }, [draggedId, segments, bookings]);

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

  // Чистый React useMemo: перерисовывает Picture ТОЛЬКО при изменении данных в Zustand
  const bookingPicture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    // Создаем холст под размеры всей виртуальной сетки
    const canvas = recorder.beginRecording(
      rect(
        0,
        0,
        SIDEBAR_WIDTH + VIRTUAL_GRID_WIDTH,
        HEADER_HEIGHT + VIRTUAL_GRID_HEIGHT,
      ),
    );

    const paints = {
      rectPaint: Skia.Paint(),
      textPaint: Skia.Paint(),
      deleteBtnPaint: Skia.Paint(),
      crossPaint: Skia.Paint(),
    };

    paints.rectPaint.setAntiAlias(true);
    paints.textPaint.setColor(Skia.Color("#FFFFFF"));
    paints.deleteBtnPaint.setAntiAlias(true);
    paints.deleteBtnPaint.setColor(Skia.Color("#EF4444"));
    paints.crossPaint.setAntiAlias(true);
    paints.crossPaint.setColor(Skia.Color("#FFFFFF"));
    paints.crossPaint.setStrokeWidth(2);
    paints.crossPaint.setStyle(PaintStyle.Stroke);
    paints.crossPaint.setStrokeCap(StrokeCap.Round);

    segments.forEach((segment) => {
      if (segment.id === draggedId) return; // ПРОПУСКАЕМ перемещаемый элемент!

      const booking = bookings[segment.bookingId];
      if (!booking) return;

      const x = getXFromTime(segment.startTime);
      const y = getYFromResourceId(segment.resourceId) + 6;
      const width = getWidthByDuration(segment.endTime - segment.startTime) - 4;
      const height = ROW_HEIGHT - 12;

      // Твое ручное отсечение (viewport Left/Right/Top/Bottom)...
      // if (isVisible) drawBookingBlock(canvas, segment, booking, font, paints);
      drawBookingBlock(canvas, segment, booking, font, paints);
    });

    return recorder.finishRecordingAsPicture();
  }, [segments, bookings, font, draggedId, screenWidth, screenHeight]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View
          style={{ width: screenWidth, height: screenHeight }}
          collapsable={false}
        >
          <Canvas style={styles.canvas}>
            <Grid
              scrollX={scrollX}
              scrollY={scrollY}
              scale={scale}
              topInset={insets.top}
            />
            <Group clip={clipBounds}>
              <Group transform={contentTransform}>
                {/* Наша закэшированная картинка без перетаскиваемого блока */}
                <Picture picture={bookingPicture} />

                {/* Рендерим плавающий блок, только если идет процесс перетаскивания */}
                {draggedId !== null && (
                  <Group transform={dragBlockTransform}>
                    <RoundedRect
                      x={0}
                      y={0}
                      r={8}
                      width={draggedWidthState}
                      height={ROW_HEIGHT - 12}
                      color="#3B82F6" // Приятный синий цвет для активного Drag'а
                      opacity={0.8} // Делаем полупрозрачным, чтобы видеть сетку под ним
                    />
                    <Text
                      x={10}
                      y={(ROW_HEIGHT - 12) / 2 + 4}
                      text={draggedBookingName}
                      font={font}
                      color="#FFFFFF"
                    />
                  </Group>
                )}
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
