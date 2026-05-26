import { Gesture } from "react-native-gesture-handler";
import { SharedValue, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  END_HOUR,
  HEADER_HEIGHT,
  MIN_DURATION,
  ROW_HEIGHT,
  SIDEBAR_WIDTH,
} from "../constants/grid";
import { ONE_MINUTE_MS } from "../constants/time";
import { BookingSegment } from "../store/useBookingStore";
import {
  getTimeFromX,
  getWidthByDuration,
  getXFromTime,
  getYFromRowIndex,
} from "../utils/gridMath";

interface ResizeProps {
  scrollX: SharedValue<number>;
  scrollY: SharedValue<number>;
  scale: SharedValue<number>;
  topInset: number;
  baseDayStartMs: number;
  segmentsSV: SharedValue<BookingSegment[]>;
  onResizeStart: (id: string, initialWidth: number) => void;
  onResizeEnd: (
    id: string,
    payload: { finalWidth: number; calculatedNewEndTime?: number },
  ) => void;
}

export function useGridResizeGesture({
  scrollX,
  scrollY,
  scale,
  topInset,
  baseDayStartMs,
  segmentsSV,
  onResizeStart,
  onResizeEnd,
}: ResizeProps) {
  const resizingSegmentId = useSharedValue<string | null>(null);
  const resizingStartWidth = useSharedValue(0);
  const resizingWidth = useSharedValue(0);

  const resizeGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((event, manager) => {
      if (event.numberOfTouches !== 1) {
        manager.fail();
        return;
      }
      const touch = event.changedTouches[0];

      const canvasX =
        (touch.x - SIDEBAR_WIDTH + scrollX.value) / scale.value + SIDEBAR_WIDTH;
      const canvasY =
        (touch.y - topInset - HEADER_HEIGHT + scrollY.value) / scale.value +
        HEADER_HEIGHT;

      const segments = segmentsSV.value;

      let foundSeg = null;
      let segWidth = 0;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const x = getXFromTime(seg.startTime, baseDayStartMs);
        const y = getYFromRowIndex(seg.resourceIndex) + 6;
        const w = getWidthByDuration(seg.endTime - seg.startTime) - 4;
        const h = ROW_HEIGHT - 12;

        const handleSize = Math.min(25, w / 2);

        if (
          canvasX >= x + w - handleSize &&
          canvasX <= x + w + 15 &&
          canvasY >= y &&
          canvasY <= y + h
        ) {
          foundSeg = seg;
          segWidth = w + 4;
          break;
        }
      }

      if (foundSeg) {
        resizingSegmentId.value = foundSeg.id;
        resizingStartWidth.value = segWidth;
        resizingWidth.value = segWidth;
        manager.activate();
        scheduleOnRN(onResizeStart, foundSeg.id, segWidth);
      } else {
        manager.fail();
      }
    })
    .onUpdate((event) => {
      if (!resizingSegmentId.value) return;

      const segments = segmentsSV.value;
      const currentSeg = segments.find((s) => s.id === resizingSegmentId.value);
      if (!currentSeg) return;

      const deltaX = event.translationX / scale.value;
      let newWidth = resizingStartWidth.value + deltaX;

      const minW = getWidthByDuration(MIN_DURATION);
      if (newWidth < minW) {
        newWidth = minW;
      }

      const startDay = new Date(currentSeg.startTime);
      const workEndTime = startDay.setHours(END_HOUR, 0, 0, 0);

      let maxEndTime = workEndTime;
      const MIN_GAP_MS = 15 * ONE_MINUTE_MS;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (
          seg.id !== currentSeg.id &&
          seg.resourceId === currentSeg.resourceId &&
          seg.startTime > currentSeg.startTime
        ) {
          const allowedLimitBeforeSeg = seg.startTime - MIN_GAP_MS;
          if (allowedLimitBeforeSeg < maxEndTime) {
            maxEndTime = allowedLimitBeforeSeg;
          }
        }
      }

      const maxW = getWidthByDuration(maxEndTime - currentSeg.startTime);
      if (newWidth > maxW) {
        newWidth = maxW;
      }

      resizingWidth.value = newWidth;
    })
    .onEnd(() => {
      if (!resizingSegmentId.value) return;

      const segments = segmentsSV.value;
      const currentSeg = segments.find((s) => s.id === resizingSegmentId.value);

      if (currentSeg) {
        const startX = getXFromTime(currentSeg.startTime, baseDayStartMs);
        const finalRightX = startX + resizingWidth.value;
        const calculatedNewEndTime = getTimeFromX(finalRightX, baseDayStartMs);

        scheduleOnRN(onResizeEnd, resizingSegmentId.value, {
          finalWidth: resizingWidth.value,
          calculatedNewEndTime: calculatedNewEndTime,
        });
      } else {
        scheduleOnRN(onResizeEnd, resizingSegmentId.value, {
          finalWidth: resizingWidth.value,
          calculatedNewEndTime: undefined,
        });
      }

      resizingSegmentId.value = null;
    });

  return { resizingWidth, resizeGesture };
}
