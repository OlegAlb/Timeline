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
  ROW_HEIGHT,
  SIDEBAR_WIDTH,
  VIRTUAL_GRID_HEIGHT,
} from "../constants/grid";
import { UI } from "../constants/ui";

const font = matchFont({
  fontFamily: "sans-serif",
  fontSize: 12,
  fontWeight: "bold",
});

interface GridSidebarProps {
  tablesArray: number[];
  scale: SharedValue<number>;
  sidebarTransform: SharedValue<Transforms3d>;
}

const TableText = ({
  tableNum,
  index,
  scale,
}: {
  tableNum: number;
  index: number;
  scale: SharedValue<number>;
}) => {
  const yPosition = HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2 + UI.horizontalPadding;
  const transform = useDerivedValue(() => [
    { translateY: yPosition },
    { scaleY: 1 / scale.value },
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

export const GridSidebar = ({
  tablesArray,
  scale,
  sidebarTransform,
}: GridSidebarProps) => (
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
);
