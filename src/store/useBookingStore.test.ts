import { beforeEach, describe, expect, it } from "vitest";

import { Booking, BookingSegment, useBookingStore } from "./useBookingStore";

describe("useBookingStore", () => {
  const booking: Booking = {
    id: "booking-1",
    customerName: "John Doe",
  };

  const segment1: BookingSegment = {
    id: "segment-1",
    bookingId: "booking-1",
    resourceId: "table_1",
    resourceIndex: 0,
    startTime: 1000,
    endTime: 2000,
  };

  const segment2: BookingSegment = {
    id: "segment-2",
    bookingId: "booking-1",
    resourceId: "table_2",
    resourceIndex: 1,
    startTime: 3000,
    endTime: 4000,
  };

  beforeEach(() => {
    useBookingStore.setState({
      bookings: {},
      segments: {},
      actions: useBookingStore.getState().actions,
    });
  });

  describe("addBookingWithSegments", () => {
    it("adds booking", () => {
      useBookingStore.getState().actions.addBookingWithSegments(booking, []);

      const state = useBookingStore.getState();

      expect(state.bookings["booking-1"]).toEqual(booking);
    });

    it("adds booking segments", () => {
      useBookingStore
        .getState()
        .actions.addBookingWithSegments(booking, [segment1, segment2]);

      const state = useBookingStore.getState();

      expect(state.segments["segment-1"]).toEqual(segment1);

      expect(state.segments["segment-2"]).toEqual(segment2);
    });

    it("adds booking and segments together", () => {
      useBookingStore
        .getState()
        .actions.addBookingWithSegments(booking, [segment1]);

      const state = useBookingStore.getState();

      expect(Object.keys(state.bookings)).toHaveLength(1);

      expect(Object.keys(state.segments)).toHaveLength(1);
    });
  });

  describe("updateSegment", () => {
    beforeEach(() => {
      useBookingStore
        .getState()
        .actions.addBookingWithSegments(booking, [segment1]);
    });

    it("updates segment fields", () => {
      useBookingStore
        .getState()
        .actions.updateSegment("segment-1", "table_5", 4, 5000, 6000);

      const updated = useBookingStore.getState().segments["segment-1"];

      expect(updated.resourceId).toBe("table_5");

      expect(updated.resourceIndex).toBe(4);

      expect(updated.startTime).toBe(5000);

      expect(updated.endTime).toBe(6000);
    });

    it("does not create missing segment", () => {
      useBookingStore
        .getState()
        .actions.updateSegment("unknown", "table_5", 4, 5000, 6000);

      expect(useBookingStore.getState().segments["unknown"]).toBeUndefined();
    });

    it("does not affect other segments", () => {
      useBookingStore
        .getState()
        .actions.addBookingWithSegments(booking, [segment2]);

      useBookingStore
        .getState()
        .actions.updateSegment("segment-1", "table_9", 8, 7000, 8000);

      const untouched = useBookingStore.getState().segments["segment-2"];

      expect(untouched).toEqual(segment2);
    });
  });

  describe("deleteBooking", () => {
    beforeEach(() => {
      useBookingStore
        .getState()
        .actions.addBookingWithSegments(booking, [segment1, segment2]);
    });

    it("removes booking", () => {
      useBookingStore.getState().actions.deleteBooking("booking-1");

      expect(useBookingStore.getState().bookings["booking-1"]).toBeUndefined();
    });

    it("removes all related segments", () => {
      useBookingStore.getState().actions.deleteBooking("booking-1");

      const state = useBookingStore.getState();

      expect(state.segments["segment-1"]).toBeUndefined();

      expect(state.segments["segment-2"]).toBeUndefined();
    });

    it("keeps segments of other bookings", () => {
      const secondBooking: Booking = {
        id: "booking-2",
        customerName: "Alice",
      };

      const secondSegment: BookingSegment = {
        id: "segment-3",
        bookingId: "booking-2",
        resourceId: "table_3",
        resourceIndex: 2,
        startTime: 5000,
        endTime: 6000,
      };

      useBookingStore
        .getState()
        .actions.addBookingWithSegments(secondBooking, [secondSegment]);

      useBookingStore.getState().actions.deleteBooking("booking-1");

      const state = useBookingStore.getState();

      expect(state.bookings["booking-2"]).toEqual(secondBooking);

      expect(state.segments["segment-3"]).toEqual(secondSegment);
    });

    it("does nothing for unknown booking", () => {
      expect(() =>
        useBookingStore.getState().actions.deleteBooking("unknown"),
      ).not.toThrow();
    });
  });
});
