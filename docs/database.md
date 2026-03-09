# Database

## Schema source

- **Definition**: [src/db/schema.js](src/db/schema.js) (Drizzle ORM).
- **Creation and migrations**: [scripts/ensure-db.js](scripts/ensure-db.js) — creates the DB file and tables with raw SQL; includes an optional migration (e.g. dropping `subject_type` from `subjects` if present) and seeds 8 semesters when the table is empty.

## Tables

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `semesters` | Semester definitions (e.g. Semester 1–8) | `id`, `name`, `semester_number` |
| `subjects` | Subjects per semester | `id`, `code`, `name`, `semester_id` (FK → semesters) |
| `holidays` | Non-exam dates | `id`, `date`, `label` |
| `schedule_versions` | One record per generated schedule | `id`, `version_number`, `cycle` (EVEN/ODD), `created_at`, `status` (draft/published) |
| `exam_slots` | One record per scheduled exam | `id`, `schedule_version_id` (FK), `date`, `slot` (FORENOON/AFTERNOON), `subject_id` (FK). UNIQUE(schedule_version_id, date, slot) |

Drizzle exposes these with camelCase in JavaScript (e.g. `semesterNumber`, `scheduleVersionId`).

## Setup

- **Database file**: Controlled by `SQLITE_PATH`. Default is `.data/sqlite.db`. The directory is created if missing.
- **When tables are created**: `scripts/ensure-db.js` is run before `next dev` and `next start` (via `npm run dev` and `npm run start`). It runs the DDL statements and, if the `semesters` table is empty, inserts rows for Semester 1 through 8.

## Usage in the app

- **Entry point**: [src/db/index.js](src/db/index.js) exports `getDb()` and the schema.
- **Runtime**: Under Bun, `getDb()` uses `bun:sqlite`; under Node (e.g. Next.js), it uses `better-sqlite3`. Both are wired to Drizzle with the same schema.
- All API routes and the generator’s persistence use `getDb()` for reads and writes.
