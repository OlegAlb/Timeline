import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";

export interface Booking {
  id: string;
  customerName: string;
}

export interface BookingSegment {
  id: string;
  bookingId: string;
  resourceId: string;
  resourceIndex: number;
  startTime: number;
  endTime: number;
}

interface BookingState {
  bookings: Record<string, Booking>;
  segments: Record<string, BookingSegment>;

  actions: {
    addBookingWithSegments: (
      booking: Booking,
      newSegments: BookingSegment[],
    ) => void;
    updateSegment: (
      segmentId: string,
      newResourceId: string,
      newResourceIndex: number,
      newStartTime: number,
      newEndTime: number,
    ) => void;
    deleteBooking: (bookingId: string) => void;
  };
}

export const useBookingStore = create<BookingState>()(
  immer((set) => ({
    bookings: {},
    segments: {},

    actions: {
      addBookingWithSegments: (booking, newSegments) =>
        set((state) => {
          state.bookings[booking.id] = booking;
          newSegments.forEach((seg) => {
            state.segments[seg.id] = seg;
          });
        }),

      updateSegment: (
        segmentId,
        newResourceId,
        newResourceIndex,
        newStartTime,
        newEndTime,
      ) =>
        set((state) => {
          const segment = state.segments[segmentId];
          if (segment) {
            segment.resourceId = newResourceId;
            segment.resourceIndex = newResourceIndex;
            segment.startTime = newStartTime;
            segment.endTime = newEndTime;
          }
        }),

      deleteBooking: (bookingId) =>
        set((state) => {
          delete state.bookings[bookingId];
          Object.keys(state.segments).forEach((segId) => {
            if (state.segments[segId].bookingId === bookingId) {
              delete state.segments[segId];
            }
          });
        }),
    },
  })),
);

/**
 * Возвращает сегменты в виде объекта
 */
export const useSegments = () => {
  return useBookingStore((state) => state.segments);
};

/**
 * Возвращает сегменты в виде массива
 */
export const useSegmentsArray = () => {
  return useBookingStore(useShallow((state) => Object.values(state.segments)));
};

/**
 * Возвращает один конкретный сегмент по его ID
 */
export const useSegmentById = (segmentId: string) => {
  return useBookingStore((state) => state.segments[segmentId]);
};

/**
 * Возвращает бронирования в виде объекта
 */
export const useBookings = () => {
  return useBookingStore((state) => state.bookings);
};

/**
 * Хук для получения всех экшенов изменения бронирований.
 * Абсолютно безопасен для производительности, не вызывает перерисовок.
 */
export const useBookingActions = () => {
  return useBookingStore((state) => state.actions);
};
