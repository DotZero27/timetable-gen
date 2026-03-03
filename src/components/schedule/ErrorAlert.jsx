"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getNextValidExamDates } from "@/lib/schedule/alternate-dates";
import { cn } from "@/lib/utils";

/**
 * Displays error message and, for rule 7 (invalid date), suggests alternate valid dates.
 * Composite: Alert + title + description (message + optional alternate dates).
 */
export function ErrorAlert({ error, rule, startDate, endDate, holidayDates, onDismiss, className }) {
  const [suggestedDates, setSuggestedDates] = React.useState([]);

  React.useEffect(() => {
    if (!error || rule !== 7) return;
    const holidays = new Set(holidayDates || []);
    const from = startDate || new Date().toISOString().slice(0, 10);
    setSuggestedDates(getNextValidExamDates(from, 5, holidays));
  }, [error, rule, startDate, holidayDates]);

  if (!error) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className={cn("overflow-hidden", className)}
      >
        <Alert variant="destructive" className="relative">
          {onDismiss && (
            <button
              type="button"
              aria-label="Dismiss"
              className="absolute right-3 top-3 text-destructive/80 hover:text-destructive"
              onClick={onDismiss}
            >
              ×
            </button>
          )}
          <AlertTitle>Schedule generation failed</AlertTitle>
          <AlertDescription>
            <p className="font-medium">Rule {rule}: {error}</p>
            {rule === 7 && suggestedDates.length > 0 && (
              <p className="mt-2 text-sm">
                Suggested valid dates (weekdays, non-holiday):{" "}
                <span className="font-mono text-xs">
                  {suggestedDates.slice(0, 5).join(", ")}
                </span>
              </p>
            )}
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}
