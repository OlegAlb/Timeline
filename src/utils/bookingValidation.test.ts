import { describe, expect, it } from "vitest";

import { validateBookingSlot } from "./bookingValidation";

import { END_HOUR, MIN_DURATION, MIN_GAP, START_HOUR } from "../constants/grid";

import { ONE_HOUR_MS, ONE_MINUTE_MS } from "../constants/time";

const day = new Date("2025-01-01T00:00:00.000Z").getTime();

const workStart = day + START_HOUR * ONE_HOUR_MS;

describe("validateBookingSlot", () => {
  describe("past time validation", () => {
    it("rejects booking in the past", () => {
      const result = validateBookingSlot(
        "table_1",
        workStart,
        [],
        workStart + ONE_HOUR_MS,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("прошедшее");
    });

    it("allows future booking", () => {
      const result = validateBookingSlot(
        "table_1",
        workStart + ONE_HOUR_MS,
        [],
        workStart,
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe("working hours validation", () => {
    it("rejects booking before working day", () => {
      const result = validateBookingSlot(
        "table_1",
        workStart - ONE_MINUTE_MS,
        [],
        day,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("рабочего дня");
    });

    it("rejects booking that exceeds working day end", () => {
      const startTime =
        day + END_HOUR * ONE_HOUR_MS - MIN_DURATION + ONE_MINUTE_MS;

      const result = validateBookingSlot("table_1", startTime, [], day);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("рабочего дня");
    });

    it("allows booking ending exactly at work end", () => {
      const startTime = day + END_HOUR * ONE_HOUR_MS - MIN_DURATION;

      const result = validateBookingSlot("table_1", startTime, [], day);

      expect(result.isValid).toBe(true);
    });
  });

  describe("collision detection", () => {
    const existingSegment = {
      id: "booking-1",
      bookingId: "booking-1",
      resourceId: "table_1",
      resourceIndex: 0,
      startTime: workStart + ONE_HOUR_MS,
      endTime: workStart + 2 * ONE_HOUR_MS,
    };

    it("rejects overlapping booking", () => {
      const result = validateBookingSlot(
        "table_1",
        existingSegment.startTime + 15 * ONE_MINUTE_MS,
        [existingSegment as any],
        day,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Пересечение");
    });

    it("rejects booking inside min gap before segment", () => {
      const startTime =
        existingSegment.startTime - MIN_GAP - MIN_DURATION + ONE_MINUTE_MS;

      const result = validateBookingSlot(
        "table_1",
        startTime,
        [existingSegment as any],
        day,
      );

      expect(result.isValid).toBe(false);
    });

    it("rejects booking inside min gap after segment", () => {
      const startTime = existingSegment.endTime + MIN_GAP - ONE_MINUTE_MS;

      const result = validateBookingSlot(
        "table_1",
        startTime,
        [existingSegment as any],
        day,
      );

      expect(result.isValid).toBe(false);
    });

    it("allows booking exactly before min gap boundary", () => {
      const endTime = existingSegment.startTime - MIN_GAP;

      const startTime = endTime - MIN_DURATION;

      const result = validateBookingSlot(
        "table_1",
        startTime,
        [existingSegment as any],
        day,
        endTime,
      );

      expect(result.isValid).toBe(true);
    });

    it("allows booking exactly after min gap boundary", () => {
      const startTime = existingSegment.endTime + MIN_GAP;

      const result = validateBookingSlot(
        "table_1",
        startTime,
        [existingSegment as any],
        day,
      );

      expect(result.isValid).toBe(true);
    });

    it("ignores bookings on other resources", () => {
      const result = validateBookingSlot(
        "table_2",
        existingSegment.startTime,
        [existingSegment as any],
        day,
      );

      expect(result.isValid).toBe(true);
    });

    it("handles multiple existing bookings", () => {
      const segments = [
        {
          ...existingSegment,
          id: "1",
        },
        {
          ...existingSegment,
          id: "2",
          startTime: existingSegment.endTime + 4 * ONE_HOUR_MS,
          endTime: existingSegment.endTime + 5 * ONE_HOUR_MS,
        },
      ];

      const result = validateBookingSlot(
        "table_1",
        existingSegment.endTime + 4 * ONE_HOUR_MS + 10 * ONE_MINUTE_MS,
        segments as any,
        day,
      );

      expect(result.isValid).toBe(false);
    });
  });

  describe("customEndTime", () => {
    it("uses custom end time instead of MIN_DURATION", () => {
      const startTime = workStart;

      const customEndTime = startTime + 4 * ONE_HOUR_MS;

      const result = validateBookingSlot(
        "table_1",
        startTime,
        [],
        day,
        customEndTime,
      );

      expect(result.isValid).toBe(true);
    });

    it("validates custom end time against work day", () => {
      const startTime = day + END_HOUR * ONE_HOUR_MS - ONE_HOUR_MS;

      const customEndTime = day + END_HOUR * ONE_HOUR_MS + ONE_MINUTE_MS;

      const result = validateBookingSlot(
        "table_1",
        startTime,
        [],
        day,
        customEndTime,
      );

      expect(result.isValid).toBe(false);
    });
  });
});
