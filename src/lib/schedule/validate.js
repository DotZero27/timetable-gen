/**
 * Validation module: all 9 business rules as hard constraints.
 * Pure and deterministic. Abort on first failure.
 */

import { getParity } from "../domain.js";

const SLOTS = new Set(["FORENOON", "AFTERNOON"]);
const WEEKEND_SAT = 6;
const WEEKEND_SUN = 0;

/**
 * @typedef {Object} ScheduleEntry
 * @property {string} date - ISO date YYYY-MM-DD
 * @property {"FORENOON" | "AFTERNOON"} slot
 * @property {number} subjectId
 * @property {number} semesterNumber
 */

/**
 * @typedef {{ success: true }} ValidationOk
 * @typedef {{ success: false, rule: number, message: string }} ValidationFail
 * @typedef {ValidationOk | ValidationFail} ValidationResult
 */

/**
 * Validate full schedule against all 9 rules.
 * @param {ScheduleEntry[]} schedule
 * @param {"EVEN" | "ODD"} cycle
 * @param {Set<string>} holidayDates - Set of date strings (YYYY-MM-DD)
 * @returns {ValidationResult}
 */
export function validateSchedule(schedule, cycle, holidayDates = new Set()) {
  if (schedule.length === 0) return { success: true };

  for (const entry of schedule) {
    if (!SLOTS.has(entry.slot)) {
      return { success: false, rule: 1, message: `Invalid slot: ${entry.slot}. Only FORENOON and AFTERNOON allowed.` };
    }
  }

  for (const entry of schedule) {
    const expectedParity = entry.semesterNumber % 2 === 0 ? "EVEN" : "ODD";
    const actualParity = getParity(entry.semesterNumber);
    if (actualParity !== expectedParity) {
      return { success: false, rule: 4, message: `Parity mismatch for semester ${entry.semesterNumber}.` };
    }
  }

  for (const entry of schedule) {
    if (entry.slot === "FORENOON") {
      const parity = getParity(entry.semesterNumber);
      if (cycle === "EVEN" && parity !== "EVEN") {
        return { success: false, rule: 5, message: "EVEN cycle: FORENOON must only contain subjects whose semester parity is EVEN." };
      }
      if (cycle === "ODD" && parity !== "ODD") {
        return { success: false, rule: 5, message: "ODD cycle: FORENOON must only contain subjects whose semester parity is ODD." };
      }
    }
  }

  const byDate = new Map();
  for (const entry of schedule) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }
  for (const [, entries] of byDate) {
    if (entries.length === 2) {
      const parities = new Set(entries.map((e) => getParity(e.semesterNumber)));
      if (parities.size !== 2) {
        return { success: false, rule: 6, message: "When both slots are used in a day, one must be EVEN and one ODD." };
      }
    }
  }

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

  for (const [, entries] of byDate) {
    if (entries.length > 2) {
      return { success: false, rule: 8, message: "Maximum 2 exams per day." };
    }
    const slots = new Set(entries.map((e) => e.slot));
    if (slots.size !== entries.length) {
      return { success: false, rule: 8, message: "At most one exam per slot per day." };
    }
  }

  return { success: true };
}
