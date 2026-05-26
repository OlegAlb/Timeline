import {
  getWidthByDuration,
  getXFromTime,
  getYFromRowIndex,
} from "@/src/utils/gridMath";
import {
  ClipOp,
  rect,
  SkCanvas,
  SkFont,
  Skia,
  SkPaint,
} from "@shopify/react-native-skia";
import { ROW_HEIGHT } from "../constants/grid";
import { Booking, BookingSegment } from "../store/useBookingStore";
import { UI } from "../constants/ui";

interface GridPaints {
  rectPaint: SkPaint;
  textPaint: SkPaint;
  controlPaint: SkPaint;
}

const BLOCK_PADDING_VERTICAL = 6;
const BLOCK_PADDING_HORIZONTAL = 4;
const TEXT_PADDING_LEFT = 10;
const HANDLE_OFFSET_RIGHT = 6;

export const drawBookingBlock = (
  canvas: SkCanvas,
  segment: BookingSegment,
  booking: Booking,
  font: SkFont | null,
  baseDayStartMs: number,
  paints: GridPaints,
) => {
  "worklet";

  const x = getXFromTime(segment.startTime, baseDayStartMs);
  const y = getYFromRowIndex(segment.resourceIndex) + BLOCK_PADDING_VERTICAL;

  const width =
    getWidthByDuration(segment.endTime - segment.startTime) -
    BLOCK_PADDING_HORIZONTAL;
  const height = ROW_HEIGHT - BLOCK_PADDING_VERTICAL * 2;

  if (width <= 0) return;

  const rrect = Skia.RRectXY(
    rect(x, y, width, height),
    UI.borderRadius,
    UI.borderRadius,
  );
  canvas.drawRRect(rrect, paints.rectPaint);

  if (font) {
    canvas.save();

    canvas.clipRRect(rrect, ClipOp.Intersect, true);

    canvas.drawText(
      booking.customerName,
      x + TEXT_PADDING_LEFT,
      y + height / 2 + font.getSize() / 3,
      paints.textPaint,
      font,
    );

    canvas.restore();
  }

  const handleX = x + width - HANDLE_OFFSET_RIGHT;
  const handleYCenter = y + height / 2;

  canvas.drawLine(
    handleX,
    handleYCenter - 5,
    handleX,
    handleYCenter + 5,
    paints.controlPaint,
  );

  canvas.drawLine(
    handleX - 3,
    handleYCenter - 3,
    handleX - 3,
    handleYCenter + 3,
    paints.controlPaint,
  );
};
