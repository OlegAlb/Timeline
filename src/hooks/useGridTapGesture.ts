import { Gesture } from "react-native-gesture-handler";
import { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { HEADER_HEIGHT, SIDEBAR_WIDTH } from "../constants/grid";
import {
  getCanvasCoords,
  getRowIndexFromY,
  getTimeFromX,
} from "../utils/gridMath";

interface TapProps {
  scrollX: SharedValue<number>;
  scrollY: SharedValue<number>;
  scale: SharedValue<number>;
  topInset: number;
  baseDayStartMs: number;
  onCellTap: (tableId: string, startTime: number) => void;
}

export function useGridTapGesture({
  scrollX,
  scrollY,
  scale,
  topInset,
  baseDayStartMs,
  onCellTap,
}: TapProps) {
  const tapGesture = Gesture.Tap().onEnd((event) => {
    if (event.x < SIDEBAR_WIDTH || event.y < HEADER_HEIGHT + topInset) {
      return;
    }

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

    const clickedTime = getTimeFromX(canvasX, baseDayStartMs);
    const rowIndex = getRowIndexFromY(canvasY);

    if (rowIndex === null || !clickedTime) return;

    const clickedTableId = `table_${rowIndex + 1}`;
    scheduleOnRN(onCellTap, clickedTableId, clickedTime);
  });

  return { tapGesture };
}
