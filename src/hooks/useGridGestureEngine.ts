import { Gesture } from "react-native-gesture-handler";
import {
  SharedValue,
  useSharedValue,
  withDecay,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  HEADER_HEIGHT,
  ROW_HEIGHT,
  SIDEBAR_WIDTH,
  VIRTUAL_GRID_HEIGHT,
  VIRTUAL_GRID_WIDTH,
} from "../constants/grid";
import {
  getInitialScrollX,
  getResourceIdFromY,
  getTimeFromX,
  getWidthByDuration,
  getXFromTime,
  getYFromResourceId,
} from "../utils/gridMath";

interface EngineProps {
  topInset: number;
  bottomInset: number;
  screenWidth: number;
  screenHeight: number;
  segmentsSV: SharedValue<any[]>; // Передаем SharedValue сегментов для UI-потока
  onCellTap: (
    tableId: string,
    startTime: number,
    canvasX: number,
    canvasY: number,
  ) => void;
  // Новые коллбэки для перетаскивания:
  onDragStart: (id: string, width: number) => void;
  onDragEnd: (id: string, finalX: number, finalY: number) => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

export function useGridGestureEngine({
  topInset,
  bottomInset,
  screenWidth,
  screenHeight,
  segmentsSV,
  onCellTap,
  onDragStart,
  onDragEnd,
}: EngineProps) {
  const scrollX = useSharedValue(getInitialScrollX());
  const scrollY = useSharedValue(0);

  // Добавляем стейт для зума
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const draggedSegmentId = useSharedValue<string | null>(null);
  const draggedX = useSharedValue(0);
  const draggedY = useSharedValue(0);
  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);

  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(400) // 400мс удержания активируют режим drag-and-drop
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
        const x = getXFromTime(seg.startTime);
        const y = getYFromResourceId(seg.resourceId) + 6;
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

        // Сообщаем JS-потоку скрыть этот блок из основного useMemo снимка
        scheduleOnRN(onDragStart, foundSeg.id, width);

        // Запоминаем дельту (где именно внутри блока палец коснулся)
        dragOffsetX.value = canvasX - getXFromTime(foundSeg.startTime);
        dragOffsetY.value =
          canvasY - (getYFromResourceId(foundSeg.resourceId) + 6);

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

  // 1. ЖЕСТ СКРОЛЛА (PAN)
  const scrollGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = scrollX.value;
      contextY.value = scrollY.value;
    })
    .onUpdate((event) => {
      let newX = contextX.value - event.translationX;
      let newY = contextY.value - event.translationY;

      // Динамические границы скролла в зависимости от текущего масштаба
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

  // 2. ЖЕСТ ЗУМА (PINCH)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = Math.min(
        Math.max(MIN_SCALE, savedScale.value * event.scale),
        MAX_SCALE,
      );

      // Фокальная точка пальцев относительно рабочей области сетки
      const fx = event.focalX - SIDEBAR_WIDTH;
      const fy = event.focalY - (HEADER_HEIGHT + topInset);

      // Корректируем скролл, чтобы точка между пальцами оставалась неподвижной при зуме
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

      // ИСПРАВЛЕНО: Теперь проверяется правильная переменная newScrollY
      if (newScrollX < 0) newScrollX = 0;
      if (newScrollX > maxScrollX) newScrollX = maxScrollX;
      if (newScrollY < 0) newScrollY = 0;
      if (newScrollY > maxScrollY) newScrollY = maxScrollY;

      scrollX.value = newScrollX;
      scrollY.value = newScrollY;
      scale.value = nextScale;
    });

  // 3. ЖЕСТ ТАПА (с учетом зума)
  const tapGesture = Gesture.Tap().onEnd((event) => {
    if (event.x < SIDEBAR_WIDTH || event.y < HEADER_HEIGHT + topInset) {
      return;
    }

    // Обратный пересчет экранных координат клика в координаты чистого холста (canvas)
    const canvasX =
      (event.x - SIDEBAR_WIDTH + scrollX.value) / scale.value + SIDEBAR_WIDTH;
    const canvasY =
      (event.y - topInset - HEADER_HEIGHT + scrollY.value) / scale.value +
      HEADER_HEIGHT;

    const clickedTime = getTimeFromX(canvasX);
    const clickedTableId = getResourceIdFromY(canvasY);

    if (!clickedTableId || !clickedTime) return;

    scheduleOnRN(onCellTap, clickedTableId, clickedTime, canvasX, canvasY);
  });

  // Объединяем жесты через Simultaneous, чтобы можно было одновременно скроллить и зумить
  const composedGesture = Gesture.Simultaneous(
    Gesture.Exclusive(dragGesture, scrollGesture, tapGesture),
    pinchGesture,
  );

  return {
    scrollX,
    scrollY,
    scale,
    draggedX,
    draggedY,
    draggedSegmentId,
    composedGesture,
  };
}
