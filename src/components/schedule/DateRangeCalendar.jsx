"use client";

import { UnifiedCalendar } from "./UnifiedCalendar";
import { cn } from "@/lib/utils";

/**
 * Thin wrapper around UnifiedCalendar mode="range".
 * Kept for backward compatibility; prefer UnifiedCalendar with mode="range" for new code.
 */
export function DateRangeCalendar({
  startDate,
  endDate,
  onRangeChange,
  holidayDates = new Set(),
  className,
}) {
  return (
    <UnifiedCalendar
      mode="range"
      startDate={startDate ?? undefined}
      endDate={endDate ?? undefined}
      onRangeChange={onRangeChange}
      holidayDates={holidayDates}
      className={cn(className)}
    />
  );
}
