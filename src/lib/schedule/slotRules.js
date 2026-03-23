/**
 * Shared slot compatibility rules used by generator, validator, and UI.
 */

/**
 * @typedef {Object} SlotEntry
 * @property {string} subjectCode
 * @property {number} semesterNumber
 * @property {number} departmentId
 * @property {boolean} [isElective]
 * @property {string | null} [electiveGroupId]
 */

/**
 * @typedef {"semester-mismatch" | "department-conflict" | "elective-group-conflict"} SlotConflictCode
 */

/**
 * @typedef {{ ok: true } | { ok: false, code: SlotConflictCode }} SlotCompatibilityResult
 */

/**
 * @param {SlotEntry} entry
 * @returns {string}
 */
function getElectiveGroup(entry) {
  return String(entry.electiveGroupId ?? "").trim();
}

/**
 * Checks whether one candidate can coexist with existing entries in same date+slot.
 * @param {SlotEntry[]} existingEntries
 * @param {SlotEntry} candidate
 * @returns {SlotCompatibilityResult}
 */
export function canCoexistInSlot(existingEntries, candidate) {
  if (existingEntries.length === 0) return { ok: true };

  if (existingEntries.some((entry) => entry.semesterNumber !== candidate.semesterNumber)) {
    return { ok: false, code: "semester-mismatch" };
  }

  const existingElectives = existingEntries.filter((entry) => entry.isElective === true);
  const existingNonElectives = existingEntries.filter((entry) => entry.isElective !== true);

  if (candidate.isElective === true) {
    const candidateGroup = getElectiveGroup(candidate);
    // Ungrouped electives always consume the full slot.
    if (!candidateGroup) {
      return { ok: false, code: "elective-group-conflict" };
    }
    // Grouped electives can only coexist with same-group electives.
    if (existingNonElectives.length > 0) {
      return { ok: false, code: "elective-group-conflict" };
    }
    if (
      existingElectives.some((entry) => {
        const group = getElectiveGroup(entry);
        return !group || group !== candidateGroup;
      })
    ) {
      return { ok: false, code: "elective-group-conflict" };
    }
    return { ok: true };
  }

  // Non-elective subjects cannot share slots with electives.
  if (existingElectives.length > 0) {
    return { ok: false, code: "elective-group-conflict" };
  }

  if (existingEntries.some((entry) => entry.departmentId === candidate.departmentId)) {
    return { ok: false, code: "department-conflict" };
  }

  return { ok: true };
}

