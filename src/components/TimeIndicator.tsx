import { Rect } from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import { useSharedValue } from "react-native-reanimated";
import {
  HEADER_HEIGHT,
  HOUR_WIDTH,
  SIDEBAR_WIDTH,
  START_HOUR,
  TOTAL_HOURS,
  VIRTUAL_GRID_HEIGHT,
} from "../constants/grid";

const calculateLineX = (): number => {
  const now = new Date();
  const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
  const hoursPassed = currentDecimalHour - START_HOUR;

  if (hoursPassed < 0 || hoursPassed > TOTAL_HOURS) return -1000;
  return SIDEBAR_WIDTH + hoursPassed * HOUR_WIDTH;
};

export const TimeIndicator = () => {
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

  return (
    <Rect
      x={timeLineX}
      y={HEADER_HEIGHT}
      width={2}
      height={VIRTUAL_GRID_HEIGHT}
      color="red"
    />
  );
};
