# Schedule generation

The schedule is produced by a **deterministic** generator that follows institutional policy rules. It does not use optimization algorithms; it places exams in order and aborts on the first validation failure.

## Generator

**Module**: [src/lib/schedule/generator.js](src/lib/schedule/generator.js)

### Input (`GeneratorInput`)

| Field | Type | Description |
|-------|------|-------------|
| `exams` | `{ subjectId, semesterNumber }[]` | Exams to schedule. |
| `cycle` | `"EVEN"` \| `"ODD"` | Current exam cycle. |
| `startDate` | string | Start of date range (YYYY-MM-DD). |
| `endDate` | string | End of date range (YYYY-MM-DD). |
| `holidayDates` | `Set<string>` | Optional. Dates (YYYY-MM-DD) to exclude (no exams). |
| `fixedAssignments` | `FixedAssignment[]` | Optional. Pre-placed exams; each has `date`, `slot`, `subjectId`, `semesterNumber`. These are applied first and their subjects are removed from the queues. |
| `semesterGapDays` | number | Optional. Minimum number of days between two exams of the same semester (`0` allows consecutive days). |
| `pairRotationMode` | `"AVAILABLE_ONLY"` \| `"FULL_CYCLE"` | Optional. Controls whether missing semester-pairs are skipped or kept in rotation. Default is `AVAILABLE_ONLY`. |

### Algorithm outline

1. **Fixed assignments**  
   Apply each fixed assignment to the schedule and mark those subjects as assigned. After each add, run the full validator; on failure, return immediately with the rule and message.

2. **Candidate days**  
   Build the list of weekdays between `startDate` and `endDate` (inclusive), excluding weekends (Sat/Sun) and any date in `holidayDates`, via `getCandidateDays()`.

3. **Queues by semester**  
   For each exam not in fixed assignments, group into queues keyed by `semesterNumber` and sort by `subjectId` (deterministic order).

4. **Placement**  
   Place queue entries across candidate days in order with hard constraints and cycle-pair pattern:
   - EVEN cycle pair order: `(2 FN, 1 AN) -> (4 FN, 3 AN) -> (6 FN, 5 AN) -> (8 FN, 7 AN)` then repeat.
   - ODD cycle pair order: `(1 FN, 2 AN) -> (3 FN, 4 AN) -> (5 FN, 6 AN) -> (7 FN, 8 AN)` then repeat.
   - Pair rotation mode:
     - `AVAILABLE_ONLY` skips pairs with no pending exams.
     - `FULL_CYCLE` keeps all pair turns, even when a pair has no pending exams.
   - Current cycle parity subjects are placed only in `FORENOON`; opposite parity only in `AFTERNOON`.
   - A semester can appear only once per date (either forenoon or afternoon, not both).
   - A date+slot can contain only one semester.
   - Semesters 1 and 2 are first-year common and are treated as common across departments.
   - Repeated exams of the same semester must keep at least `semesterGapDays` between dates.
   After each placement, run full validation; on failure, return immediately.

5. **Failure**  
   If any exam remains in either queue after consuming all candidate days, return failure with **rule 8**: "Not enough candidate days to schedule all exams."

### Output (`GenerateResult`)

- **Success**: `{ success: true, schedule: ScheduleEntry[] }`  
  Each entry: `{ date, slot, subjectId, semesterNumber }`.
- **Failure**: `{ success: false, rule: number, message: string }`  
  `rule` is the validator rule number that failed.

## Validation rules

**Module**: [src/lib/schedule/validate.js](src/lib/schedule/validate.js)

The validator runs after each placement (and on the initial fixed assignments). It checks all entries in the schedule. Abort on first failure.

| Rule | Description |
|------|-------------|
| 1 | Slot must be `FORENOON` or `AFTERNOON`. |
| 4 | Parity consistency: for each entry, `getParity(semesterNumber)` must match the expected parity (even semester → EVEN, odd → ODD). |
| 5 | In an EVEN cycle, FORENOON may only contain subjects whose semester parity is EVEN; in an ODD cycle, FORENOON may only contain ODD-parity subjects. |
| 6 | On any day that has two slots filled, one must be EVEN and one ODD (no same-parity pair in one day). |
| 7 | No exams on weekends (Saturday/Sunday) or on dates in `holidayDates`. |
| 8 | A semester can have at most one exam per date; all subjects in a date+slot must belong to the same semester. (Also used by the generator when there are not enough candidate days to place all exams.) |
| 9 | Elective/common/department slot conflicts: electives are exclusive in a slot; semesters 1 and 2 are common across departments; for semester 3+ no department can appear twice in the same slot. |
| 10 | For each semester, consecutive exam dates must satisfy the configured minimum `semesterGapDays`. |

Rules 2 and 3 are not used in the current code; the numbering is kept for compatibility with existing failure handling.

## Domain helpers

**Module**: [src/lib/domain.js](src/lib/domain.js)

- **getParity(semesterNumber)**  
  Returns `"EVEN"` if `semesterNumber % 2 === 0`, else `"ODD"`.  
  This defines which slot type (forenoon vs afternoon) a semester uses in a given cycle and is used by both the generator and the validator.
