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
  scale: SharedValue<number>;
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

// --- ВЫДЕЛЕННЫЙ КОМПОНЕНТ ДЛЯ ТЕКСТА В САЙДБАРЕ ---
interface TableTextProps {
  tableNum: number;
  index: number;
  scale: SharedValue<number>;
}

const TableText: React.FC<TableTextProps> = ({ tableNum, index, scale }) => {
  const yPosition = HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2 + 4;

  // Теперь мы легально создаем DerivedValue для ВСЕГО массива трансформаций целиком
  const transform = useDerivedValue(() => [
    { translateY: yPosition },
    { scaleY: 1 / scale.value }, // Внутри ворклета scale.value возвращает чистый number
    { translateY: -yPosition },
  ]);

  return (
    <Group transform={transform}>
      <Text
        x={15}
        y={yPosition}
        text={`Стол №${tableNum}`}
        font={font}
        color={COLORS.textMain}
      />
    </Group>
  );
};

// --- ВЫДЕЛЕННЫЙ КОМПОНЕНТ ДЛЯ ТЕКСТА В ХЕДЕРЕ ---
interface HourTextProps {
  hour: number;
  index: number;
  scale: SharedValue<number>;
}

const HourText: React.FC<HourTextProps> = ({ hour, index, scale }) => {
  const xPosition = SIDEBAR_WIDTH + index * HOUR_WIDTH + 15;

  // Создаем DerivedValue для ВСЕГО массива трансформаций хедера
  const transform = useDerivedValue(() => [
    { translateX: xPosition },
    { scaleX: 1 / scale.value }, // Внутри ворклета scale.value возвращает чистый number
    { translateX: -xPosition },
  ]);

  return (
    <Group transform={transform}>
      <Text
        x={xPosition}
        y={HEADER_HEIGHT / 2 + 6}
        text={`${hour}:00`}
        font={headerFont}
        color={COLORS.textMuted}
      />
    </Group>
  );
};

// --- ОСНОВНОЙ КОМПОНЕНТ ГРИДА ---
export const Grid: React.FC<GridProps> = ({
  scrollX,
  scrollY,
  scale,
  topInset,
}) => {
  const { width: screenWidth } = useWindowDimensions();

  const hoursArray = Array.from(
    { length: TOTAL_HOURS + 1 },
    (_, i) => START_HOUR + i,
  );
  const tablesArray = Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1);

  const calculateLineX = (): number => {
    const now = new Date();
    const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
    const hoursPassed = currentDecimalHour - START_HOUR;

    if (hoursPassed < 0 || hoursPassed > TOTAL_HOURS) {
      return -1000;
    }

    return SIDEBAR_WIDTH + hoursPassed * HOUR_WIDTH;
  };

  const timeLineX = useSharedValue(calculateLineX());

  useEffect(() => {
    const updatePosition = () => {
      timeLineX.value = calculateLineX();
    };

    const now = new Date();
    const msToNextMinute =
      60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

    let intervalId: number;

    const timeoutId = setTimeout(() => {
      updatePosition();
      intervalId = setInterval(updatePosition, 60000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const gridTransform = useDerivedValue(() => [
    { translateY: topInset },
    { translateX: SIDEBAR_WIDTH },
    { translateY: HEADER_HEIGHT },
    { translateX: -scrollX.value },
    { translateY: -scrollY.value },
    { scale: scale.value },
    { translateX: -SIDEBAR_WIDTH },
    { translateY: -HEADER_HEIGHT },
  ]);

  const sidebarTransform = useDerivedValue(() => [
    { translateY: topInset },
    { translateY: HEADER_HEIGHT },
    { translateY: -scrollY.value },
    { scaleY: scale.value },
    { translateY: -HEADER_HEIGHT },
  ]);

  const headerTransform = useDerivedValue(() => [
    { translateY: topInset },
    { translateX: SIDEBAR_WIDTH },
    { translateX: -scrollX.value },
    { scaleX: scale.value },
    { translateX: -SIDEBAR_WIDTH },
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
        <Rect
          x={timeLineX}
          y={HEADER_HEIGHT}
          width={2}
          height={VIRTUAL_GRID_HEIGHT}
          color="red"
        />
      </Group>

      {/* 2. СТАТИЧНЫЙ САЙДБАР */}
      <Group transform={sidebarTransform}>
        <Rect
          x={0}
          y={HEADER_HEIGHT}
          width={SIDEBAR_WIDTH}
          height={VIRTUAL_GRID_HEIGHT}
          color={COLORS.bgSurface}
        />
        {tablesArray.map((tableNum, index) => (
          <TableText
            key={`table-text-${index}`}
            tableNum={tableNum}
            index={index}
            scale={scale}
          />
        ))}
      </Group>

      {/* 3. СТАТИЧНЫЙ ХЕДЕР */}
      <Group transform={headerTransform}>
        <Rect
          x={SIDEBAR_WIDTH}
          y={0}
          width={VIRTUAL_GRID_WIDTH}
          height={HEADER_HEIGHT}
          color={COLORS.bgSurface}
        />
        {hoursArray.map((hour, index) => (
          <HourText
            key={`hour-text-${index}`}
            hour={hour}
            index={index}
            scale={scale}
          />
        ))}
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
