"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  animate as motionAnimate,
} from "framer-motion";
import {
  CalendarDays,
  Plus,
  BookOpen,
  CalendarOff,
  Minus,
  RotateCcw,
  X,
  PanelLeftOpen,
  PanelRightOpen,
} from "lucide-react";
import { useApp } from "./AppContext";
import { CalendarView } from "./CalendarView";
import { GenerateForm, CreateScheduleProperties } from "./GenerateForm";
import { GenerateProvider } from "./GenerateContext";
import { SubjectsManager } from "./SubjectsManager";
import { HolidaysManager } from "./HolidaysManager";
import { VersionSelector } from "./VersionSelector";
import { SlotCard } from "./SlotCard";
import { cn } from "@/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ARTBOARD_W = 960;
const GAP = 300;
/** Vertical offset from artboard top to its visual center (for pan centering). */
const ARTBOARD_CENTER_Y = 350;

const PANEL_MIN_PX = 320;
const PANEL_MAX_PX = 560;
const PANEL_DEFAULT_PX = 400;

/** Nudge section toward center when left panel is open (Schedules). Applied only for sections with left panel. */
const LEFT_PANEL_CENTER_OFFSET_X = 24;

const SECTIONS = {
  schedules: { x: 0, y: 0, label: "Schedules" },
  generate: { x: ARTBOARD_W + GAP, y: 0, label: "Create Schedule" },
  subjects: { x: 0, y: 1100, label: "Subjects" },
  holidays: { x: ARTBOARD_W + GAP, y: 1100, label: "Holidays" },
};

const NAV_ITEMS = [
  { id: "schedules", label: "Schedules", icon: CalendarDays },
  { id: "generate", label: "Create", icon: Plus },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "holidays", label: "Holidays", icon: CalendarOff },
];

const SPRING = { type: "spring", stiffness: 170, damping: 26 };

