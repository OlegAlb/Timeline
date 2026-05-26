import { Gesture } from "react-native-gesture-handler";
import { SharedValue, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { HEADER_HEIGHT, ROW_HEIGHT, SIDEBAR_WIDTH } from "../constants/grid";
import { BookingSegment } from "../store/useBookingStore";
import {
  getWidthByDuration,
  getXFromTime,
  getYFromRowIndex,
} from "../utils/gridMath";

interface DragProps {
  scrollX: SharedValue<number>;
  scrollY: SharedValue<number>;
  scale: SharedValue<number>;
  topInset: number;
  baseDayStartMs: number;
  segmentsSV: SharedValue<BookingSegment[]>;
  onDragStart: (id: string, width: number) => void;
  onDragEnd: (id: string, finalX: number, finalY: number) => void;
}

export function useGridDragGesture({
  scrollX,
  scrollY,
  scale,
  topInset,
  baseDayStartMs,
  segmentsSV,
  onDragStart,
  onDragEnd,
}: DragProps) {
  const draggedSegmentId = useSharedValue<string | null>(null);
  const draggedX = useSharedValue(0);
  const draggedY = useSharedValue(0);
  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);

  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(400)
    .onStart((event) => {
      // Переводим начальную точку касания экрана в координаты холста canvas
      const canvasX =
        (event.x - SIDEBAR_WIDTH + scrollX.value) / scale.value + SIDEBAR_WIDTH;
      const canvasY =
        (event.y - topInset - HEADER_HEIGHT + scrollY.value) / scale.value +
        HEADER_HEIGHT;

      // Хит-тест: ищем, на какой сегмент наступили (прямо на UI-потоке)
      const segments = segmentsSV.value;
      let foundSeg = null;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const x = getXFromTime(seg.startTime, baseDayStartMs);

        const y = getYFromRowIndex(seg.resourceIndex) + 6;
        const width = getWidthByDuration(seg.endTime - seg.startTime) - 4;
        const height = ROW_HEIGHT - 12;

        if (
          canvasX >= x &&
          canvasX <= x + width &&
          canvasY >= y &&
          canvasY <= y + height
        ) {
          foundSeg = seg;
          break;
        }
      }

      if (foundSeg) {
        draggedSegmentId.value = foundSeg.id;
        const width =
          getWidthByDuration(foundSeg.endTime - foundSeg.startTime) - 4;

        scheduleOnRN(onDragStart, foundSeg.id, width);

        dragOffsetX.value =
          canvasX - getXFromTime(foundSeg.startTime, baseDayStartMs);

        dragOffsetY.value =
          canvasY - (getYFromRowIndex(foundSeg.resourceIndex) + 6);

        draggedX.value = canvasX - dragOffsetX.value;
        draggedY.value = canvasY - dragOffsetY.value;
      }
    })
    .onUpdate((event) => {
      if (!draggedSegmentId.value) return;

      const canvasX =
        (event.x - SIDEBAR_WIDTH + scrollX.value) / scale.value + SIDEBAR_WIDTH;
      const canvasY =
        (event.y - topInset - HEADER_HEIGHT + scrollY.value) / scale.value +
        HEADER_HEIGHT;

      // Плавно двигаем блок за пальцем
      draggedX.value = canvasX - dragOffsetX.value;
      draggedY.value = canvasY - dragOffsetY.value;
    })
    .onEnd(() => {
      if (!draggedSegmentId.value) return;

      // Передаем финальные координаты на JS-поток для валидации и сохранения
      scheduleOnRN(
        onDragEnd,
        draggedSegmentId.value,
        draggedX.value,
        draggedY.value,
      );
      draggedSegmentId.value = null;
    });

  return { draggedX, draggedY, draggedSegmentId, dragGesture };
}
