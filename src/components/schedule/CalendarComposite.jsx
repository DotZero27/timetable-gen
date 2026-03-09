"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

/** Weekday labels for all calendar views */
export const CALENDAR_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Shared nav bar: prev/next month + label. Used by all calendar variants.
 */
export function CalendarNav({ monthLabel, onPrev, onNext, className }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-muted/30 p-1",
        className
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onPrev}
        aria-label="Previous month"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <span className="text-sm font-medium text-foreground">{monthLabel}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onNext}
        aria-label="Next month"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}

/**
 * Outer frame for calendar: rounded-xl border, card style. Composes WeekdayRow + children (day grid).
 */
export function CalendarFrame({ children, className }) {
  return (
    <div
      className={cn(
        "rounded-xl rounded-t-none border border-border bg-card overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Single row of weekday headers. Use inside CalendarFrame.
 */
export function CalendarWeekdayRow({ weekdays = CALENDAR_WEEKDAYS, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-7 border-b border-border py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/50",
        className
      )}
    >
      {weekdays.map((d) => (
        <div key={d}>{d}</div>
      ))}
    </div>
  );
}

/**
 * Grid container for day cells (7 columns). Use inside CalendarFrame after CalendarWeekdayRow.
 * Children are the day cells; use consistent cell styling (e.g. border-b border-r, min-h or aspect-square).
 */
export function CalendarDayGrid({ children, className }) {
  return (
    <div
      className={cn("grid grid-cols-7", className)}
    >
      {children}
    </div>
  );
}

/**
 * Shared empty-cell style for month grids (leading/trailing padding).
 */
export function CalendarEmptyCell({ className }) {
  return (
    <div
      className={cn(
        "min-h-[88px] bg-muted/20 border-b border-r border-border/40 nth-[7n]:border-r-0",
        className
      )}
    />
  );
}

/**
 * Shared day cell base styles (for schedule-style month view with borders).
 */
export function calendarDayCellStyles({ isWeekend, hasHighlight }) {
  return cn(
    "min-h-[88px] p-2 border-b border-r border-border/40 nth-[7n]:border-r-0 flex flex-col gap-1",
    isWeekend && "bg-muted/20",
    hasHighlight && "bg-primary/5"
  );
}

/**
 * Shared day cell base for picker-style (aspect-square, clickable).
 */
export function calendarPickerCellStyles({ isWeekend, isHoliday, isSelected, inRange }) {
  return cn(
    "aspect-square flex items-center justify-center text-sm font-medium rounded-md transition-colors",
    isWeekend && !inRange && !isSelected && "text-muted-foreground/70",
    isHoliday && !inRange && !isSelected && "bg-destructive/10 text-destructive/80",
    isSelected && "font-semibold"
  );
}

/** YYYY-MM-DD for a Date (uses local date components to avoid timezone shift). */
export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build month grid: array of Date | null for a given year/month */
export function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const totalDays = last.getDate();
  const grid = [];
  for (let i = 0; i < startDay; i++) grid.push(null);
  for (let d = 1; d <= totalDays; d++) {
    grid.push(new Date(year, month, d));
  }
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}
