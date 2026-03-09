"use client";

import { UnifiedCalendar } from "./UnifiedCalendar";
import { cn } from "@/lib/utils";

/**
 * Thin wrapper around UnifiedCalendar mode="assign".
 * Kept for backward compatibility; prefer UnifiedCalendar with mode="assign" for new code.
 */
export function AssignmentCalendar({
  startDate,
  endDate,
  subjects = [],
  fixedAssignments = [],
  onAdd,
  holidayDates = new Set(),
  className,
}) {
  return (
    <UnifiedCalendar
      mode="assign"
      startDate={startDate}
      endDate={endDate}
      subjects={subjects}
      fixedAssignments={fixedAssignments}
      onAdd={onAdd}
      holidayDates={holidayDates}
      className={cn(className)}
    />
  );
}
