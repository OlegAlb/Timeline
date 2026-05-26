import { Gesture } from "react-native-gesture-handler";
import { useSharedValue, withDecay } from "react-native-reanimated";
import {
  HEADER_HEIGHT,
  SIDEBAR_WIDTH,
  VIRTUAL_GRID_HEIGHT,
  VIRTUAL_GRID_WIDTH,
} from "../constants/grid";
import { getInitialScrollX } from "../utils/gridMath";

interface ViewportProps {
  screenWidth: number;
  screenHeight: number;
  topInset: number;
  bottomInset: number;
  baseDayStartMs: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

export function useGridViewport({
  screenWidth,
  screenHeight,
  topInset,
  bottomInset,
  baseDayStartMs,
}: ViewportProps) {
  const scrollX = useSharedValue(
    getInitialScrollX(Date.now(), baseDayStartMs, screenWidth),
  );
  const scrollY = useSharedValue(0);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const scrollGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = scrollX.value;
      contextY.value = scrollY.value;
    })
    .onUpdate((event) => {
      let newX = contextX.value - event.translationX;
      let newY = contextY.value - event.translationY;

      const maxScrollX = Math.max(
        0,
        VIRTUAL_GRID_WIDTH * scale.value - (screenWidth - SIDEBAR_WIDTH),
      );
      const maxScrollY = Math.max(
        0,
        VIRTUAL_GRID_HEIGHT * scale.value -
          (screenHeight - HEADER_HEIGHT - topInset - bottomInset),
      );

      if (newX < 0) newX = 0;
      if (newX > maxScrollX) newX = maxScrollX;
      if (newY < 0) newY = 0;
      if (newY > maxScrollY) newY = maxScrollY;

      scrollX.value = newX;
      scrollY.value = newY;
    })
    .onEnd((event) => {
      const maxScrollX = Math.max(
        0,
        VIRTUAL_GRID_WIDTH * scale.value - (screenWidth - SIDEBAR_WIDTH),
      );
      const maxScrollY = Math.max(
        0,
        VIRTUAL_GRID_HEIGHT * scale.value -
          (screenHeight - HEADER_HEIGHT - topInset - bottomInset),
      );

      scrollX.value = withDecay({
        velocity: -event.velocityX,
        clamp: [0, maxScrollX],
      });
      scrollY.value = withDecay({
        velocity: -event.velocityY,
        clamp: [0, maxScrollY],
      });
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = Math.min(
        Math.max(MIN_SCALE, savedScale.value * event.scale),
        MAX_SCALE,
      );

      const fx = event.focalX - SIDEBAR_WIDTH;
      const fy = event.focalY - (HEADER_HEIGHT + topInset);

      let newScrollX = ((fx + scrollX.value) / scale.value) * nextScale - fx;
      let newScrollY = ((fy + scrollY.value) / scale.value) * nextScale - fy;

      const maxScrollX = Math.max(
        0,
        VIRTUAL_GRID_WIDTH * nextScale - (screenWidth - SIDEBAR_WIDTH),
      );
      const maxScrollY = Math.max(
        0,
        VIRTUAL_GRID_HEIGHT * nextScale -
          (screenHeight - HEADER_HEIGHT - topInset - bottomInset),
      );

      if (newScrollX < 0) newScrollX = 0;
      if (newScrollX > maxScrollX) newScrollX = maxScrollX;
      if (newScrollY < 0) newScrollY = 0;
      if (newScrollY > maxScrollY) newScrollY = maxScrollY;

      scrollX.value = newScrollX;
      scrollY.value = newScrollY;
      scale.value = nextScale;
    });

  return { scrollX, scrollY, scale, scrollGesture, pinchGesture };
}
