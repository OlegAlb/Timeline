import {
  Group,
  Rect,
  Text,
  Transforms3d,
  matchFont,
} from "@shopify/react-native-skia";
import React from "react";
import { SharedValue, useDerivedValue } from "react-native-reanimated";
import { COLORS } from "../constants/colors";
import {
  HEADER_HEIGHT,
  HOUR_WIDTH,
  SIDEBAR_WIDTH,
  VIRTUAL_GRID_WIDTH,
} from "../constants/grid";
import { UI } from "../constants/ui";

const headerFont = matchFont({
  fontFamily: "sans-serif",
  fontSize: 14,
  fontWeight: "bold",
});

interface GridHeaderProps {
  hoursArray: number[];
  scale: SharedValue<number>;
  headerTransform: SharedValue<Transforms3d>;
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
  const xPosition = SIDEBAR_WIDTH + index * HOUR_WIDTH + UI.resizeHandleWidth;
  const transform = useDerivedValue(() => [
    { translateX: xPosition },
    { scaleX: 1 / scale.value },
    { translateX: -xPosition },
  ]);

  return (
    <Group transform={transform}>
      <Text
        x={xPosition}
        y={HEADER_HEIGHT / 2 + UI.verticalPadding}
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
