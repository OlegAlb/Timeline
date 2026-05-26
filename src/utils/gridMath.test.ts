import { describe, expect, it } from "vitest";

import {
  calculateMaxEndTime,
  findSegmentAtCoords,
  getCanvasCoords,
  getInitialScrollX,
  getRowIndexFromResourceId,
  getRowIndexFromY,
  getTimeFromX,
  getWidthByDuration,
  getXFromTime,
  getYFromRowIndex,
} from "./gridMath";

import {
  HEADER_HEIGHT,
  HOUR_WIDTH,
  ROW_HEIGHT,
  SIDEBAR_WIDTH,
  START_HOUR,
  TIME_STEP_MINUTES,
} from "../constants/grid";

import { ONE_HOUR_MS, ONE_MINUTE_MS } from "../constants/time";

const baseDayStartMs = new Date("2025-01-01T00:00:00.000Z").getTime();

describe("getXFromTime", () => {
  it("returns sidebar width for start hour", () => {
    const time = baseDayStartMs + START_HOUR * ONE_HOUR_MS;

    expect(getXFromTime(time, baseDayStartMs)).toBe(SIDEBAR_WIDTH);
  });

  it("returns one hour width offset after one hour", () => {
    const time = baseDayStartMs + (START_HOUR + 1) * ONE_HOUR_MS;

    expect(getXFromTime(time, baseDayStartMs)).toBe(SIDEBAR_WIDTH + HOUR_WIDTH);
  });

  it("returns half width offset after half hour", () => {
    const time = baseDayStartMs + START_HOUR * ONE_HOUR_MS + ONE_HOUR_MS / 2;

    expect(getXFromTime(time, baseDayStartMs)).toBe(
      SIDEBAR_WIDTH + HOUR_WIDTH / 2,
    );
  });
});

describe("getTimeFromX", () => {
  it("returns start hour for sidebar width", () => {
    expect(getTimeFromX(SIDEBAR_WIDTH, baseDayStartMs)).toBe(
      baseDayStartMs + START_HOUR * ONE_HOUR_MS,
    );
  });

  it("clamps values before sidebar", () => {
    expect(getTimeFromX(SIDEBAR_WIDTH - 100, baseDayStartMs)).toBe(
      baseDayStartMs + START_HOUR * ONE_HOUR_MS,
    );
  });

  it("snaps result to configured time step", () => {
    const x = SIDEBAR_WIDTH + HOUR_WIDTH * 1.17;

    const result = getTimeFromX(x, baseDayStartMs);

    const offsetFromStart =
      result - (baseDayStartMs + START_HOUR * ONE_HOUR_MS);

    expect(offsetFromStart % (TIME_STEP_MINUTES * ONE_MINUTE_MS)).toBe(0);
  });

  it("converts time to x and back", () => {
    const originalTime = baseDayStartMs + (START_HOUR + 3) * ONE_HOUR_MS;

    const x = getXFromTime(originalTime, baseDayStartMs);

    const restored = getTimeFromX(x, baseDayStartMs);

    expect(restored).toBe(originalTime);
  });
});

describe("row mapping", () => {
  it("returns correct y for row index", () => {
    expect(getYFromRowIndex(0)).toBe(HEADER_HEIGHT);

    expect(getYFromRowIndex(1)).toBe(HEADER_HEIGHT + ROW_HEIGHT);
  });

  it("returns row index from y", () => {
    const y = HEADER_HEIGHT + ROW_HEIGHT * 2 + 1;

    expect(getRowIndexFromY(y)).toBe(2);
  });

  it("returns 0 for coordinates above header", () => {
    expect(getRowIndexFromY(HEADER_HEIGHT - 1)).toBe(0);
  });

  it("converts row to y and back", () => {
    const row = 5;

    const y = getYFromRowIndex(row) + ROW_HEIGHT / 2;

    expect(getRowIndexFromY(y)).toBe(row);
  });
});

