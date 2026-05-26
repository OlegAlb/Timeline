import {
  Group,
  RoundedRect,
  SkFont,
  Text,
  Transforms3d,
} from "@shopify/react-native-skia";
import React from "react";
import { SharedValue } from "react-native-reanimated";
import { COLORS } from "../constants/colors";
import { ROW_HEIGHT } from "../constants/grid";
import { UI } from "../constants/ui";

interface DraggingOverlayProps {
  draggedId: string | null;
  dragBlockTransform: SharedValue<Transforms3d> | any;
  draggedWidthState: SharedValue<number> | number;
  draggedBookingName: string;
  font: SkFont | null;
}

export const DraggingOverlay: React.FC<DraggingOverlayProps> = ({
  draggedId,
  dragBlockTransform,
  draggedWidthState,
  draggedBookingName,
  font,
}) => {
  if (draggedId === null) return null;

  return (
    <Group transform={dragBlockTransform}>
      <RoundedRect
        x={0}
        y={0}
        r={UI.borderRadius}
        width={draggedWidthState}
        height={ROW_HEIGHT - 12}
        color={COLORS.bookingDrag}
        opacity={0.8}
      />
      <Text
        x={10}
        y={(ROW_HEIGHT - 12) / 2 + UI.horizontalPadding}
        text={draggedBookingName}
        font={font}
        color={COLORS.textMain}
      />
    </Group>
  );
};
