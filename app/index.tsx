import { Canvas, Group, rect } from "@shopify/react-native-skia";
import React, { useCallback } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useDerivedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookingBlock } from "../src/components/BookingBlock";
import { Grid } from "../src/components/Grid";
import { COLORS, HEADER_HEIGHT, SIDEBAR_WIDTH } from "../src/constants/grid";
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

  // СЕНЬОР-ПАТТЕРН: Изолированная JS-функция обработки тапа.
  // Оборачиваем в useCallback, чтобы ссылка была стабильной и Reanimated не ругался.
  const handleCellTap = useCallback(
    (tableId: string, startTime: number) => {
      const bookingId = `booking_${Date.now()}`;
      const segmentId = `seg_${Date.now()}`;
      const duration = 2 * 60 * 60 * 1000; // 2 часа
      const endTime = startTime + duration;

      const newBooking = {
        id: bookingId,
        customerName: "Новый гость 🍽️",
        status: "confirmed" as const,
      };

      const newSegment = {
        id: segmentId,
        bookingId: bookingId,
        resourceId: tableId,
        startTime: startTime,
        endTime: endTime,
      };

      // Спокойно обновляем Zustand в родном JS-потоке
      addBookingWithSegments(newBooking, [newSegment]);
    },
    [addBookingWithSegments],
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
