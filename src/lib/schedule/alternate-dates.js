/**
 * Returns the next N valid exam dates (weekdays, not in holidays) starting from startDate.
 * Used to suggest alternate dates when generation fails (e.g. rule 7).
 * @param {string} startDate - YYYY-MM-DD
 * @param {number} count
 * @param {Set<string>} holidayDates - YYYY-MM-DD
 * @returns {string[]}
 */
export function getNextValidExamDates(startDate, count, holidayDates = new Set()) {
  const out = [];
  const d = new Date(startDate + "T12:00:00Z");
  while (out.length < count) {
    const day = d.getUTCDay();
    const iso = d.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidayDates.has(iso)) {
      out.push(iso);
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
