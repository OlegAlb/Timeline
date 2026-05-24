import { Group, Line, Rect, Text, matchFont } from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import {
  SharedValue,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import {
  COLORS,
  HEADER_HEIGHT,
  HOUR_WIDTH,
  ROW_HEIGHT,
  SIDEBAR_WIDTH,
  START_HOUR,
  TOTAL_HOURS,
  TOTAL_TABLES,
  VIRTUAL_GRID_HEIGHT,
  VIRTUAL_GRID_WIDTH,
} from "../constants/grid";

interface GridProps {
  scrollX: SharedValue<number>;
  scrollY: SharedValue<number>;
  topInset: number;
}

const font = matchFont({
  fontFamily: "sans-serif",
  fontSize: 12,
  fontWeight: "bold",
});
const headerFont = matchFont({
  fontFamily: "sans-serif",
  fontSize: 14,
  fontWeight: "bold",
});

export const Grid: React.FC<GridProps> = ({ scrollX, scrollY, topInset }) => {
  const { width: screenWidth } = useWindowDimensions();

  const hoursArray = Array.from(
    { length: TOTAL_HOURS + 1 },
    (_, i) => START_HOUR + i,
  );
  const tablesArray = Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1);

  // Функция для расчета точной координаты X на основе текущего времени
  const calculateLineX = (): number => {
    const now = new Date();
    const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
    const hoursPassed = currentDecimalHour - START_HOUR;

    // Если текущее время вне рабочего диапазона сетки, уводим линию за экран
    if (hoursPassed < 0 || hoursPassed > TOTAL_HOURS) {
      return -1000;
    }

    return SIDEBAR_WIDTH + hoursPassed * HOUR_WIDTH;
  };

  // Создаем reanimated-переменную со стартовой позицией линии
  const timeLineX = useSharedValue(calculateLineX());

  useEffect(() => {
    const updatePosition = () => {
      timeLineX.value = calculateLineX(); // Обновление значения напрямую в UI-потоке
    };

    // 1. Вычисляем, сколько миллисекунд осталось до начала СЛЕДУЮЩЕЙ минуты
    const now = new Date();
    const msToNextMinute =
      60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

    let intervalId: number;

    // 2. Ждем наступления ровной минуты
    const timeoutId = setTimeout(() => {
      updatePosition(); // Смещаем линию ровно на переломе минуты

      // 3. Запускаем интервал строго раз в 60 секунд
      intervalId = setInterval(updatePosition, 60000);
    }, msToNextMinute);

    // Очищаем таймеры при размонтировании компонента, чтобы избежать утечек памяти
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const gridTransform = useDerivedValue(() => [
    { translateY: topInset },
    { translateX: -scrollX.value },
    { translateY: -scrollY.value },
  ]);

  const sidebarTransform = useDerivedValue(() => [
    { translateY: topInset },
    { translateY: -scrollY.value },
  ]);

  const headerTransform = useDerivedValue(() => [
    { translateY: topInset },
    { translateX: -scrollX.value },
  ]);

  return (
    <Group>
      {/* 1. ОСНОВНАЯ СЕТКА */}
      <Group transform={gridTransform}>
        {tablesArray.map((_, index) => {
          const y = HEADER_HEIGHT + index * ROW_HEIGHT;
          return (
            <Line
              key={`h-line-${index}`}
              p1={{ x: SIDEBAR_WIDTH, y }}
              p2={{ x: SIDEBAR_WIDTH + VIRTUAL_GRID_WIDTH, y }}
              color={COLORS.gridLines}
              strokeWidth={1}
            />
          );
        })}
        {hoursArray.map((_, index) => {
          const x = SIDEBAR_WIDTH + index * HOUR_WIDTH;
          return (
            <Line
              key={`v-line-${index}`}
              p1={{ x, y: HEADER_HEIGHT }}
              p2={{ x, y: HEADER_HEIGHT + VIRTUAL_GRID_HEIGHT }}
              color={COLORS.gridLines}
              strokeWidth={1}
            />
          );
        })}
        {/* КРАСНАЯ ЛИНИЯ ТЕКУЩЕГО ВРЕМЕНИ */}
        {/* Она находится внутри трансформируемой группы, поэтому автоматически скроллится */}
        <Rect
          x={timeLineX} // Передаем SharedValue напрямую в Skia
          y={HEADER_HEIGHT}
          width={2}
          height={VIRTUAL_GRID_HEIGHT}
          color="red"
        />
      </Group>
      {/* 2. СТАТИЧНЫЙ САЙДБАР (Столы) */}
      <Group transform={sidebarTransform}>
        <Rect
          x={0}
          y={HEADER_HEIGHT}
          width={SIDEBAR_WIDTH}
          height={VIRTUAL_GRID_HEIGHT}
          color={COLORS.bgSurface}
        />
        {tablesArray.map((tableNum, index) => {
          const yPosition =
            HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2 + 4;
          return (
            <Text
              key={`table-text-${index}`}
              x={15}
              y={yPosition}
              text={`Стол №${tableNum}`}
              font={font}
              color={COLORS.textMain}
            />
          );
        })}
      </Group>
      {/* 3. СТАТИЧНЫЙ ХЕДЕР (Часы) */}
      <Group transform={headerTransform}>
        <Rect
          x={SIDEBAR_WIDTH}
          y={0}
          width={VIRTUAL_GRID_WIDTH}
          height={HEADER_HEIGHT}
          color={COLORS.bgSurface}
        />
        {hoursArray.map((hour, index) => {
          const xPosition = SIDEBAR_WIDTH + index * HOUR_WIDTH + 15;
          return (
            <Text
              key={`hour-text-${index}`}
              x={xPosition}
              y={HEADER_HEIGHT / 2 + 6}
              text={`${hour}:00`}
              font={headerFont}
              color={COLORS.textMuted}
            />
          );
        })}
      </Group>
      {/* Левый верхний угол (Залы) */}
      <Group transform={[{ translateY: topInset }]}>
        <Rect
          x={0}
          y={0}
          width={SIDEBAR_WIDTH}
          height={HEADER_HEIGHT}
          color={COLORS.bgSurface}
        />
        <Text
          x={20}
          y={HEADER_HEIGHT / 2 + 6}
          text="Залы"
          font={headerFont}
          color={COLORS.textMain}
        />
      </Group>
      {topInset > 0 && (
        <Rect
          x={0}
          y={0}
          width={screenWidth}
          height={topInset}
          color={COLORS.bgSurface}
        />
      )}
    </Group>
  );
};
