/**
 * Deterministic scheduler. No optimization algorithms.
 * Follows institutional policy rules; aborts on first validation failure.
 */

import { getParity } from "../domain.js";
import { validateSchedule } from "./validate.js";
import { canCoexistInSlot } from "./slotRules.js";

/**
 * @typedef {Object} ExamInput
 * @property {string} subjectCode
 * @property {number} semesterNumber
 * @property {number} departmentId
 * @property {boolean} [isElective]
 * @property {string | null} [electiveGroupId]
 */

/**
 * @typedef {Object} FixedAssignment
 * @property {string} date - YYYY-MM-DD
 * @property {"FORENOON" | "AFTERNOON"} slot
 * @property {string} subjectCode
 * @property {number} semesterNumber
 * @property {number} departmentId
 * @property {boolean} [isElective]
 * @property {string | null} [electiveGroupId]
 */

/**
 * @typedef {Object} GeneratorInput
 * @property {ExamInput[]} exams
 * @property {"EVEN" | "ODD"} cycle
 * @property {string} startDate - YYYY-MM-DD
 * @property {string} endDate - YYYY-MM-DD
 * @property {Set<string>} [holidayDates]
 * @property {FixedAssignment[]} [fixedAssignments] - Placed first; subjects removed from queues
 * @property {number} [semesterGapDays]
 * @property {"AVAILABLE_ONLY" | "FULL_CYCLE"} [pairRotationMode]
 */

/**
 * @typedef {Object} ScheduleEntry
 * @property {string} date
 * @property {"FORENOON" | "AFTERNOON"} slot
 * @property {string} subjectCode
 * @property {number} semesterNumber
 * @property {number} departmentId
 * @property {boolean} [isElective]
 * @property {string | null} [electiveGroupId]
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
 * @param {string} isoDate
 * @returns {Date}
 */
function toUtcDate(isoDate) {
  return new Date(`${isoDate}T12:00:00Z`);
}

/**
 * Absolute day difference between two ISO dates.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function diffDays(a, b) {
  const ms = Math.abs(toUtcDate(a).getTime() - toUtcDate(b).getTime());
  return Math.round(ms / 86400000);
}

/**
 * @param {"EVEN" | "ODD"} cycle
 * @returns {{ forenoon: number[], afternoon: number[] }}
 */
function getPairOrders(cycle) {
  if (cycle === "EVEN") {
    return {
      forenoon: [2, 4, 6, 8],
      afternoon: [1, 3, 5, 7],
    };
  }
  return {
    forenoon: [1, 3, 5, 7],
    afternoon: [2, 4, 6, 8],
  };
}

/**
 * @param {ExamInput | FixedAssignment | ScheduleEntry} exam
 * @returns {string}
 */
function normalizeElectiveGroup(exam) {
  return String(exam.electiveGroupId ?? "").trim();
}

/**
 * @param {{subjectCode: string, departmentId: number}} exam
 * @returns {string}
 */
function getExamKey(exam) {
  return `${exam.subjectCode}::${exam.departmentId}`;
}

/**
 * @typedef {Object} PlacementUnit
 * @property {number} semesterNumber
 * @property {ExamInput[]} members
 * @property {string} sortKey
 * @property {string | null} [lockedDate]
 * @property {"FORENOON" | "AFTERNOON" | null} [lockedSlot]
 */

/**
 * Check if a subject can be placed in a given date+slot without conflicts.
 * @param {Map<string, ScheduleEntry[]>} slotMap - keyed by "date:slot"
 * @param {string} date
 * @param {string} slot
 * @param {number} semesterNumber
 * @param {ExamInput} exam
 * @param {ScheduleEntry[]} [provisionalEntries]
 * @returns {boolean}
 */