/** Panel enter animation: matches pan spring feel (~0.3s) */
const PANEL_TRANSITION = { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] };
const LEFT_PANEL_ANIMATION = {
  initial: { x: -24, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: PANEL_TRANSITION,
};
const RIGHT_PANEL_ANIMATION = {
  initial: { x: 24, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: PANEL_TRANSITION,
};

const ZOOM_PRESETS = ["25", "50", "75", "100", "150", "200"];

function clamp(min, max, val) {
  return Math.min(max, Math.max(min, val));
}

export function Canvas() {
  const {
    activeSection,
    setActiveSection,
    versions,
    versionsLoading,
    semesters,
    selectedVersionId,
    scheduleDetail,
    detailLoading,
    justCreated,
    setJustCreated,
    handleSelectVersion,
    handleGenerateSuccess,
    handleDeleteVersion,
  } = useApp();

  const [dismissCreated, setDismissCreated] = React.useState(false);
  const [zoomPct, setZoomPct] = React.useState(100);
  const [zoomStyle, setZoomStyle] = React.useState(1); // drive zoom from motion value so re-renders don't reset to 100%
  const [selectedDay, setSelectedDay] = React.useState(null);
  const [leftPanelOpen, setLeftPanelOpen] = React.useState(true);
  const [rightPanelOpen, setRightPanelOpen] = React.useState(true);
  const [layoutSection, setLayoutSection] = React.useState(activeSection);
  const [panelAnimKey, setPanelAnimKey] = React.useState(0);

  const activeSectionRef = React.useRef(activeSection);
  activeSectionRef.current = activeSection;

  // Canvas camera (transform offsets)
  const canvasX = useMotionValue(0);
  const canvasY = useMotionValue(0);
  const zoom = useMotionValue(1);

  const viewportRef = React.useRef(null);
  const zoomContainerRef = React.useRef(null);
  const isInitialMount = React.useRef(true);
  const isDragging = React.useRef(false);
  const dragStart = React.useRef({ x: 0, y: 0, cx: 0, cy: 0 });
  const skipResizePanRef = React.useRef(false);
  const sectionChangeInProgressRef = React.useRef(false);
  const skipSyncExpandRef = React.useRef(false);
  const resizeRafRef = React.useRef(null);
  const leftPanelRef = React.useRef(null);
  const rightPanelRef = React.useRef(null);

  // Sync dot-grid background position and size with canvas pan/zoom
  const syncBackground = React.useCallback(() => {
    if (!viewportRef.current) return;
    const z = zoom.get();
    const gridSize = 20 * z;
    viewportRef.current.style.backgroundPosition = `${canvasX.get() % gridSize}px ${canvasY.get() % gridSize}px`;
    viewportRef.current.style.backgroundSize = `${gridSize}px ${gridSize}px`;
  }, [canvasX, canvasY, zoom]);

  useMotionValueEvent(canvasX, "change", syncBackground);
  useMotionValueEvent(canvasY, "change", syncBackground);
  useMotionValueEvent(zoom, "change", (z) => {
    setZoomStyle(z);
    if (zoomContainerRef.current) zoomContainerRef.current.style.zoom = z;
    syncBackground();
    setZoomPct(Math.round(z * 100));
  });

  // Pan camera to center on a section (uses viewport size when inside resizable panel)
  const getViewportSize = React.useCallback(() => {
    if (viewportRef.current) {
      const r = viewportRef.current.getBoundingClientRect();
      return { w: r.width, h: r.height };
    }
    return { w: window.innerWidth, h: window.innerHeight };
  }, []);

  // Center the selected section in the canvas viewport (same when left or right panel is active)
  // Use zoom from DOM when available so pan math matches rendered scale (fixes wrong pan when zoomed in).
  // options.centerOffsetX: nudge target X (e.g. when left panel is open) so section sits slightly more toward center.
  const panTo = React.useCallback(
    (sectionId, animated = true, options = {}) => {
      const pos = SECTIONS[sectionId];
      if (!pos) return Promise.resolve();
      const { w: vw, h: vh } = getViewportSize();
      const zoomVal = zoomContainerRef.current?.style?.zoom;
      const currentZoom = zoomVal != null && zoomVal !== ""
        ? parseFloat(zoomVal)
        : zoom.get();
      const z = Number.isFinite(currentZoom) && currentZoom > 0 ? currentZoom : 1;
      const centerX = vw / 2;
      const centerY = vh / 2;
      const artboardCenterX = pos.x + ARTBOARD_W / 2;
      const artboardCenterY = pos.y + ARTBOARD_CENTER_Y;
      let targetX = centerX - artboardCenterX * z;
      const targetY = centerY - artboardCenterY * z;
      if (options.centerOffsetX != null) targetX += options.centerOffsetX;

      if (animated) {
        return Promise.all([
          motionAnimate(canvasX, targetX, SPRING),
          motionAnimate(canvasY, targetY, SPRING),
        ]).then(() => { });
      }
      canvasX.set(targetX);
      canvasY.set(targetY);
      return Promise.resolve();
    },
    [canvasX, canvasY, zoom, getViewportSize]
  );

  // Pan to section on activeSection change.
  // On section change: close current panels (layoutSection → no panels), then pan, then open new section's panel (layoutSection → activeSection).
  React.useEffect(() => {
    const section = activeSection;
    skipResizePanRef.current = true;
    let raf2 = null;
    let raf3 = null;
    let raf4 = null;
    let raf5 = null;
    let raf6 = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        raf3 = requestAnimationFrame(() => {
          if (!viewportRef.current) {
            skipResizePanRef.current = false;
            sectionChangeInProgressRef.current = false;
            return;
          }
          if (isInitialMount.current) {
            isInitialMount.current = false;
            setLayoutSection(section);
            panTo(section, false, section === "schedules" ? { centerOffsetX: LEFT_PANEL_CENTER_OFFSET_X } : {});
            skipResizePanRef.current = false;
            return;
          }
          sectionChangeInProgressRef.current = true;
          const isLeftPanelSection = section === "schedules";
          const willHaveLeft = section === "schedules";
          const willHaveRight = section === "generate" || (section === "schedules" && selectedDay != null);

          if (isLeftPanelSection) {
            // Left-panel section: open panel first, then smooth pan the section into place (no viewport shift during pan).
            setLayoutSection("subjects");
            raf4 = requestAnimationFrame(() => {
              raf4 = requestAnimationFrame(() => {
                skipSyncExpandRef.current = true;
                setLeftPanelOpen(true);
                setRightPanelOpen(true);
                setPanelAnimKey((k) => k + 1);
                setLayoutSection(section);
                raf5 = requestAnimationFrame(() => {
                  raf5 = requestAnimationFrame(() => {
                    if (willHaveLeft) leftPanelRef.current?.expand();
                    else leftPanelRef.current?.collapse();
                    if (willHaveRight) rightPanelRef.current?.expand();
                    else rightPanelRef.current?.collapse();
                    void viewportRef.current?.getBoundingClientRect();
                    skipSyncExpandRef.current = false;
                    panTo(section, true, { centerOffsetX: LEFT_PANEL_CENTER_OFFSET_X }).then(() => {
                      skipResizePanRef.current = false;
                      sectionChangeInProgressRef.current = false;
                    });
                  });
                });
              });
            });
          } else {
            // Right-panel or no-panel sections: close → pan → open panels → set canvas to center.
            setLayoutSection("subjects");
            raf4 = requestAnimationFrame(() => {
              raf4 = requestAnimationFrame(() => {
                panTo(section, true).then(() => {
                  if (activeSectionRef.current !== section) {
                    skipResizePanRef.current = false;
                    sectionChangeInProgressRef.current = false;
                    return;
                  }
                  raf5 = requestAnimationFrame(() => {
                    skipSyncExpandRef.current = true;
                    setLeftPanelOpen(true);
                    setRightPanelOpen(true);
                    setPanelAnimKey((k) => k + 1);
                    setLayoutSection(section);
                    raf6 = requestAnimationFrame(() => {
                      if (willHaveLeft) leftPanelRef.current?.expand();
                      else leftPanelRef.current?.collapse();
                      if (willHaveRight) rightPanelRef.current?.expand();
                      else rightPanelRef.current?.collapse();
                      void viewportRef.current?.getBoundingClientRect();
                      panTo(activeSectionRef.current, false);
                      skipSyncExpandRef.current = false;
                      skipResizePanRef.current = false;
                      sectionChangeInProgressRef.current = false;
                    });
                  });
                });
              });
            });
          }
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
      if (raf3 !== null) cancelAnimationFrame(raf3);
      if (raf4 !== null) cancelAnimationFrame(raf4);
      if (raf5 !== null) cancelAnimationFrame(raf5);
      if (raf6 !== null) cancelAnimationFrame(raf6);
    };
  }, [activeSection, panTo]);

  // Recenter when viewport size changes (panel drag / layout); debounced and skipped right after section change
  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handleResize = () => {
      if (resizeRafRef.current !== null) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = null;
        if (skipResizePanRef.current || sectionChangeInProgressRef.current) return;
        const opts = activeSection === "schedules" ? { centerOffsetX: LEFT_PANEL_CENTER_OFFSET_X } : {};
        panTo(activeSection, true, opts);
      });
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (resizeRafRef.current !== null) cancelAnimationFrame(resizeRafRef.current);
    };
  }, [activeSection, panTo]);

  // Also recenter on window resize (e.g. browser window resize)
  React.useEffect(() => {
    const handleResize = () => {
      const opts = activeSection === "schedules" ? { centerOffsetX: LEFT_PANEL_CENTER_OFFSET_X } : {};
      panTo(activeSection, false, opts);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeSection, panTo]);

  // Recenter when panel open/close changes (viewport resizes); double rAF so layout has settled
  React.useEffect(() => {
    let raf2 = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (sectionChangeInProgressRef.current) return;
        if (viewportRef.current) {
          const opts = activeSection === "schedules" ? { centerOffsetX: LEFT_PANEL_CENTER_OFFSET_X } : {};
          panTo(activeSection, true, opts);
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
    };
  }, [leftPanelOpen, rightPanelOpen, activeSection, panTo]);

  // Reset dismissCreated when justCreated changes
  React.useEffect(() => {
    if (justCreated) setDismissCreated(false);
  }, [justCreated]);

  // Wheel: no modifier = vertical pan, shift = horizontal pan, ctrl/meta = zoom
  const handleWheel = React.useCallback(
    (e) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom toward cursor
        const cursorX = e.clientX;
        const cursorY = e.clientY;
        const oldZoom = zoom.get();
        const oldX = canvasX.get();
        const oldY = canvasY.get();
        const newZoom = clamp(0.25, 2.0, oldZoom * (1 + (-e.deltaY * 0.001)));
        const canvasPtX = (cursorX - oldX) / oldZoom;
        const canvasPtY = (cursorY - oldY) / oldZoom;
        canvasX.set(cursorX - canvasPtX * newZoom);
        canvasY.set(cursorY - canvasPtY * newZoom);
        zoom.set(newZoom);
      } else if (e.shiftKey) {
        // Horizontal pan — browsers may swap deltaX/deltaY when shift is held
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        canvasX.set(canvasX.get() - delta);
      } else {
        // Vertical pan
        canvasY.set(canvasY.get() - e.deltaY);
      }
    },
    [canvasX, canvasY, zoom]
  );

  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", handleWheel, { capture: true });
  }, [handleWheel]);

  // Prevent browser zoom on Ctrl/Cmd+wheel and run canvas zoom no matter where the pointer is
  React.useEffect(() => {
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleWheel(e);
      }
    };
    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, [handleWheel]);

  // Drag to pan: left-click on background, or middle-click anywhere
  const handlePointerDown = React.useCallback(
    (e) => {
      if (!viewportRef.current?.contains(e.target)) return;
      const isMiddle = e.button === 1;
      if (!isMiddle && e.target.closest("[data-artboard]")) return;
      if (e.button !== 0 && !isMiddle) return;
      isDragging.current = true;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        cx: canvasX.get(),
        cy: canvasY.get(),
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.style.cursor = "grabbing";
    },
    [canvasX, canvasY]
  );

  const handlePointerMove = React.useCallback(
    (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      canvasX.set(dragStart.current.cx + dx);
      canvasY.set(dragStart.current.cy + dy);
    },
    [canvasX, canvasY]
  );

  const handlePointerUp = React.useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    e.currentTarget.style.cursor = "";
  }, []);

  // Zoom to preset, keeping viewport center fixed (uses viewport size when inside resizable panel)
  const zoomToPreset = React.useCallback(
    (pct) => {
      const newZoom = Number(pct) / 100;
      const { w: vw, h: vh } = getViewportSize();
      const oldZoom = zoom.get();
      const oldX = canvasX.get();
      const oldY = canvasY.get();
      const centerX = (vw / 2 - oldX) / oldZoom;
      const centerY = (vh / 2 - oldY) / oldZoom;
      const targetX = vw / 2 - centerX * newZoom;
      const targetY = vh / 2 - centerY * newZoom;
      motionAnimate(canvasX, targetX, SPRING);
      motionAnimate(canvasY, targetY, SPRING);
      motionAnimate(zoom, newZoom, SPRING);
    },
    [canvasX, canvasY, zoom, getViewportSize]
  );

  const zoomIn = React.useCallback(() => {
    const current = Math.round(zoom.get() * 100);
    const next = ZOOM_PRESETS.find((p) => Number(p) > current) || ZOOM_PRESETS[ZOOM_PRESETS.length - 1];
    zoomToPreset(next);
  }, [zoom, zoomToPreset]);

  const zoomOut = React.useCallback(() => {
    const current = Math.round(zoom.get() * 100);
    const prev = [...ZOOM_PRESETS].reverse().find((p) => Number(p) < current) || ZOOM_PRESETS[0];
    zoomToPreset(prev);
  }, [zoom, zoomToPreset]);

  const zoomReset = React.useCallback(() => zoomToPreset("100"), [zoomToPreset]);

  const generateActionRef = React.useRef(null);

  const showCreatedBanner = justCreated && !dismissCreated;

  const hasLeftPanel = layoutSection === "schedules";
  const hasPropertiesPanel =
    layoutSection === "generate" || (layoutSection === "schedules" && selectedDay != null);
  const leftPanelRendered = hasLeftPanel && leftPanelOpen;
  const rightPanelRendered = hasPropertiesPanel && rightPanelOpen;

  // Initial layout for single panel group: percentages so only active panels get space
  const defaultLayout = React.useMemo(() => {
    const left = hasLeftPanel && leftPanelOpen ? 22 : 0;
    const right = hasPropertiesPanel && rightPanelOpen ? 22 : 0;
    const center = 100 - left - right;
    return { left, center, right };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: only use initial state for first paint

  // Sync panel open/close state with collapse/expand so we don't unmount the tree.
  // Skipped during the expand phase of a section change (handled manually with canvasX compensation).
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (skipSyncExpandRef.current) return;
      if (hasLeftPanel && leftPanelOpen) {
        leftPanelRef.current?.expand();
      } else {
        leftPanelRef.current?.collapse();
      }
      if (hasPropertiesPanel && rightPanelOpen) {
        rightPanelRef.current?.expand();
      } else {
        rightPanelRef.current?.collapse();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [leftPanelOpen, rightPanelOpen, hasLeftPanel, hasPropertiesPanel]);

  // When user drags a panel to width 0, sync open state so the edge toggle button appears.
  // Skip during section change so the programmatic collapse doesn't permanently close panels.
  const handleLayoutChanged = React.useCallback(
    (layout) => {
      if (sectionChangeInProgressRef.current) return;
      if (layout.left !== undefined && layout.left === 0) setLeftPanelOpen(false);
      if (layout.right !== undefined && layout.right === 0) setRightPanelOpen(false);
    },
    []
  );

  const handleScheduleDelete = React.useCallback(
    (version) => {
      if (window.confirm(`Delete schedule ${version.versionNumber}?`)) {
        handleDeleteVersion(version.id);
      }
    },
    [handleDeleteVersion]
  );

  const propertiesPanelContent = () => {
    if (activeSection === "generate") {
      return <CreateScheduleProperties />;
    }
    if (activeSection === "schedules" && selectedDay != null) {
      const daySlots = scheduleDetail?.examSlots?.filter((s) => s.date === selectedDay) ?? [];
      const forenoon = daySlots.find((s) => s.slot === "FORENOON");
      const afternoon = daySlots.find((s) => s.slot === "AFTERNOON");
      const dateLabel = (() => {
        try {
          const d = new Date(selectedDay + "T12:00:00");
          return d.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        } catch {
          return selectedDay;
        }
      })();
      return (
        <div className="flex flex-col h-full min-h-0" data-interactive>
          {/* Summary card */}
          <div className="shrink-0 rounded-2xl border border-border/60 bg-card p-4 mb-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{dateLabel}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {daySlots.length === 0
                    ? "No exams on this day"
                    : `${daySlots.length} exam${daySlots.length === 1 ? "" : "s"} (${forenoon ? "FN" : ""}${forenoon && afternoon ? " + " : ""}${afternoon ? "AN" : ""})`}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDay(null)}
                aria-label="Close day detail"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
          {/* Slot cards — fill remaining space */}
          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto">
            {daySlots.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10 py-12 px-4 text-center">
                <CalendarDays className="size-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">No exams on this day</p>
                <p className="text-xs text-muted-foreground mt-1">Select another date from the calendar.</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Forenoon</p>
                  {forenoon ? (
                    <SlotCard
                      subjectName={forenoon.subjectName}
                      subjectCode={forenoon.subjectCode}
                      semesterNumber={forenoon.semesterNumber}
                      slot={forenoon.slot}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-muted-foreground/30 py-6 text-center text-muted-foreground text-sm">
                      No forenoon exam
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Afternoon</p>
                  {afternoon ? (
                    <SlotCard
                      subjectName={afternoon.subjectName}
                      subjectCode={afternoon.subjectCode}
                      semesterNumber={afternoon.semesterNumber}
                      slot={afternoon.slot}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-muted-foreground/30 py-6 text-center text-muted-foreground text-sm">
                      No afternoon exam
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const rightPanelHeader = () => {
    if (activeSection === "schedules" && selectedDay != null) {
      return {
        title: "Day detail",
        description: "Exams on this day",
      };
    }
    if (activeSection === "generate") {
      return { title: "Properties", description: "Create schedule" };
    }
    return { title: "Properties", description: "" };
  };

  const canvasViewport = (
    <div
      ref={viewportRef}
      className="h-full w-full overflow-hidden canvas-bg select-none"
      style={{ cursor: "default" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <motion.div
        style={{ x: canvasX, y: canvasY }}
        className="absolute will-change-transform origin-top-left"
      >
        <div ref={zoomContainerRef} className="origin-top-left" style={{ zoom: zoomStyle }}>
          {/* ── Schedules artboard ── */}
          <Artboard pos={SECTIONS.schedules} label="Schedules" sectionId="schedules" isActive={activeSection === "schedules"} onSelect={setActiveSection}>
            {showCreatedBanner && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-4 text-sm text-green-800 dark:text-green-200 flex items-center justify-between gap-4"
              >
                <span>Schedule created. Select it below to view.</span>
                <button
                  type="button"
                  onClick={() => {
                    setDismissCreated(true);
                    setJustCreated(false);
                  }}
                  className="text-green-600 dark:text-green-400 hover:underline"
                  aria-label="Dismiss"
                >
                  Dismiss
                </button>
              </motion.div>
            )}

            {/* Selected schedule detail only — list is in left panel */}
            {detailLoading && selectedVersionId ? (
              <div
                className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm"
                aria-busy="true"
              >
                Loading schedule...
              </div>
            ) : scheduleDetail ? (
              <CalendarView
                schedule={scheduleDetail}
                onDayClick={(iso) => setSelectedDay(iso)}
                selectedDay={selectedDay}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select a schedule from the list.</p>
            )}
          </Artboard>

          {/* ── Generate artboard ── */}
          <Artboard pos={SECTIONS.generate} label="Create Schedule" sectionId="generate" isActive={activeSection === "generate"} onSelect={setActiveSection}>
            <GenerateForm isActive={activeSection === "generate"} actionBarRef={generateActionRef} />
          </Artboard>

          {/* ── Subjects artboard ── */}
          <Artboard pos={SECTIONS.subjects} label="Subjects" sectionId="subjects" isActive={activeSection === "subjects"} onSelect={setActiveSection}>
            <SubjectsManager semesters={semesters} />
          </Artboard>

          {/* ── Holidays artboard ── */}
          <Artboard pos={SECTIONS.holidays} label="Holidays" sectionId="holidays" isActive={activeSection === "holidays"} onSelect={setActiveSection}>
            <HolidaysManager />
          </Artboard>
        </div>
      </motion.div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 flex">
        <GenerateProvider semesters={semesters} onSuccess={handleGenerateSuccess}>
          <ResizablePanelGroup
            id="canvas-layout"
            direction="horizontal"
            orientation="horizontal"
            className="flex-1 min-h-0 z-0"
            defaultLayout={defaultLayout}
            onLayoutChanged={handleLayoutChanged}
          >
            <ResizablePanel
              id="left"
              panelRef={leftPanelRef}
              collapsible
              minSize={PANEL_MIN_PX}
              defaultSize={PANEL_DEFAULT_PX}
              maxSize={PANEL_MAX_PX}
              className="z-10 min-w-0 bg-background border-r border-border flex flex-col"
            >
              <motion.aside
                key={`left-${panelAnimKey}`}
                aria-label="Schedules list"
                className="flex flex-col h-full overflow-hidden"
                {...LEFT_PANEL_ANIMATION}
              >
                <div className="p-4 border-b border-border shrink-0 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Schedules</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Choose a schedule to view or delete</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLeftPanelOpen(false)}
                    aria-label="Close panel"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto min-h-0">
                  {hasLeftPanel ? (
                    <VersionSelector
                      versions={versions}
                      selectedId={selectedVersionId}
                      onSelect={handleSelectVersion}
                      onDelete={handleScheduleDelete}
                      loading={versionsLoading}
                    />
                  ) : null}
                </div>
              </motion.aside>
            </ResizablePanel>
            {hasLeftPanel ? (
              <ResizableHandle withHandle className="shrink-0 z-20" />
            ) : (
              <ResizableHandle withHandle={false} disabled className="shrink-0 z-20 w-0 min-w-0 overflow-hidden opacity-0 pointer-events-none border-0" />
            )}
            <ResizablePanel id="center" maxSize={(PANEL_MIN_PX * ARTBOARD_W) / 4} className="min-w-0">
              {canvasViewport}
            </ResizablePanel>
            {hasPropertiesPanel ? (
              <ResizableHandle withHandle className="shrink-0 z-20" />
            ) : (
              <ResizableHandle withHandle={false} disabled className="shrink-0 z-20 w-0 min-w-0 overflow-hidden opacity-0 pointer-events-none border-0" />
            )}
            <ResizablePanel
              id="right"
              panelRef={rightPanelRef}
              collapsible
              minSize={PANEL_MIN_PX}
              defaultSize={PANEL_DEFAULT_PX}
              maxSize={PANEL_MAX_PX}
              className="z-10 min-w-0 bg-background border-l border-border flex flex-col"
            >
              <motion.aside
                key={`right-${panelAnimKey}`}
                aria-label="Properties"
                className="flex flex-col h-full overflow-hidden"
                {...RIGHT_PANEL_ANIMATION}
              >
                <div className="p-4 border-b border-border shrink-0 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{rightPanelHeader().title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{rightPanelHeader().description}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRightPanelOpen(false)}
                    aria-label="Close panel"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
                  <div className="flex-1 min-h-0 min-w-0 overflow-hidden p-4">
                    {hasPropertiesPanel ? propertiesPanelContent() : null}
                  </div>
                </div>
                {activeSection === "generate" && (
                  <div ref={generateActionRef} className="p-4 pt-2 border-t border-border shrink-0" />
                )}
              </motion.aside>
            </ResizablePanel>
          </ResizablePanelGroup>
        </GenerateProvider>
      </div>

      {/* ── Fixed UI layer (outside canvas transform) ── */}

      {/* Left edge: reopen schedules panel when closed */}
      {hasLeftPanel && !leftPanelOpen && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => setLeftPanelOpen(true)}
          aria-label="Open schedules panel"
          className="fixed left-0 top-1/2 z-40 -translate-y-1/2 rounded-r-lg rounded-l-none border border-r-0 border-border bg-background/95 backdrop-blur-md shadow-lg hover:bg-muted"
        >
          <PanelLeftOpen className="size-4" />
        </Button>
      )}
      {/* Right edge: reopen properties panel when closed */}
      {hasPropertiesPanel && !rightPanelOpen && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => setRightPanelOpen(true)}
          aria-label="Open properties panel"
          className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-lg rounded-r-none border border-l-0 border-border bg-background/95 backdrop-blur-md shadow-lg hover:bg-muted"
        >
          <PanelRightOpen className="size-4" />
        </Button>
      )}

      {/* Center-bottom: nav pill + zoom controls */}
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-background/95 backdrop-blur-md shadow-lg p-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex h-full p-1 items-center justify-center gap-1 rounded-xl border border-border bg-background/95 backdrop-blur-md shadow-lg">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            aria-label="Zoom out"
          >
            <Minus className="size-4" />
          </Button>
          <Select
            value={ZOOM_PRESETS.reduce((best, p) =>
              Math.abs(Number(p) - zoomPct) <= Math.abs(Number(best) - zoomPct) ? p : best
            )}
            onValueChange={zoomToPreset}
          >
            <SelectTrigger className=" min-w-16 border-0 bg-transparent shadow-none text-xs font-medium focus:ring-0">
              <SelectValue>{zoomPct}%</SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              {ZOOM_PRESETS.map((pct) => (
                <SelectItem key={pct} value={pct}>
                  {pct}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            aria-label="Zoom in"
          >
            <Plus className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={zoomReset}
            aria-label="Reset zoom"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * Artboard frame — Figma-style labeled container on the canvas.
 */
function Artboard({ pos, label, sectionId, isActive, onSelect, children }) {
  return (
    <div
      data-artboard
      onClick={(e) => {
        if (e.target.closest("button, a, input, select, textarea, [data-interactive]")) return;
        onSelect?.(sectionId);
      }}
      className={cn("absolute select-text cursor-pointer")}
      style={{
        left: pos.x,
        top: pos.y,
        width: ARTBOARD_W,
      }}
    >
      {/* Artboard label (above frame, like Figma) */}
      <div
        className={cn(
          "text-xs font-medium mb-2 select-none transition-colors",
          isActive ? "text-primary" : "text-muted-foreground/60"
        )}
      >
        {label}
      </div>
      {/* Artboard content frame */}
      <div
        className={cn(
          "rounded-2xl border bg-background shadow-sm p-4 transition-[border-color,box-shadow]",
          isActive
            ? "border-primary/30 ring-2 ring-primary/10"
            : "border-border/60"
        )}
      >
        {children}
      </div>
    </div>
  );
}
