import { RoundedRect, SkFont, Text } from "@shopify/react-native-skia";
import React from "react";
import { SharedValue } from "react-native-reanimated";
import { COLORS } from "../constants/colors";
import { ROW_HEIGHT } from "../constants/grid";

interface ResizingOverlayProps {
  // Принимаем данные макета (координаты и имя), если ресайз активен
  layoutData: {
    x: number;
    y: number;
    customerName: string;
  } | null;
  // SharedValue для плавной реактивной ширины на UI-потоке
  resizingWidth: SharedValue<number>;
  font: SkFont | null;
}

export const ResizingOverlay: React.FC<ResizingOverlayProps> = ({
  layoutData,
  resizingWidth,
  font,
}) => {
  // Инкапсулируем условие отрисовки внутри компонента
  if (!layoutData) return null;

  return (
    <>
      <RoundedRect
        x={layoutData.x}
        y={layoutData.y}
        r={8}
        width={resizingWidth}
        height={ROW_HEIGHT - 12}
        color={COLORS.booking}
        opacity={0.9}
      />
      <Text
        x={layoutData.x + 10}
        y={layoutData.y + (ROW_HEIGHT - 12) / 2 + 4}
        text={layoutData.customerName}
        font={font}
        color={COLORS.textMain}
      />
    </>
  );
};
