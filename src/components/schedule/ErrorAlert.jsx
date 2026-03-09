"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getNextValidExamDates } from "@/lib/schedule/alternate-dates";
import { cn } from "@/lib/utils";

const RULE_MESSAGES = {
  1: "Something went wrong with the session type. Please try again.",
  4: "Semester and batch don't match. Check your semester list.",
  5: "Morning session can only have subjects from the batch you selected (even or odd semesters).",
  6: "On each day, one session must be even semesters and one odd.",
  7: "Exams cannot be on weekends or holidays.",
  8: "Not enough working days. Try a longer date range or fewer semesters.",
};

function getPlainMessage(rule, apiMessage) {
  return RULE_MESSAGES[rule] ?? apiMessage;
}

/**
 * Displays error in plain language; for rule 7 suggests alternate valid dates.
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

  const message = getPlainMessage(rule, error);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className={cn("overflow-hidden", className)}
        role="alert"
        aria-live="polite"
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
          <AlertTitle>We couldn&apos;t create the schedule</AlertTitle>
          <AlertDescription>
            <p className="font-medium">{message}</p>
            {rule === 7 && suggestedDates.length > 0 && (
              <p className="mt-2 text-sm">
                You can use dates like:{" "}
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
