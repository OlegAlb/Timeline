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
  updateSegmentTime: (
    segmentId: string,
    startTime: number,
    endTime: number,
    resourceId?: string,
  ) => boolean;
  splitSegment: (
    segmentId: string,
    splitTime: number,
    newResourceId: string,
  ) => void;
  updateSegment: (
    segmentId: string,
    updates: { resourceId?: string; startTime?: number; endTime?: number },
  ) => void;
  deleteBooking: (bookingId: string) => void;
}

const initialBookings = {
  booking_1: {
    id: "booking_1",
    customerName: "Иван Петров",
    status: "confirmed" as const,
  },
  booking_2: {
    id: "booking_2",
    customerName: "Анна Сидорова",
    status: "confirmed" as const,
  },
};

const initialSegments = [
  {
    id: "seg_1",
    bookingId: "booking_1",
    resourceId: "table_1", // Первый стол
    startTime: 600, // 10:00 утра
    endTime: 720, // 12:00 дня (бронь на 2 часа)
  },
  {
    id: "seg_2",
    bookingId: "booking_2",
    resourceId: "table_3", // Третий стол
    startTime: 780, // 13:00 дня
    endTime: 900, // 15:00 дня (бронь на 2 часа)
  },
];

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: initialBookings,
  segments: initialSegments,

  addBookingWithSegments: (booking, newSegments) =>
    set((state) => ({
      bookings: { ...state.bookings, [booking.id]: booking },
      segments: [...state.segments, ...newSegments],
    })),

  updateSegmentTime: (segmentId, startTime, endTime, resourceId) => {
    const { segments } = get();

    const hasOverlap = segments.some(
      (seg) =>
        seg.id !== segmentId &&
        seg.resourceId === (resourceId || seg.resourceId) &&
        startTime < seg.endTime &&
        endTime > seg.startTime,
    );

    if (hasOverlap) {
      return false;
    }

    set((state) => ({
      segments: state.segments.map((seg) =>
        seg.id === segmentId
          ? {
              ...seg,
              startTime,
              endTime,
              resourceId: resourceId ?? seg.resourceId,
            }
          : seg,
      ),
    }));

    return true;
  },

  splitSegment: (segmentId, splitTime, newResourceId) =>
    set((state) => {
      const segmentToSplit = state.segments.find((s) => s.id === segmentId);
      if (
        !segmentToSplit ||
        splitTime <= segmentToSplit.startTime ||
        splitTime >= segmentToSplit.endTime
      ) {
        return state;
      }

      const updatedOriginal = { ...segmentToSplit, endTime: splitTime };

      const newSegment: BookingSegment = {
        id: `${segmentId}_child_${Date.now()}`,
        bookingId: segmentToSplit.bookingId,
        resourceId: newResourceId,
        startTime: splitTime,
        endTime: segmentToSplit.endTime,
      };

      return {
        segments: state.segments
          .map((s) => (s.id === segmentId ? updatedOriginal : s))
          .concat(newSegment),
      };
    }),

  updateSegment: (segmentId, updates) => {
    const { segments } = get();
    const currentSeg = segments.find((s) => s.id === segmentId);
    if (!currentSeg) return;

    // Собираем потенциально новые целевые значения
    const targetStart = updates.startTime ?? currentSeg.startTime;
    const targetEnd = updates.endTime ?? currentSeg.endTime;
    const targetResourceId = updates.resourceId ?? currentSeg.resourceId;

    // Проверяем коллизии на стороне JS (самый свежий стейт)
    const hasOverlap = segments.some(
      (seg) =>
        seg.id !== segmentId &&
        seg.resourceId === targetResourceId &&
        targetStart < seg.endTime &&
        targetEnd > seg.startTime,
    );

    // Если коллизия обнаружена — игнорируем обновление (блок вернется на исходное место)
    if (hasOverlap) {
      // Вызываем принудительный триггер стейта, чтобы сбросить временные UI-координаты Skia
      set((state) => ({ segments: [...state.segments] }));
      return;
    }

    set((state) => ({
      segments: state.segments.map((seg) =>
        seg.id === segmentId ? { ...seg, ...updates } : seg,
      ),
    }));
  },

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