describe("getRowIndexFromResourceId", () => {
  it("extracts row index", () => {
    expect(getRowIndexFromResourceId("table_1")).toBe(0);

    expect(getRowIndexFromResourceId("table_10")).toBe(9);
  });

  it("returns 0 for invalid values", () => {
    expect(getRowIndexFromResourceId("abc")).toBe(0);

    expect(getRowIndexFromResourceId("")).toBe(0);
  });
});

describe("getWidthByDuration", () => {
  it("returns hour width for one hour duration", () => {
    expect(getWidthByDuration(ONE_HOUR_MS)).toBe(HOUR_WIDTH);
  });

  it("returns half width for half hour duration", () => {
    expect(getWidthByDuration(ONE_HOUR_MS / 2)).toBe(HOUR_WIDTH / 2);
  });

  it("returns double width for two hours duration", () => {
    expect(getWidthByDuration(ONE_HOUR_MS * 2)).toBe(HOUR_WIDTH * 2);
  });
});

describe("getCanvasCoords", () => {
  it("returns identical coordinates when scale=1 and no scroll", () => {
    const result = getCanvasCoords(
      200,
      300,
      0,
      0,
      1,
      0,
      SIDEBAR_WIDTH,
      HEADER_HEIGHT,
    );

    expect(result.canvasX).toBe(200);
    expect(result.canvasY).toBe(300);
  });

  it("applies scroll offsets", () => {
    const result = getCanvasCoords(
      SIDEBAR_WIDTH + 100,
      HEADER_HEIGHT + 100,
      50,
      25,
      1,
      0,
      SIDEBAR_WIDTH,
      HEADER_HEIGHT,
    );

    expect(result.canvasX).toBe(SIDEBAR_WIDTH + 150);

    expect(result.canvasY).toBe(HEADER_HEIGHT + 125);
  });

  it("applies zoom factor", () => {
    const result = getCanvasCoords(
      SIDEBAR_WIDTH + 200,
      HEADER_HEIGHT + 200,
      0,
      0,
      2,
      0,
      SIDEBAR_WIDTH,
      HEADER_HEIGHT,
    );

    expect(result.canvasX).toBe(SIDEBAR_WIDTH + 100);

    expect(result.canvasY).toBe(HEADER_HEIGHT + 100);
  });
});

describe("findSegmentAtCoords", () => {
  const start = baseDayStartMs + START_HOUR * ONE_HOUR_MS;

  const end = start + ONE_HOUR_MS;

  const segment = {
    id: "segment-1",
    bookingId: `booking_${Date.now()}`,
    resourceIndex: 1,
    resourceId: "table_1",
    startTime: start,
    endTime: end,
  };

  it("finds segment by coordinates", () => {
    const found = findSegmentAtCoords(
      getXFromTime(start, baseDayStartMs) + HOUR_WIDTH / 2,
      getYFromRowIndex(0) + ROW_HEIGHT / 2,
      [segment],
      baseDayStartMs,
      ROW_HEIGHT,
      getXFromTime,
      getYFromRowIndex,
      getWidthByDuration,
    );

    expect(found?.id).toBe("segment-1");
  });

  it("returns null outside segment", () => {
    const found = findSegmentAtCoords(
      99999,
      99999,
      [segment],
      baseDayStartMs,
      ROW_HEIGHT,
      getXFromTime,
      getYFromRowIndex,
      getWidthByDuration,
    );

    expect(found).toBeNull();
  });

  it("skips invalid resource ids", () => {
    const invalidSegment = {
      ...segment,
      resourceId: "invalid",
    };

    const found = findSegmentAtCoords(
      getXFromTime(start, baseDayStartMs),
      getYFromRowIndex(0),
      [invalidSegment],
      baseDayStartMs,
      ROW_HEIGHT,
      getXFromTime,
      getYFromRowIndex,
      getWidthByDuration,
    );

    expect(found).toBeNull();
  });
});

