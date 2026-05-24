import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const TOTAL_TABLES = 30;
export const START_HOUR = 8;
export const END_HOUR = 24;
export const TOTAL_HOURS = END_HOUR - START_HOUR;

export const MIN_DURATION = 60 * 60 * 1000; // 1 час
export const MIN_GAP = 15 * 60 * 1000; // 15 минут

export const TIME_STEP_MINUTES = 15;
export const STEPS_PER_HOUR = 60 / TIME_STEP_MINUTES;
export const TOTAL_TIME_STEPS = TOTAL_HOURS * STEPS_PER_HOUR;

export const SIDEBAR_WIDTH = 100;
export const HEADER_HEIGHT = 60;

export const ROW_HEIGHT = 70;
export const HOUR_WIDTH = 160;
export const STEP_WIDTH = HOUR_WIDTH / STEPS_PER_HOUR;

export const VIRTUAL_GRID_WIDTH = TOTAL_HOURS * HOUR_WIDTH;
export const VIRTUAL_GRID_HEIGHT = TOTAL_TABLES * ROW_HEIGHT;

export const MAX_SCROLL_X = Math.max(
  0,
  VIRTUAL_GRID_WIDTH - (SCREEN_WIDTH - SIDEBAR_WIDTH),
);
export const MAX_SCROLL_Y = Math.max(
  0,
  VIRTUAL_GRID_HEIGHT - (SCREEN_HEIGHT - HEADER_HEIGHT),
);

export const COLORS = {
  bgBackground: "#13131A",
  bgSurface: "#1C1C24",
  gridLines: "#292934",
  textMain: "#FFFFFF",
  textMuted: "#7E7E8F",

  booking: {
    upcoming: "#38BDF8",
    current: "#FBBF24",
    expired: "#F87171",
    textLight: "#FFFFFF",
    textDark: "#1E1E24",
  },

  linkLine: "#6366F1",
};
