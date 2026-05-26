import { ONE_HOUR_MS, ONE_MINUTE_MS } from "./time";

export const TOTAL_TABLES = 30;
export const START_HOUR = 8;
export const END_HOUR = 24;
export const TOTAL_HOURS = END_HOUR - START_HOUR;

export const MIN_DURATION = ONE_HOUR_MS;
export const MIN_GAP = 15 * ONE_MINUTE_MS;

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