function canPlace(slotMap, date, slot, semesterNumber, exam, provisionalEntries = []) {
  const key = `${date}:${slot}`;
  const entries = [...(slotMap.get(key) ?? []), ...provisionalEntries];
  const otherSlot = slot === "FORENOON" ? "AFTERNOON" : "FORENOON";
  const otherEntries = slotMap.get(`${date}:${otherSlot}`) ?? [];

  // A semester can appear in only one slot for a date (can have parallel departments in same slot).
  if (otherEntries.some((e) => e.semesterNumber === semesterNumber)) return false;

  const result = canCoexistInSlot(entries, {
    subjectCode: exam.subjectCode,
    semesterNumber,
    departmentId: exam.departmentId,
    isElective: exam.isElective ?? false,
    electiveGroupId: exam.electiveGroupId ?? null,
  });
  return result.ok;
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
    semesterGapDays = 0,
    pairRotationMode = "AVAILABLE_ONLY",
  } = input;

  const schedule = [];
  const assignedExamKeys = new Set();
  /** @type {Map<string, { date: string, slot: "FORENOON" | "AFTERNOON" }>} */
  const fixedGroupAnchorMap = new Map();

  /** @type {Map<string, ScheduleEntry[]>} */
  const slotMap = new Map();
  /** @type {Map<number, string[]>} */
  const semesterDateMap = new Map();

  function addToSlotMap(entry) {
    const key = `${entry.date}:${entry.slot}`;
    const list = slotMap.get(key) ?? [];
    list.push(entry);
    slotMap.set(key, list);
  }

  /**
   * @param {ScheduleEntry} entry
   */
  function addSemesterDate(entry) {
    const dates = semesterDateMap.get(entry.semesterNumber) ?? [];
    dates.push(entry.date);
    semesterDateMap.set(entry.semesterNumber, dates);
  }

  /**
   * @param {number} semesterNumber
   * @param {string} date
   * @returns {boolean}
   */
  function respectsSemesterGap(semesterNumber, date) {
    if (semesterGapDays <= 0) return true;
    const dates = semesterDateMap.get(semesterNumber) ?? [];
    return dates.every((existing) => diffDays(existing, date) > semesterGapDays);
  }

  // Place fixed assignments first
  for (const fa of fixedAssignments) {
    const fixedGroupId = normalizeElectiveGroup(fa);
    if (fa.isElective === true && fixedGroupId) {
      const groupKey = `${fa.semesterNumber}:${fixedGroupId}`;
      const existingAnchor = fixedGroupAnchorMap.get(groupKey);
      if (
        existingAnchor &&
        (existingAnchor.date !== fa.date || existingAnchor.slot !== fa.slot)
      ) {
        return {
          success: false,
          rule: 9,
          message: `Conflicting fixed assignments for elective group ${fixedGroupId} in semester ${fa.semesterNumber}.`,
        };
      }
      fixedGroupAnchorMap.set(groupKey, { date: fa.date, slot: fa.slot });
    }
    const entry = {
      date: fa.date,
      slot: fa.slot,
      subjectCode: fa.subjectCode,
      semesterNumber: fa.semesterNumber,
      departmentId: fa.departmentId,
      isElective: fa.isElective ?? false,
      electiveGroupId: fa.electiveGroupId ?? null,
    };
    schedule.push(entry);
    addToSlotMap(entry);
    addSemesterDate(entry);
    assignedExamKeys.add(getExamKey(fa));
    const v = validateSchedule(schedule, cycle, holidayDates, semesterGapDays);
    if (!v.success) return { success: false, rule: v.rule, message: v.message };
  }

  const candidateDays = getCandidateDays(startDate, endDate, holidayDates);

  /** @type {Map<number, PlacementUnit[]>} */
  const queuesBySemester = new Map();
  /** @type {Map<string, ExamInput[]>} */
  const groupedElectives = new Map();
  for (const e of exams) {
    if (assignedExamKeys.has(getExamKey(e))) continue;
    const groupId = normalizeElectiveGroup(e);
    if (e.isElective === true && groupId) {
      const gKey = `${e.semesterNumber}:${groupId}`;
      const grouped = groupedElectives.get(gKey) ?? [];
      grouped.push(e);
      groupedElectives.set(gKey, grouped);
      continue;
    }
    const units = queuesBySemester.get(e.semesterNumber) ?? [];
    units.push({
      semesterNumber: e.semesterNumber,
      members: [e],
      sortKey: e.subjectCode,
    });
    queuesBySemester.set(e.semesterNumber, units);
  }

  for (const [groupKey, members] of groupedElectives) {
    const [semesterPart] = groupKey.split(":");
    const semesterNumber = Number(semesterPart);
    const units = queuesBySemester.get(semesterNumber) ?? [];
    const groupId = normalizeElectiveGroup(members[0]);
    const anchor = fixedGroupAnchorMap.get(`${semesterNumber}:${groupId}`);
    units.push({
      semesterNumber,
      members: [...members].sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)),
      sortKey: members.map((m) => m.subjectCode).sort().join("|"),
      lockedDate: anchor?.date ?? null,
      lockedSlot: anchor?.slot ?? null,
    });
    queuesBySemester.set(semesterNumber, units);
  }

  for (const [, queue] of queuesBySemester) {
    queue.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }

  /**
   * Attempts placing one placement unit from target semester in a slot.
   * @param {number} targetSemester
   * @param {"FORENOON" | "AFTERNOON"} slotName
   * @param {string} date
   * @returns {GenerateFail | null}
   */
  function placeOneForSemester(targetSemester, slotName, date) {
    const queue = queuesBySemester.get(targetSemester) ?? [];
    for (let i = 0; i < queue.length; i++) {
      const unit = queue[i];
      const anchorDate = unit.lockedDate ?? null;
      const anchorSlot = unit.lockedSlot ?? null;
      if (anchorDate && date !== anchorDate) continue;
      if (anchorSlot && slotName !== anchorSlot) continue;

      const parity = getParity(unit.semesterNumber);
      const expectedSlot = parity === cycle ? "FORENOON" : "AFTERNOON";
      if (expectedSlot !== slotName) continue;
      if (!respectsSemesterGap(unit.semesterNumber, date)) continue;

      /** @type {ScheduleEntry[]} */
      const provisionalEntries = [];
      let canPlaceUnit = true;
      for (const member of unit.members) {
        if (
          !canPlace(
            slotMap,
            date,
            slotName,
            member.semesterNumber,
            member,
            provisionalEntries
          )
        ) {
          canPlaceUnit = false;
          break;
        }
        provisionalEntries.push({
          date,
          slot: slotName,
          subjectCode: member.subjectCode,
          semesterNumber: member.semesterNumber,
          departmentId: member.departmentId,
          isElective: member.isElective ?? false,
          electiveGroupId: member.electiveGroupId ?? null,
        });
      }
      if (canPlaceUnit) {
        for (const entry of provisionalEntries) {
          schedule.push(entry);
          addToSlotMap(entry);
          addSemesterDate(entry);
          assignedExamKeys.add(getExamKey(entry));
        }
        queue.splice(i, 1);
        queuesBySemester.set(targetSemester, queue);
        const v = validateSchedule(schedule, cycle, holidayDates, semesterGapDays);
        if (!v.success) return { success: false, rule: v.rule, message: v.message };
        return null;
      }
    }
    return null;
  }

  const pairOrders = getPairOrders(cycle);
  const basePairs = pairOrders.forenoon.map((forenoonSemester, idx) => ({
    forenoon: forenoonSemester,
    afternoon: pairOrders.afternoon[idx],
  }));
  let pairCursor = 0;

  /**
   * @returns {{ forenoon: number, afternoon: number }[]}
   */
  function getActivePairs() {
    if (pairRotationMode === "FULL_CYCLE") return basePairs;
    return basePairs.filter((pair) => {
      const fnQueue = queuesBySemester.get(pair.forenoon) ?? [];
      const anQueue = queuesBySemester.get(pair.afternoon) ?? [];
      return fnQueue.length > 0 || anQueue.length > 0;
    });
  }

  for (let dayIdx = 0; dayIdx < candidateDays.length; dayIdx++) {
    const date = candidateDays[dayIdx];
    const activePairs = getActivePairs();
    if (activePairs.length === 0) break;
    const pair = activePairs[pairCursor % activePairs.length];
    pairCursor += 1;

    const fnFail = placeOneForSemester(pair.forenoon, "FORENOON", date);
    if (fnFail) return fnFail;

    const anFail = placeOneForSemester(pair.afternoon, "AFTERNOON", date);
    if (anFail) return anFail;
  }

  const hasRemaining = Array.from(queuesBySemester.values()).some((queue) => queue.length > 0);
  if (hasRemaining) {
    return {
      success: false,
      rule: 8,
      message: "Not enough candidate days to schedule all exams.",
    };
  }

  return { success: true, schedule };
}