describe("calculateMaxEndTime", () => {
  const endHour = 23;
  const minGapMs = 15 * ONE_MINUTE_MS;

  it("returns end of day when no future bookings exist", () => {
    const current = {
      id: "1",
      resourceId: "table_1",
      bookingId: `booking_${Date.now()}`,
      resourceIndex: 1,
      startTime: baseDayStartMs + 10 * ONE_HOUR_MS,
      endTime: baseDayStartMs + 11 * ONE_HOUR_MS,
    };

    const result = calculateMaxEndTime(
      current,
      [current],
      endHour,
      minGapMs,
      baseDayStartMs,
    );

    expect(result).toBe(baseDayStartMs + endHour * ONE_HOUR_MS);
  });

  it("stops before next booking", () => {
    const current = {
      id: "1",
      resourceId: "table_1",
      bookingId: `booking_${Date.now()}`,
      resourceIndex: 1,
      startTime: baseDayStartMs + 10 * ONE_HOUR_MS,
      endTime: baseDayStartMs + 11 * ONE_HOUR_MS,
    };

    const next = {
      id: "2",
      resourceId: "table_1",
      bookingId: `booking_${Date.now() + 100}`,
      resourceIndex: 1,
      startTime: baseDayStartMs + 13 * ONE_HOUR_MS,
      endTime: baseDayStartMs + 14 * ONE_HOUR_MS,
    };

    const result = calculateMaxEndTime(
      current,
      [current, next],
      endHour,
      minGapMs,
      baseDayStartMs,
    );

    expect(result).toBe(next.startTime - minGapMs);
  });

  it("ignores bookings from other resources", () => {
    const current = {
      id: "1",
      resourceId: "table_1",
      bookingId: `booking_${Date.now()}`,
      resourceIndex: 1,
      startTime: baseDayStartMs + 10 * ONE_HOUR_MS,
      endTime: baseDayStartMs + 11 * ONE_HOUR_MS,
    };

    const next = {
      id: "2",
      resourceId: "table_2",
      bookingId: `booking_${Date.now() + 100}`,
      resourceIndex: 2,
      startTime: baseDayStartMs + 12 * ONE_HOUR_MS,
      endTime: baseDayStartMs + 13 * ONE_HOUR_MS,
    };

    const result = calculateMaxEndTime(
      current,
      [current, next],
      endHour,
      minGapMs,
      baseDayStartMs,
    );

    expect(result).toBe(baseDayStartMs + endHour * ONE_HOUR_MS);
  });

  it("uses nearest future booking", () => {
    const current = {
      id: "1",
      resourceId: "table_1",
      bookingId: `booking_${Date.now()}`,
      resourceIndex: 1,
      startTime: baseDayStartMs + 10 * ONE_HOUR_MS,
      endTime: baseDayStartMs + 11 * ONE_HOUR_MS,
    };

    const next1 = {
      id: "2",
      resourceId: "table_1",
      bookingId: `booking_${Date.now() + 100}`,
      resourceIndex: 1,
      startTime: baseDayStartMs + 12 * ONE_HOUR_MS,
      endTime: baseDayStartMs + 13 * ONE_HOUR_MS,
    };

    const next2 = {
      id: "3",
      resourceId: "table_1",
      bookingId: `booking_${Date.now() + 200}`,
      resourceIndex: 1,
      startTime: baseDayStartMs + 15 * ONE_HOUR_MS,
      endTime: baseDayStartMs + 16 * ONE_HOUR_MS,
    };

    const result = calculateMaxEndTime(
      current,
      [current, next1, next2],
      endHour,
      minGapMs,
      baseDayStartMs,
    );

    expect(result).toBe(next1.startTime - minGapMs);
  });
});

describe("getInitialScrollX", () => {
  it("returns 0 before working day start", () => {
    const current = baseDayStartMs + (START_HOUR - 1) * ONE_HOUR_MS;

    expect(getInitialScrollX(current, baseDayStartMs, 400)).toBe(0);
  });

  it("returns positive scroll during working day", () => {
    const current = baseDayStartMs + (START_HOUR + 3) * ONE_HOUR_MS;

    expect(getInitialScrollX(current, baseDayStartMs, 400)).toBeGreaterThan(0);
  });
});
