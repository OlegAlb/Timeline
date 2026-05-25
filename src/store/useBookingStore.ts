import { create } from "zustand";

export interface Booking {
  id: string;
  customerName: string;
  status: "confirmed" | "pending" | "cancelled";
}

export interface BookingSegment {
  id: string;
  bookingId: string;
  resourceId: string;
  startTime: number;
  endTime: number;
}

interface BookingState {
  bookings: Record<string, Booking>;
  segments: BookingSegment[];

  addBookingWithSegments: (
    booking: Booking,
    segments: BookingSegment[],
  ) => void;
  updateSegment: (
    segmentId: string,
    newResourceId: string,
    newStartTime: number,
    newEndTime: number,
  ) => void;
  deleteBooking: (bookingId: string) => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: {},
  segments: [],

  addBookingWithSegments: (booking, newSegments) =>
    set((state) => ({
      bookings: { ...state.bookings, [booking.id]: booking },
      segments: [...state.segments, ...newSegments],
    })),

  updateSegment: (segmentId, newResourceId, newStartTime, newEndTime) =>
    set((state) => {
      const updatedSegments = state.segments.map((seg) =>
        seg.id === segmentId
          ? {
              ...seg,
              resourceId: newResourceId,
              startTime: newStartTime,
              endTime: newEndTime,
            }
          : seg,
      );
      return { segments: updatedSegments };
    }),

  deleteBooking: (bookingId: string) =>
    set((state) => {
      const newBookings = { ...state.bookings };
      delete newBookings[bookingId];
      return {
        bookings: newBookings,
        segments: state.segments.filter((seg) => seg.bookingId !== bookingId),
      };
    }),
}));
