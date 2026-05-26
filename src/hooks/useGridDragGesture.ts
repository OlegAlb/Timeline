import { Gesture } from "react-native-gesture-handler";
import { SharedValue, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { HEADER_HEIGHT, ROW_HEIGHT, SIDEBAR_WIDTH } from "../constants/grid";
import { BookingSegment } from "../store/useBookingStore";
import {
  findSegmentAtCoords,
  getCanvasCoords,
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
      const { canvasX, canvasY } = getCanvasCoords(
        event.x,
        event.y,
        scrollX.value,
        scrollY.value,
        scale.value,
        topInset,
        SIDEBAR_WIDTH,
        HEADER_HEIGHT,
      );

      const foundSeg = findSegmentAtCoords(
        canvasX,
        canvasY,
        segmentsSV.value,
        baseDayStartMs,
        ROW_HEIGHT,
        getXFromTime,
        getYFromRowIndex,
        getWidthByDuration,
      );

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

      const { canvasX, canvasY } = getCanvasCoords(
        event.x,
        event.y,
        scrollX.value,
        scrollY.value,
        scale.value,
        topInset,
        SIDEBAR_WIDTH,
        HEADER_HEIGHT,
      );

      draggedX.value = canvasX - dragOffsetX.value;
      draggedY.value = canvasY - dragOffsetY.value;
    })
    .onEnd(() => {
      if (!draggedSegmentId.value) return;

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
