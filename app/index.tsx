import { drawBookingBlock } from "@/src/canvas/drawBookingBlock";
import { COLORS } from "@/src/constants/colors";
import { ONE_MINUTE_MS } from "@/src/constants/time";
import { validateBookingSlot } from "@/src/utils/bookingValidation";
import {
  getRowIndexFromY,
  getTimeFromX,
  getXFromTime,
  getYFromRowIndex,
} from "@/src/utils/gridMath";
import {
  Canvas,
  Group,
  matchFont,
  Picture,
  rect,
  RoundedRect,
  Skia,
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
import { Grid } from "../src/components/Grid";
import {
  HEADER_HEIGHT,
  MIN_DURATION,
  ROW_HEIGHT,
  SIDEBAR_WIDTH,
  VIRTUAL_GRID_HEIGHT, // Не забудь экспортировать/импортировать эти константы
  VIRTUAL_GRID_WIDTH,
} from "../src/constants/grid";
import { useGridGestureEngine } from "../src/hooks/useGridGestureEngine";
import {
  useBookingActions,
  useBookings,
  useSegments,
  useSegmentsArray,
} from "../src/store/useBookingStore";

export default function MainScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const segments = useSegments();
  const segmentsArray = useSegmentsArray();
  const bookings = useBookings();

  const { addBookingWithSegments, deleteBooking, updateSegment } =
    useBookingActions();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedWidthState, setDraggedWidthState] = useState(0);
  const [resizingId, setResizingId] = useState<string | null>(null);

  const segmentsSV = useSharedValue(segmentsArray);

  useEffect(() => {
    segmentsSV.value = segmentsArray;
  }, [segmentsArray]);

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

  const baseDayStartMs = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, []);

  const draggedBookingName = useMemo(() => {
    if (!draggedId) return "";
    const seg = segmentsArray.find((s) => s.id === draggedId);
    return bookings[seg?.bookingId || ""]?.customerName || "Перенос...";
  }, [draggedId, segmentsArray, bookings]);

  const bookingPicture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
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
      controlPaint: Skia.Paint(),
    };

    // Настраиваем кисть для фона бронирования
    paints.rectPaint.setAntiAlias(true);
    paints.rectPaint.setColor(Skia.Color(COLORS.booking)); // <-- ДОБАВЬТЕ ЭТУ СТРОКУ

    // Настраиваем остальные кисти
    paints.textPaint.setColor(Skia.Color(COLORS.textMain));
    paints.controlPaint.setColor(Skia.Color(COLORS.textMain));

    segmentsArray.forEach((segment) => {
      if (segment.id === draggedId || segment.id === resizingId) return;

      const booking = bookings[segment.bookingId];
      if (!booking) return;

      drawBookingBlock(canvas, segment, booking, font, baseDayStartMs, paints);
    });

    return recorder.finishRecordingAsPicture();
  }, [
    segmentsArray,
    bookings,
    font,
    draggedId,
    resizingId,
    screenWidth,
    screenHeight,
  ]);

  const handleDragStart = useCallback((id: string, width: number) => {
    setDraggedId(id);
    setDraggedWidthState(width);
  }, []);

  const handleDragEnd = useCallback(
    (id: string, canvasX: number, canvasY: number) => {
      setDraggedId(null);

      const rowIndex = getRowIndexFromY(canvasY);
      const targetTableId = rowIndex !== null ? `table_${rowIndex + 1}` : null;
      const rawStartTime = getTimeFromX(canvasX, baseDayStartMs);
      if (!targetTableId || !rawStartTime) return;

      const originalSegment = segmentsArray.find((s) => s.id === id);
      if (!originalSegment) return;

      const GRID_STEP_MS = 15 * ONE_MINUTE_MS;
      const snappedStartTime =
        Math.round(rawStartTime / GRID_STEP_MS) * GRID_STEP_MS;

      const duration = originalSegment.endTime - originalSegment.startTime;
      const snappedEndTime = snappedStartTime + duration;

      const otherSegments = segmentsArray.filter((s) => s.id !== id);

      const validation = validateBookingSlot(
        targetTableId,
        snappedStartTime,
        otherSegments,
        Date.now(),
      );

      if (!validation.isValid) {
        Alert.alert("Ошибка перемещения", validation.error || "Слот занят");
        return;
      }

      const MIN_GAP_MS = 15 * ONE_MINUTE_MS;
      const hasOverlap = otherSegments.some((seg) => {
        if (seg.resourceId !== targetTableId) return false;

        return !(
          snappedEndTime + MIN_GAP_MS <= seg.startTime ||
          seg.endTime + MIN_GAP_MS <= snappedStartTime
        );
      });

      if (hasOverlap) {
        Alert.alert(
          "Ошибка перемещения",
          "Растянутая бронь пересекается с другим бронированием или нарушает минимальный зазор в 15 минут",
        );
      } else {
        updateSegment(
          id,
          targetTableId,
          rowIndex || 0,
          snappedStartTime,
          snappedEndTime,
        );
      }
    },
    [segmentsArray, updateSegment],
  );

  const handleResizeStart = useCallback((id: string) => {
    setResizingId(id);
  }, []);

  const handleResizeEnd = useCallback(
    (
      id: string,
      payload: { finalWidth: number; calculatedNewEndTime?: number },
    ) => {
      const { finalWidth, calculatedNewEndTime } = payload;

      setResizingId(null);

      const originalSegment = segmentsArray.find((s) => s.id === id);
      if (!originalSegment) return;

      let targetEndTime = calculatedNewEndTime;
      if (!targetEndTime) {
        const startX = getXFromTime(originalSegment.startTime, baseDayStartMs);
        targetEndTime = getTimeFromX(startX + finalWidth, baseDayStartMs);
      }
      if (!targetEndTime) return;

      const GRID_STEP_MS = 15 * ONE_MINUTE_MS; // 15 минут в мс
      let snappedEndTime =
        Math.round(targetEndTime / GRID_STEP_MS) * GRID_STEP_MS;

      const otherSegments = segmentsArray.filter((s) => s.id !== id);

      const MIN_GAP_MS = 15 * ONE_MINUTE_MS;

      let hasOverlap = otherSegments.some(
        (seg) =>
          seg.resourceId === originalSegment.resourceId &&
          !(
            snappedEndTime + MIN_GAP_MS <= seg.startTime ||
            originalSegment.startTime >= seg.endTime
          ),
      );

      if (hasOverlap) {
        snappedEndTime = targetEndTime;
        hasOverlap = otherSegments.some(
          (seg) =>
            seg.resourceId === originalSegment.resourceId &&
            !(
              snappedEndTime + MIN_GAP_MS <= seg.startTime ||
              originalSegment.startTime >= seg.endTime
            ),
        );
      }

      if (hasOverlap) {
        Alert.alert(
          "Ошибка изменения длительности",
          "Слот пересекается с другим бронированием или нарушает минимальный зазор",
        );
      } else {
        updateSegment(
          id,
          originalSegment.resourceId,
          originalSegment.resourceIndex,
          originalSegment.startTime,
          snappedEndTime,
        );
      }
    },
    [segments, updateSegment],
  );

  const handleCellTap = useCallback(
    (tableId: string, startTime: number) => {
      const clickedSegment = segmentsArray.find(
        (seg) =>
          seg.resourceId === tableId &&
          startTime >= seg.startTime &&
          startTime < seg.endTime,
      );

      if (clickedSegment) {
        const targetBooking = bookings[clickedSegment.bookingId];
        Alert.alert(
          "Управление бронированием",
          `Выбрано бронирование гостя: ${targetBooking?.customerName || "Без имени"}`,
          [
            { text: "Назад", style: "cancel" },
            {
              text: "Удалить бронь",
              style: "destructive",
              onPress: () => deleteBooking(clickedSegment.bookingId),
            },
          ],
        );
        return;
      }

      const bookingId = `booking_${Date.now()}`;
      const segmentId = `seg_${Date.now()}`;
      const endTime = startTime + MIN_DURATION;

      const validation = validateBookingSlot(
        tableId,
        startTime,
        segmentsArray,
        Date.now(),
      );

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
          resourceIndex: parseInt(tableId.replace("table_", ""), 10) - 1,
          startTime: startTime,
          endTime: endTime,
        };

        addBookingWithSegments(newBooking, [newSegment]);
      }
    },
    [segments, bookings, deleteBooking, addBookingWithSegments],
  );

  const {
    scrollX,
    scrollY,
    scale,
    draggedX,
    draggedY,
    resizingWidth,
    composedGesture,
  } = useGridGestureEngine({
    topInset: insets.top,
    bottomInset: insets.bottom,
    screenWidth,
    screenHeight,
    baseDayStartMs,
    segmentsSV,
    onCellTap: handleCellTap,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onResizeStart: handleResizeStart,
    onResizeEnd: handleResizeEnd,
  });

  const dragBlockTransform = useDerivedValue(() => [
    { translateX: draggedX.value },
    { translateY: draggedY.value },
  ]);

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
                <Picture picture={bookingPicture} />

                {draggedId !== null && (
                  <Group transform={dragBlockTransform}>
                    <RoundedRect
                      x={0}
                      y={0}
                      r={8}
                      width={draggedWidthState}
                      height={ROW_HEIGHT - 12}
                      color={COLORS.bookingDrag}
                      opacity={0.8}
                    />
                    <Text
                      x={10}
                      y={(ROW_HEIGHT - 12) / 2 + 4}
                      text={draggedBookingName}
                      font={font}
                      color={COLORS.textMain}
                    />
                  </Group>
                )}

                {resizingId !== null &&
                  (() => {
                    const seg = segmentsArray.find((s) => s.id === resizingId);
                    if (!seg) return null;
                    const x = getXFromTime(seg.startTime, baseDayStartMs);
                    const y = getYFromRowIndex(seg.resourceIndex) + 6;
                    const bName = bookings[seg.bookingId]?.customerName || "";
                    return (
                      <>
                        <RoundedRect
                          x={x}
                          y={y}
                          r={8}
                          width={resizingWidth}
                          height={ROW_HEIGHT - 12}
                          color={COLORS.booking}
                          opacity={0.9}
                        />
                        <Text
                          x={x + 10}
                          y={y + (ROW_HEIGHT - 12) / 2 + 4}
                          text={bName}
                          font={font}
                          color={COLORS.textMain}
                        />
                      </>
                    );
                  })()}
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
