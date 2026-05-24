import { Gesture } from "react-native-gesture-handler";
import { useSharedValue, withDecay } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  HEADER_HEIGHT,
  HOUR_WIDTH,
  MAX_SCROLL_X,
  MAX_SCROLL_Y,
  SIDEBAR_WIDTH,
  START_HOUR,
} from "../constants/grid";
import { getResourceIdFromY, getTimeFromX } from "../utils/gridMath";

interface EngineProps {
  topInset: number;
  onCellTap: (
    tableId: string,
    startTime: number,
    canvasX: number,
    canvasY: number,
  ) => void;
}

export function useGridGestureEngine({ topInset, onCellTap }: EngineProps) {
  // Функция расчета начального скролла (срабатывает один раз при инициализации хука)
  const getInitialScrollX = (): number => {
    const now = new Date();
    // Переводим текущее время в десятичный формат (например, 14:30 -> 14.5)
    const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
    const hoursPassed = currentDecimalHour - START_HOUR;

    if (hoursPassed <= 0) return 0;

    // ВАРИАНТ А: Текущее время выравнивается по левому краю (сразу за сайдбаром)
    const targetX = hoursPassed * HOUR_WIDTH;

    // ВАРИАНТ Б: Текущее время центрируется на экране (раскомментируйте, если так лучше)
    // const visibleWidth = screenWidth - SIDEBAR_WIDTH;
    // const targetX = (hoursPassed * HOUR_WIDTH) - (visibleWidth / 2);

    // Зажимаем значение в валидных пределах сетки
    return Math.min(Math.max(0, targetX), MAX_SCROLL_X);
  };

  // Инициализируем scrollX вычисленным значением вместо 0
  const scrollX = useSharedValue(getInitialScrollX());
  const scrollY = useSharedValue(0);

  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  // 1. ЖЕСТ СКРОЛЛА
  const scrollGesture = Gesture.Pan()
    .onStart(() => {
      // Благодаря этому жесты будут плавно продолжаться с текущей временной точки
      contextX.value = scrollX.value;
      contextY.value = scrollY.value;
    })
    .onUpdate((event) => {
      let newX = contextX.value - event.translationX;
      let newY = contextY.value - event.translationY;

      if (newX < 0) newX = 0;
      if (newX > MAX_SCROLL_X) newX = MAX_SCROLL_X;
      if (newY < 0) newY = 0;
      if (newY > MAX_SCROLL_Y) newY = MAX_SCROLL_Y;

      scrollX.value = newX;
      scrollY.value = newY;
    })
    .onEnd((event) => {
      scrollX.value = withDecay({
        velocity: -event.velocityX,
        clamp: [0, MAX_SCROLL_X],
      });
      scrollY.value = withDecay({
        velocity: -event.velocityY,
        clamp: [0, MAX_SCROLL_Y],
      });
    });

  // 2. ЖЕСТ ТАПА
  const tapGesture = Gesture.Tap().onEnd((event) => {
    // Исключаем клики по шапкам
    if (event.x < SIDEBAR_WIDTH || event.y < HEADER_HEIGHT + topInset) {
      return;
    }

    // Вычисляем виртуальные координаты (теперь они корректно учитывают начальное смещение времени)
    const canvasX = event.x + scrollX.value;
    const canvasY = event.y - topInset + scrollY.value;
    const clickedTime = getTimeFromX(canvasX);
    const clickedTableId = getResourceIdFromY(canvasY);

    if (!clickedTableId || !clickedTime) return;

    scheduleOnRN(onCellTap, clickedTableId, clickedTime, canvasX, canvasY);
  });

  const composedGesture = Gesture.Exclusive(scrollGesture, tapGesture);

  return {
    scrollX,
    scrollY,
    composedGesture,
  };
}
