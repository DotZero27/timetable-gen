"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  VersionSelector,
  CalendarView,
  GenerateForm,
  SubjectsManager,
  HolidaysManager,
} from "@/components/schedule";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "calendar", label: "Schedules" },
  { id: "generate", label: "Generate" },
  { id: "subjects", label: "Subjects" },
  { id: "holidays", label: "Holidays & events" },
];

/**
 * Full-width layout: left sidebar (controls) + main content.
 * Composite: VersionSelector + CalendarView (when version selected) + GenerateForm, etc.
 */
export default function SchedulePage() {
  const [versions, setVersions] = React.useState([]);
  const [versionsLoading, setVersionsLoading] = React.useState(true);
  const [selectedVersionId, setSelectedVersionId] = React.useState(null);
  const [scheduleDetail, setScheduleDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [semesters, setSemesters] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState("calendar");

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [vRes, sRes] = await Promise.all([
          fetch("/api/schedules"),
          fetch("/api/semesters"),
        ]);
        if (cancelled) return;
        const vData = await vRes.json();
        const sData = await sRes.json();
        setVersions(Array.isArray(vData) ? vData : []);
        setSemesters(Array.isArray(sData) ? sData : []);
      } catch (_) {
        if (!cancelled) setVersions([]);
      } finally {
        if (!cancelled) setVersionsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!selectedVersionId) {
      setScheduleDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fetch(`/api/schedules/${selectedVersionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setScheduleDetail(data);
      })
      .catch(() => {
        if (!cancelled) setScheduleDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedVersionId]);

  const handleGenerateSuccess = React.useCallback((versionId) => {
    setActiveTab("calendar");
    setSelectedVersionId(versionId);
    setVersionsLoading(true);
    fetch("/api/schedules")
      .then((r) => r.json())
      .then((list) => {
        setVersions(Array.isArray(list) ? list : []);
      })
      .finally(() => setVersionsLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background flex"
    >
      {/* Left sidebar: controls */}
      <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border shrink-0">
          <h1 className="text-lg font-bold tracking-tight">Examination Timetable</h1>
          <p className="text-muted-foreground text-xs mt-1">
            Two slots per day: Forenoon & Afternoon (by cycle parity).
          </p>
        </div>
        <nav className="p-2 flex flex-col gap-0.5 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full text-left rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {activeTab === "calendar" && (
          <div className="p-3 border-t border-border flex-1 min-h-0 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-2">Schedule version</p>
            <VersionSelector
              versions={versions}
              selectedId={selectedVersionId}
              onSelect={(v) => setSelectedVersionId(v.id)}
              loading={versionsLoading}
            />
          </div>
        )}
      </aside>

      {/* Main content: full width */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 max-w-full">
          <AnimatePresence mode="wait">
            {activeTab === "calendar" && (
              <motion.section
                key="calendar"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {detailLoading && selectedVersionId ? (
                  <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
                    Loading calendar…
                  </div>
                ) : scheduleDetail ? (
                  <CalendarView schedule={scheduleDetail} />
                ) : (
                  <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-12 text-center text-muted-foreground text-sm">
                    Select a schedule version in the left sidebar to view the calendar.
                  </div>
                )}
              </motion.section>
            )}
            {activeTab === "generate" && (
              <motion.section
                key="generate"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25 }}
              >
                <GenerateForm semesters={semesters} onSuccess={handleGenerateSuccess} />
              </motion.section>
            )}
            {activeTab === "subjects" && (
              <motion.section
                key="subjects"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25 }}
              >
                <SubjectsManager semesters={semesters} />
              </motion.section>
            )}
            {activeTab === "holidays" && (
              <motion.section
                key="holidays"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25 }}
              >
                <HolidaysManager />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </motion.div>
  );
}
