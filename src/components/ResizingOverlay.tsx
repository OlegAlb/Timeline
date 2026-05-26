import { RoundedRect, SkFont, Text } from "@shopify/react-native-skia";
import React from "react";
import { SharedValue } from "react-native-reanimated";
import { COLORS } from "../constants/colors";
import { ROW_HEIGHT } from "../constants/grid";
import { UI } from "../constants/ui";

interface ResizingOverlayProps {
  layoutData: {
    x: number;
    y: number;
    customerName: string;
  } | null;
  resizingWidth: SharedValue<number>;
  font: SkFont | null;
}

export const ResizingOverlay: React.FC<ResizingOverlayProps> = ({
  layoutData,
  resizingWidth,
  font,
}) => {
  if (!layoutData) return null;

  return (
    <>
      <RoundedRect
        x={layoutData.x}
        y={layoutData.y}
        r={UI.borderRadius}
        width={resizingWidth}
        height={ROW_HEIGHT - 12}
        color={COLORS.booking}
        opacity={0.9}
      />
      <Text
        x={layoutData.x + 10}
        y={layoutData.y + (ROW_HEIGHT - 12) / 2 + UI.horizontalPadding}
        text={layoutData.customerName}
        font={font}
        color={COLORS.textMain}
      />
    </>
  );
};
