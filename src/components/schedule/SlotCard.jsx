"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Leaf component: displays a single exam slot (subject + semester).
 * Used inside DayCell.
 */
export function SlotCard({ subjectName, subjectCode, semesterNumber, slot, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("w-full", className)}
    >
      <Card className="py-2 px-3">
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
