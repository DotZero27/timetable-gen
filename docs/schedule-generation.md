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

### Algorithm outline

1. **Fixed assignments**  
   Apply each fixed assignment to the schedule and mark those subjects as assigned. After each add, run the full validator; on failure, return immediately with the rule and message.

2. **Candidate days**  
   Build the list of weekdays between `startDate` and `endDate` (inclusive), excluding weekends (Sat/Sun) and any date in `holidayDates`, via `getCandidateDays()`.

3. **Queues**  
   For each exam not in fixed assignments, compute parity with [getParity(semesterNumber)](../src/lib/domain.js): even semester number → EVEN, odd → ODD.  
   - If parity matches `cycle`, add to the **forenoon** queue.  
   - Otherwise add to the **afternoon** queue.  
   Sort both queues by `(semesterNumber, subjectId)` (deterministic order).

4. **Placement**  
   Iterate over candidate days in order. For each day:  
   - If the forenoon slot is free and the forenoon queue is non-empty, take the next exam from the forenoon queue, assign it to that date and FORENOON, add to schedule, validate. On validation failure, return.  
   - If the afternoon slot is free and the afternoon queue is non-empty, do the same for AFTERNOON.  
   Then move to the next day.

5. **Failure**  
   If any exam remains in either queue after consuming all candidate days, return failure with **rule 8**: “Not enough candidate days to schedule all exams (max 2 per day).”

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
| 8 | At most two exams per day; at most one exam per slot per day. (Also used by the generator when there are not enough candidate days to place all exams.) |

Rules 2 and 3 are not used in the current code; the numbering is kept for compatibility with existing failure handling.

## Domain helpers

**Module**: [src/lib/domain.js](src/lib/domain.js)

- **getParity(semesterNumber)**  
  Returns `"EVEN"` if `semesterNumber % 2 === 0`, else `"ODD"`.  
  This defines which slot type (forenoon vs afternoon) a semester uses in a given cycle and is used by both the generator and the validator.
