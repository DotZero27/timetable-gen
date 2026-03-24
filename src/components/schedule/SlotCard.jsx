"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatElectiveGroupLabel } from "@/lib/utils";

/**
 * Leaf component: displays a single exam slot with metadata.
 * Used inside DayCell.
 */
export function SlotCard({
  subjectName,
  subjectCode,
  semesterNumber,
  slot,
  departmentName,
  isElective,
  electiveGroupId,
  className,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("w-full", className)}
    >
      <Card className="py-2 px-3 shadow-none">
        <CardContent className="p-0 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {slot === "FORENOON" ? "Forenoon" : slot === "AFTERNOON" ? "Afternoon" : slot}
            </span>
            {semesterNumber != null && (
              <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Sem {semesterNumber}
              </span>
            )}
          </div>
          <span className="font-medium text-sm leading-snug truncate" title={subjectName}>
            {subjectName}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{subjectCode}</span>
          {departmentName && (
            <span
              className="inline-flex w-fit max-w-full items-center rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground truncate"
              title={departmentName}
            >
              {departmentName}
            </span>
          )}
          {isElective === true && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                Elective
              </span>
              {electiveGroupId && (
                <span
                  className="text-[10px] text-muted-foreground truncate"
                  title={electiveGroupId}
                >
                  {formatElectiveGroupLabel(electiveGroupId)}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
