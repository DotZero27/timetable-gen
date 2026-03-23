import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Human-readable label for stored elective group IDs (e.g. SEM2_core_elective).
 * Keeps the underlying value unchanged; use only for display.
 */
export function formatElectiveGroupLabel(raw) {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (!s.includes("_")) return s;
  let spaced = s.replace(/_/g, " ");
  spaced = spaced.replace(/\bSEM(\d+)\b/gi, "SEM $1");
  return spaced
    .split(/\s+/)
    .map((w) => {
      if (/^\d+$/.test(w)) return w;
      if (w.toUpperCase() === "SEM") return "SEM";
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}
