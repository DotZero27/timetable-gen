/**
 * Deterministic scheduler. No optimization algorithms.
 * Follows institutional policy rules; aborts on first validation failure.
 */

import { getParity } from "../domain.js";
import { validateSchedule } from "./validate.js";

/**
 * @typedef {Object} ExamInput
 * @property {number} subjectId
 * @property {number} semesterNumber
 */

/**
 * @typedef {Object} FixedAssignment
 * @property {string} date - YYYY-MM-DD
 * @property {"FORENOON" | "AFTERNOON"} slot
 * @property {number} subjectId
 * @property {number} semesterNumber
 */

/**
 * @typedef {Object} GeneratorInput
 * @property {ExamInput[]} exams
 * @property {"EVEN" | "ODD"} cycle
 * @property {string} startDate - YYYY-MM-DD
 * @property {string} endDate - YYYY-MM-DD
 * @property {Set<string>} [holidayDates]
 * @property {FixedAssignment[]} [fixedAssignments] - Placed first; subjects removed from queues
 */

/**
 * @typedef {Object} ScheduleEntry
 * @property {string} date
 * @property {"FORENOON" | "AFTERNOON"} slot
 * @property {number} subjectId
 * @property {number} semesterNumber
 */

/**
 * @typedef {{ success: true, schedule: ScheduleEntry[] }} GenerateOk
 * @typedef {{ success: false, rule: number, message: string }} GenerateFail
 * @typedef {GenerateOk | GenerateFail} GenerateResult
 */

/**
 * Get weekday dates between start and end (inclusive), excluding holidays and weekends.
 * @param {string} startDate
 * @param {string} endDate
 * @param {Set<string>} holidayDates
 * @returns {string[]}
 */
function getCandidateDays(startDate, endDate, holidayDates) {
  const out = [];
  const start = new Date(startDate + "T12:00:00Z");
  const end = new Date(endDate + "T12:00:00Z");
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidayDates.has(iso)) {
      out.push(iso);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * Deterministic schedule generator.
 * @param {GeneratorInput} input
 * @returns {GenerateResult}
 */
export function generate(input) {
  const {
    exams,
    cycle,
    startDate,
    endDate,
    holidayDates = new Set(),
    fixedAssignments = [],
  } = input;

  const schedule = [];
  const assignedSubjectIds = new Set();

  for (const fa of fixedAssignments) {
    schedule.push({
      date: fa.date,
      slot: fa.slot,
      subjectId: fa.subjectId,
      semesterNumber: fa.semesterNumber,
    });
    assignedSubjectIds.add(fa.subjectId);
    const v = validateSchedule(schedule, cycle, holidayDates);
    if (!v.success) return { success: false, rule: v.rule, message: v.message };
  }

  const usedDateSlots = new Set(schedule.map((e) => `${e.date}:${e.slot}`));

  const candidateDays = getCandidateDays(startDate, endDate, holidayDates);

  const forenoonQueue = [];
  const afternoonQueue = [];
  for (const e of exams) {
    if (assignedSubjectIds.has(e.subjectId)) continue;
    const parity = getParity(e.semesterNumber);
    if (parity === cycle) {
      forenoonQueue.push(e);
    } else {
      afternoonQueue.push(e);
    }
  }

  const sortKey = (e) => [e.semesterNumber, e.subjectId].join(",");
  forenoonQueue.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  afternoonQueue.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  let dayIndex = 0;

  while (
    dayIndex < candidateDays.length &&
    (forenoonQueue.length > 0 || afternoonQueue.length > 0)
  ) {
    const date = candidateDays[dayIndex];
    const forenoonKey = `${date}:FORENOON`;
    const afternoonKey = `${date}:AFTERNOON`;

    if (!usedDateSlots.has(forenoonKey) && forenoonQueue.length > 0) {
      const exam = forenoonQueue.shift();
      schedule.push({
        date,
        slot: "FORENOON",
        subjectId: exam.subjectId,
        semesterNumber: exam.semesterNumber,
      });
      usedDateSlots.add(forenoonKey);
      const v = validateSchedule(schedule, cycle, holidayDates);
      if (!v.success) return { success: false, rule: v.rule, message: v.message };
    }

    if (!usedDateSlots.has(afternoonKey) && afternoonQueue.length > 0) {
      const exam = afternoonQueue.shift();
      schedule.push({
        date,
        slot: "AFTERNOON",
        subjectId: exam.subjectId,
        semesterNumber: exam.semesterNumber,
      });
      usedDateSlots.add(afternoonKey);
      const v = validateSchedule(schedule, cycle, holidayDates);
      if (!v.success) return { success: false, rule: v.rule, message: v.message };
    }

    dayIndex++;
  }

  if (forenoonQueue.length > 0 || afternoonQueue.length > 0) {
    return {
      success: false,
      rule: 8,
      message: "Not enough candidate days to schedule all exams (max 2 per day).",
    };
  }

  return { success: true, schedule };
}
