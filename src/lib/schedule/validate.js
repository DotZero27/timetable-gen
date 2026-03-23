/**
 * Validation module: all business rules as hard constraints.
 * Pure and deterministic. Abort on first failure.
 */

import { getParity } from "../domain.js";
import { canCoexistInSlot } from "./slotRules.js";

const SLOTS = new Set(["FORENOON", "AFTERNOON"]);
const WEEKEND_SAT = 6;
const WEEKEND_SUN = 0;

/**
 * @param {ScheduleEntry} entry
 * @returns {string}
 */
function normalizeElectiveGroup(entry) {
  return String(entry.electiveGroupId ?? "").trim();
}

/**
 * @typedef {Object} ScheduleEntry
 * @property {string} date - ISO date YYYY-MM-DD
 * @property {"FORENOON" | "AFTERNOON"} slot
 * @property {string} subjectCode
 * @property {number} semesterNumber
 * @property {number} departmentId
 * @property {boolean} [isElective]
 * @property {string | null} [electiveGroupId]
 */

/**
 * @typedef {{ success: true }} ValidationOk
 * @typedef {{ success: false, rule: number, message: string }} ValidationFail
 * @typedef {ValidationOk | ValidationFail} ValidationResult
 */

/**
 * Validate full schedule against all rules.
 * @param {ScheduleEntry[]} schedule
 * @param {"EVEN" | "ODD"} cycle
 * @param {Set<string>} holidayDates - Set of date strings (YYYY-MM-DD)
 * @param {number} semesterGapDays
 * @returns {ValidationResult}
 */
