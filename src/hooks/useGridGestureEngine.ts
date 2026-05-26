import { Gesture } from "react-native-gesture-handler";
import { SharedValue } from "react-native-reanimated";
import { BookingSegment } from "../store/useBookingStore";
import { useGridDragGesture } from "./useGridDragGesture";
import { useGridResizeGesture } from "./useGridResizeGesture";
import { useGridTapGesture } from "./useGridTapGesture";
import { useGridViewport } from "./useGridViewport";

interface EngineProps {
  topInset: number;
  bottomInset: number;
  screenWidth: number;
  screenHeight: number;
  baseDayStartMs: number;
  segmentsSV: SharedValue<BookingSegment[]>;
  onCellTap: (tableId: string, startTime: number) => void;
  onDragStart: (id: string, width: number) => void;
  onDragEnd: (id: string, finalX: number, finalY: number) => void;
  onResizeStart: (id: string, initialWidth: number) => void;
  onResizeEnd: (
    id: string,
    payload: { finalWidth: number; calculatedNewEndTime?: number },
  ) => void;
}

export function useGridGestureEngine({
  topInset,
  bottomInset,
  screenWidth,
  screenHeight,
  segmentsSV,
  baseDayStartMs,
  onCellTap,
  onDragStart,
  onDragEnd,
  onResizeStart,
  onResizeEnd,
}: EngineProps) {
  const { scrollX, scrollY, scale, scrollGesture, pinchGesture } =
    useGridViewport({
      screenWidth,
      screenHeight,
      topInset,
      bottomInset,
      baseDayStartMs,
    });

  const { resizingWidth, resizeGesture } = useGridResizeGesture({
    scrollX,
    scrollY,
    scale,
    topInset,
    baseDayStartMs,
    segmentsSV,
    onResizeStart,
    onResizeEnd,
  });

  const { draggedX, draggedY, draggedSegmentId, dragGesture } =
    useGridDragGesture({
      scrollX,
      scrollY,
      scale,
      topInset,
      baseDayStartMs,
      segmentsSV,
      onDragStart,
      onDragEnd,
    });

  const { tapGesture } = useGridTapGesture({
    scrollX,
    scrollY,
    scale,
    topInset,
    baseDayStartMs,
    onCellTap,
  });

  const composedGesture = Gesture.Simultaneous(
    Gesture.Exclusive(resizeGesture, dragGesture, scrollGesture, tapGesture),
    pinchGesture,
  );

  return {
    scrollX,
    scrollY,
    scale,
    draggedX,
    draggedY,
    draggedSegmentId,
    resizingWidth,
    composedGesture,
  };
}
