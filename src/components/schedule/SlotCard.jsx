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
        <CardContent className="p-0 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {slot}
          </span>
          <span className="font-medium text-sm truncate" title={subjectName}>
            {subjectName}
          </span>
          <span className="text-xs text-muted-foreground">{subjectCode}</span>
          {semesterNumber != null && (
            <span className="text-xs text-muted-foreground">Sem {semesterNumber}</span>
          )}
          {departmentName && (
            <span className="text-xs text-muted-foreground truncate" title={departmentName}>
              {departmentName}
            </span>
          )}
          {isElective === true && (
            <span className="text-[11px] text-amber-700">Elective</span>
          )}
          {electiveGroupId && (
            <span className="text-[11px] text-muted-foreground truncate" title={electiveGroupId}>
              Group: {formatElectiveGroupLabel(electiveGroupId)}
            </span>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
