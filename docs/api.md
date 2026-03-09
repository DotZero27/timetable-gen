# API reference

All endpoints are Next.js API routes under `src/app/api/`. Persistence is SQLite via Drizzle; there is no authentication.

Base URL is the app origin (e.g. `http://localhost:3000`). Responses are JSON. Errors return a JSON body with an `error` (and sometimes `rule`) field and an appropriate HTTP status.

## Schedules

### GET /api/schedules

List schedule versions, newest first.

**Query**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Optional. If `"published"`, only return versions with status `published`. |

**Response (200)**  
Array of schedule version objects:

- `id` (number)
- `versionNumber` (number)
- `cycle` (`"EVEN"` \| `"ODD"`)
- `createdAt` (string, ISO)
- `status` (`"draft"` \| `"published"`)

**Error**  
500 with `{ error: string }`.

---

### POST /api/schedules/generate

Generate a new schedule and persist it as a draft version.

**Body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cycle` | `"EVEN"` \| `"ODD"` | Yes | Exam cycle parity. |
| `startDate` | string | Yes | Start of date range (YYYY-MM-DD). |
| `endDate` | string | Yes | End of date range (YYYY-MM-DD). |
| `subjectIds` | number[] | Conditional | Subject IDs to include. Use this **or** `semesterIds`. |
| `semesterIds` | number[] | Conditional | Semester IDs; all subjects in these semesters are included. Use this **or** `subjectIds`. |
| `fixedAssignments` | array | No | Pre-placed exams. Each item: `{ date, slot, subjectId }` (`date` YYYY-MM-DD, `slot` FORENOON \| AFTERNOON). |

**Response (200)**

- `versionId` (number)
- `versionNumber` (number)
- `schedule` (array of `{ date, slot, subjectId, semesterNumber }`)

**Errors**

- 400: Missing or invalid body (e.g. `cycle`/`startDate`/`endDate` required, `cycle` must be EVEN or ODD, must provide subjectIds or semesterIds, no subjects found, or generator failed with `{ error, rule }`).
- 500: `{ error: string }`.

---

### GET /api/schedules/[versionId]

Get one schedule version with its exam slots (including subject code, name, and semester number).

**Response (200)**  
Single object: all fields of the schedule version plus `examSlots`, an array of:

- `id`, `date`, `slot`, `subjectId`, `subjectCode`, `subjectName`, `semesterNumber`

Slots are ordered by date then slot.

**Errors**

- 400: Invalid version id.
- 404: Schedule version not found.
- 500: `{ error: string }`.

---

### POST /api/schedules/[versionId]/publish

Set the version’s status to `published`. Only draft versions can be published; published versions are immutable.

**Response (200)**  
`{ success: true, status: "published" }`.

**Errors**

- 400: Invalid version id, or version not found, or version already published.
- 404: Schedule version not found.
- 500: `{ error: string }`.

---

## Semesters

### GET /api/semesters

List all semesters, ordered by semester number.

**Response (200)**  
Array of `{ id, name, semesterNumber }`.

**Error**  
500 with `{ error: string }`.

---

### POST /api/semesters

Create a semester.

**Body (JSON)**

- `name` (string, required)
- `semesterNumber` (number, required)

**Response (200)**  
The inserted row: `{ id, name, semesterNumber }`.

**Error**  
400 if `name` or `semesterNumber` missing/invalid; 500 otherwise.

---

## Subjects

### GET /api/subjects

List subjects, optionally filtered by semester.

**Query**

| Parameter | Type | Description |
|-----------|------|-------------|
| `semesterId` | number (query string) | Optional. If set, only subjects for this semester. |

**Response (200)**  
Array of `{ id, code, name, semesterId }`.

**Error**  
500 with `{ error: string }`.

---

### POST /api/subjects

Create a subject.

**Body (JSON)**

- `code` (string, required)
- `name` (string, required)
- `semesterId` (number, required)

**Response (200)**  
The inserted row: `{ id, code, name, semesterId }`.

**Error**  
400 if any required field missing; 500 otherwise.

---

## Holidays

### GET /api/holidays

List holidays, optionally filtered by date range.

**Query**

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string | Optional. Start date (YYYY-MM-DD). |
| `to` | string | Optional. End date (YYYY-MM-DD). If both `from` and `to` are set, only holidays in this range are returned. |

**Response (200)**  
Array of `{ id, date, label }`.

**Error**  
500 with `{ error: string }`.

---

### POST /api/holidays

Create a holiday.

**Body (JSON)**

- `date` (string, required, YYYY-MM-DD)
- `label` (string, optional)

**Response (200)**  
The inserted row: `{ id, date, label }`.

**Error**  
400 if `date` missing; 500 otherwise.
