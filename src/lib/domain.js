/**
 * Domain constants and helpers for the exam timetable system.
 * Do not invent new rules; these match institutional policy.
 */

/** @type {"FORENOON" | "AFTERNOON"} */
export const SLOT_FORENOON = "FORENOON";
export const SLOT_AFTERNOON = "AFTERNOON";

/** @type {"EVEN" | "ODD"} */
export const PARITY_EVEN = "EVEN";
export const PARITY_ODD = "ODD";

/**
 * Get parity from semester number (rule 4).
 * semester % 2 === 0 → EVEN, else ODD.
 * @param {number} semesterNumber
 * @returns {"EVEN" | "ODD"}
 */
export function getParity(semesterNumber) {
  return semesterNumber % 2 === 0 ? "EVEN" : "ODD";
}