export function validateSchedule(schedule, cycle, holidayDates = new Set(), semesterGapDays = 0) {
  if (schedule.length === 0) return { success: true };

  // Rule 1: valid slots only
  for (const entry of schedule) {
    if (!SLOTS.has(entry.slot)) {
      return { success: false, rule: 1, message: `Invalid slot: ${entry.slot}. Only FORENOON and AFTERNOON allowed.` };
    }
  }

  // Rule 4: parity consistency
  for (const entry of schedule) {
    const expectedParity = entry.semesterNumber % 2 === 0 ? "EVEN" : "ODD";
    const actualParity = getParity(entry.semesterNumber);
    if (actualParity !== expectedParity) {
      return { success: false, rule: 4, message: `Parity mismatch for semester ${entry.semesterNumber}.` };
    }
  }

  // Rule 5: cycle-slot alignment (FORENOON = current parity, AFTERNOON = opposite parity)
  for (const entry of schedule) {
    const parity = getParity(entry.semesterNumber);
    if (entry.slot === "FORENOON") {
      if (cycle === "EVEN" && parity !== "EVEN") {
        return { success: false, rule: 5, message: "EVEN cycle: FORENOON must only contain subjects whose semester parity is EVEN." };
      }
      if (cycle === "ODD" && parity !== "ODD") {
        return { success: false, rule: 5, message: "ODD cycle: FORENOON must only contain subjects whose semester parity is ODD." };
      }
    }
    if (entry.slot === "AFTERNOON") {
      if (cycle === "EVEN" && parity !== "ODD") {
        return { success: false, rule: 5, message: "EVEN cycle: AFTERNOON must only contain subjects whose semester parity is ODD." };
      }
      if (cycle === "ODD" && parity !== "EVEN") {
        return { success: false, rule: 5, message: "ODD cycle: AFTERNOON must only contain subjects whose semester parity is EVEN." };
      }
    }
  }

  // Group entries by date+slot
  const byDateSlot = new Map();
  for (const entry of schedule) {
    const key = `${entry.date}:${entry.slot}`;
    const list = byDateSlot.get(key) ?? [];
    list.push(entry);
    byDateSlot.set(key, list);
  }

  // Rule 6: mixed parity when both slots used on a day
  const byDate = new Map();
  for (const entry of schedule) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }
  for (const [, entries] of byDate) {
    const slotsUsed = new Set(entries.map((e) => e.slot));
    if (slotsUsed.size === 2) {
      const parities = new Set(entries.map((e) => getParity(e.semesterNumber)));
      if (parities.size !== 2) {
        return { success: false, rule: 6, message: "When both slots are used in a day, one must be EVEN and one ODD." };
      }
    }
  }

  // Rule 8: a semester can appear in at most one slot per day.
  for (const [date, entries] of byDate) {
    const slotsBySemester = new Map();
    for (const entry of entries) {
      const slots = slotsBySemester.get(entry.semesterNumber) ?? new Set();
      slots.add(entry.slot);
      slotsBySemester.set(entry.semesterNumber, slots);
      if (slots.size > 1) {
        return {
          success: false,
          rule: 8,
          message: `Semester ${entry.semesterNumber} appears in both slots on ${date}. A semester can use only one slot per day.`,
        };
      }
    }
  }

  // Rule 10: minimum configured gap between exams of the same semester
  if (semesterGapDays > 0) {
    const datesBySemester = new Map();
    for (const entry of schedule) {
      const dates = datesBySemester.get(entry.semesterNumber) ?? [];
      dates.push(entry.date);
      datesBySemester.set(entry.semesterNumber, dates);
    }
    for (const [semesterNumber, dates] of datesBySemester) {
      const ordered = [...new Set(dates)].sort();
      for (let i = 1; i < ordered.length; i++) {
        const prev = new Date(`${ordered[i - 1]}T12:00:00Z`);
        const next = new Date(`${ordered[i]}T12:00:00Z`);
        const diff = Math.round((next.getTime() - prev.getTime()) / 86400000);
        if (diff <= semesterGapDays) {
          return {
            success: false,
            rule: 10,
            message: `Semester ${semesterNumber} violates minimum gap of ${semesterGapDays} day(s): ${ordered[i - 1]} and ${ordered[i]}.`,
          };
        }
      }
    }
  }

  // Rule 7: no weekends or holidays
  for (const entry of schedule) {
    const d = new Date(entry.date + "T12:00:00Z");
    const day = d.getUTCDay();
    if (day === WEEKEND_SAT || day === WEEKEND_SUN) {
      return { success: false, rule: 7, message: `No exams on weekends. Invalid date: ${entry.date}.` };
    }
    if (holidayDates.has(entry.date)) {
      return { success: false, rule: 7, message: `No exams on holidays. Invalid date: ${entry.date}.` };
    }
  }

  // Rule 8: same-semester-per-slot — all subjects in a date+slot must share semesterNumber
  for (const [key, entries] of byDateSlot) {
    const semesters = new Set(entries.map((e) => e.semesterNumber));
    if (semesters.size > 1) {
      return {
        success: false,
        rule: 8,
        message: `Multiple semesters in same slot on ${key.replace(":", " ")}. All subjects in a date+slot must be from the same semester.`,
      };
    }
  }

  // Rule 9: slot compatibility checks (semester/dept/elective group constraints)
  for (const [key, entries] of byDateSlot) {
    const placed = [];
    for (const entry of entries) {
      const result = canCoexistInSlot(placed, entry);
      if (!result.ok) {
        const sem = entry.semesterNumber;
        const slotLabel = key.replace(":", " ");
        if (result.code === "department-conflict") {
          return {
            success: false,
            rule: 9,
            message: `Multiple exams for the same department in semester ${sem} on ${slotLabel}.`,
          };
        }
        if (result.code === "elective-group-conflict") {
          return {
            success: false,
            rule: 9,
            message: `Elective group conflict in semester ${sem} on ${slotLabel}.`,
          };
        }
        return {
          success: false,
          rule: 9,
          message: `Slot compatibility conflict in semester ${sem} on ${slotLabel}.`,
        };
      }
      placed.push(entry);
    }
  }

  // Rule 9: grouped electives must stay in one date+slot for the semester.
  const electiveGroupAnchors = new Map();
  for (const entry of schedule) {
    if (entry.isElective !== true) continue;
    const groupId = normalizeElectiveGroup(entry);
    if (!groupId) continue;
    const key = `${entry.semesterNumber}:${groupId}`;
    const anchor = electiveGroupAnchors.get(key);
    if (!anchor) {
      electiveGroupAnchors.set(key, { date: entry.date, slot: entry.slot });
      continue;
    }
    if (anchor.date !== entry.date || anchor.slot !== entry.slot) {
      return {
        success: false,
        rule: 9,
        message: `Elective group ${groupId} in semester ${entry.semesterNumber} must be scheduled in one date and slot.`,
      };
    }
  }

  return { success: true };
}
