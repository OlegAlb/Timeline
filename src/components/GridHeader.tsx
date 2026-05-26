import { Group, Rect, Text, matchFont } from "@shopify/react-native-skia";
import React from "react";
import { SharedValue, useDerivedValue } from "react-native-reanimated";
import { COLORS } from "../constants/colors";
import {
  HEADER_HEIGHT,
  HOUR_WIDTH,
  SIDEBAR_WIDTH,
  VIRTUAL_GRID_WIDTH,
} from "../constants/grid";

const headerFont = matchFont({
  fontFamily: "sans-serif",
  fontSize: 14,
  fontWeight: "bold",
});

interface GridHeaderProps {
  hoursArray: number[];
  scale: SharedValue<number>;
  headerTransform: SharedValue<any>;
}

const HourText = ({
  hour,
  index,
  scale,
}: {
  hour: number;
  index: number;
  scale: SharedValue<number>;
}) => {
  const xPosition = SIDEBAR_WIDTH + index * HOUR_WIDTH + 15;
  const transform = useDerivedValue(() => [
    { translateX: xPosition },
    { scaleX: 1 / scale.value },
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

export const GridHeader = ({
  hoursArray,
  scale,
  headerTransform,
}: GridHeaderProps) => (
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
);
