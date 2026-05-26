import { Group, Line, Rect, Text, matchFont } from "@shopify/react-native-skia";
import React from "react";
import { useWindowDimensions } from "react-native";
import { SharedValue, useDerivedValue } from "react-native-reanimated";

import { COLORS } from "../constants/colors";
import {
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
import { UI } from "../constants/ui";
import { GridHeader } from "./GridHeader";
import { GridSidebar } from "./GridSidebar";
import { TimeIndicator } from "./TimeIndicator";

const HOURS_ARRAY = Array.from(
  { length: TOTAL_HOURS + 1 },
  (_, i) => START_HOUR + i,
);
const TABLES_ARRAY = Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1);
const cornerHeaderFont = matchFont({
  fontFamily: "sans-serif",
  fontSize: 14,
  fontWeight: "bold",
});

interface GridProps {
  scrollX: SharedValue<number>;
  scrollY: SharedValue<number>;
  scale: SharedValue<number>;
  topInset: number;
}

export const Grid = ({ scrollX, scrollY, scale, topInset }: GridProps) => {
  const { width: screenWidth } = useWindowDimensions();

  // Все трансформации остаются здесь, так как они координируют общие SharedValues
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
      <Group transform={gridTransform}>
        {TABLES_ARRAY.map((_, index) => {
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
        {HOURS_ARRAY.map((_, index) => {
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
        <TimeIndicator />
      </Group>

      <GridSidebar
        tablesArray={TABLES_ARRAY}
        scale={scale}
        sidebarTransform={sidebarTransform}
      />
      <GridHeader
        hoursArray={HOURS_ARRAY}
        scale={scale}
        headerTransform={headerTransform}
      />

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
          y={HEADER_HEIGHT / 2 + UI.verticalPadding}
          text="Залы"
          font={cornerHeaderFont}
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
