"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { useScheduleDetail } from "@/hooks/useScheduleDetail";
import { CalendarView } from "@/components/schedule/CalendarView";
import { SlotCard } from "@/components/schedule/SlotCard";
import { Button } from "@/components/ui/button";

export default function ScheduleDetailPage() {
  const { versionId } = useParams();
  const numericId = Number(versionId);
  const { data: schedule, isLoading } = useScheduleDetail(numericId);
  const [selectedDay, setSelectedDay] = React.useState(null);

  const daySlots = React.useMemo(() => {
    if (!selectedDay || !schedule?.examSlots) return [];
    return schedule.examSlots.filter((s) => s.date === selectedDay);
  }, [selectedDay, schedule]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 rounded-lg border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="space-y-4">
        <Link href="/schedules" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to schedules
        </Link>
        <p className="text-sm text-muted-foreground">Schedule not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/schedules"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to schedules
      </Link>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <CalendarView
            schedule={schedule}
            onDayClick={setSelectedDay}
            selectedDay={selectedDay}
          />
        </div>

        <AnimatePresence>
          {selectedDay && (
            <motion.aside
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 320 }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              transition={{ duration: 0.25 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="w-80 rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{selectedDay}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setSelectedDay(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                {daySlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No exams on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {daySlots.map((slot) => (
                      <SlotCard
                        key={`${slot.date}-${slot.slot}-${slot.subjectCode}`}
                        subjectName={slot.subjectName}
                        subjectCode={slot.subjectCode}
                        semesterNumber={slot.semesterNumber}
                        slot={slot.slot}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
