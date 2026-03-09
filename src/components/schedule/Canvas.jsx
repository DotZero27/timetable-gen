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
} from "lucide-react";
import { useApp } from "./AppContext";
import { CalendarView } from "./CalendarView";
import { GenerateForm, CreateScheduleProperties } from "./GenerateForm";
import { GenerateProvider } from "./GenerateContext";
import { SubjectsManager } from "./SubjectsManager";
import { HolidaysManager } from "./HolidaysManager";
import { VersionSelector } from "./VersionSelector";
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
  const resizeRafRef = React.useRef(null);

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
  const panTo = React.useCallback(
    (sectionId, animated = true) => {
      const pos = SECTIONS[sectionId];
      if (!pos) return;
      const { w: vw, h: vh } = getViewportSize();
      const currentZoom = zoom.get();
      const centerX = vw / 2;
      const centerY = vh / 2;
      const artboardCenterX = pos.x + ARTBOARD_W / 2;
      const artboardCenterY = pos.y + ARTBOARD_CENTER_Y;
      const targetX = centerX - artboardCenterX * currentZoom;
      const targetY = centerY - artboardCenterY * currentZoom;

      if (animated) {
        motionAnimate(canvasX, targetX, SPRING);
        motionAnimate(canvasY, targetY, SPRING);
      } else {
        canvasX.set(targetX);
        canvasY.set(targetY);
      }
    },
    [canvasX, canvasY, zoom, getViewportSize]
  );

  // Pan to section on activeSection change — double rAF so layout and viewport size are stable (fixes weird pan when zoomed)
  React.useEffect(() => {
    skipResizePanRef.current = true;
    let raf2 = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!viewportRef.current) {
          skipResizePanRef.current = false;
          return;
        }
        // Nav section change: pan at 100% zoom
        zoom.set(1);
        if (isInitialMount.current) {
          isInitialMount.current = false;
          panTo(activeSection, false);
        } else {
          panTo(activeSection, true);
        }
        skipResizePanRef.current = false;
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
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
        if (skipResizePanRef.current) return;
        panTo(activeSection, false);
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
    const handleResize = () => panTo(activeSection, false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeSection, panTo]);

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

  const hasLeftPanel = activeSection === "schedules";
  const hasPropertiesPanel = activeSection === "generate";

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
    return null;
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
        <div ref={zoomContainerRef} className="origin-top-left" style={{ zoom: 1 }}>
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
              <CalendarView schedule={scheduleDetail} />
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
          {hasLeftPanel ? (
            <ResizablePanelGroup
              key="with-schedules-list"
              direction="horizontal"
              className="flex-1 min-h-0 z-0"
            >
              <ResizablePanel defaultSize={PANEL_DEFAULT_PX} minSize={PANEL_MIN_PX} maxSize={PANEL_MAX_PX} className="z-10 min-w-0 bg-background border-r border-border flex flex-col">
                <aside
                  aria-label="Schedules list"
                  className="flex flex-col h-full overflow-hidden"
                >
                  <div className="p-4 border-b border-border shrink-0">
                    <h2 className="text-sm font-semibold text-foreground">Schedules</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Choose a schedule to view or delete</p>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto min-h-0">
                    <VersionSelector
                      versions={versions}
                      selectedId={selectedVersionId}
                      onSelect={handleSelectVersion}
                      onDelete={handleScheduleDelete}
                      loading={versionsLoading}
                    />
                  </div>
                </aside>
              </ResizablePanel>
              <ResizableHandle withHandle className="shrink-0 z-20" />
              <ResizablePanel maxSize={(PANEL_MIN_PX * ARTBOARD_W) / 4} className="min-w-0">
                {canvasViewport}
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : hasPropertiesPanel ? (
            <ResizablePanelGroup
              key="with-properties"
              direction="horizontal"
              className="flex-1 min-h-0 z-0"
            >
              <ResizablePanel maxSize={(PANEL_MIN_PX * ARTBOARD_W) / 4} className="min-w-0">
                {canvasViewport}
              </ResizablePanel>
              <ResizableHandle withHandle className="shrink-0 z-20" />
              <ResizablePanel defaultSize={PANEL_DEFAULT_PX} minSize={PANEL_MIN_PX} maxSize={PANEL_MAX_PX} className="z-10 min-w-0 bg-background border-l border-border flex flex-col">
                <aside
                  aria-label="Properties"
                  className="flex flex-col h-full overflow-hidden"
                >
                  <div className="p-4 border-b border-border shrink-0">
                    <h2 className="text-sm font-semibold text-foreground">Properties</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Create schedule</p>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto min-h-0">
                    {propertiesPanelContent()}
                  </div>
                  <div ref={generateActionRef} className="p-4 pt-2 border-t border-border shrink-0" />
                </aside>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex-1 min-h-0 min-w-0">
              {canvasViewport}
            </div>
          )}
        </GenerateProvider>
      </div>

      {/* ── Fixed UI layer (outside canvas transform) ── */}

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
          "rounded-2xl border bg-background shadow-sm p-6 transition-[border-color,box-shadow]",
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
