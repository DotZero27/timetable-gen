/**
 * Ensures the SQLite DB file exists and has all tables.
 * Creates .data/ and the DB file if missing, then runs schema DDL.
 * Must be run with Bun (uses bun:sqlite).
 */

import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";

const SQLITE_PATH = process.env.SQLITE_PATH || ".data/sqlite.db";

const DDL = [
  `CREATE TABLE IF NOT EXISTS semesters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    semester_number INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    degree_prefix TEXT NOT NULL,
    display_order INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS subjects (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    semester_id INTEGER NOT NULL REFERENCES semesters(id),
    department_id INTEGER NOT NULL REFERENCES departments(id),
    is_elective INTEGER NOT NULL DEFAULT 0,
    elective_group_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS subject_departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_code TEXT NOT NULL REFERENCES subjects(code),
    department_id INTEGER NOT NULL REFERENCES departments(id),
    UNIQUE(subject_code, department_id)
  )`,
  `CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    label TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS schedule_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_number INTEGER NOT NULL,
    name TEXT,
    cycle TEXT NOT NULL CHECK(cycle IN ('EVEN', 'ODD')),
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published'))
  )`,
  `CREATE TABLE IF NOT EXISTS exam_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_version_id INTEGER NOT NULL REFERENCES schedule_versions(id),
    date TEXT NOT NULL,
    slot TEXT NOT NULL CHECK(slot IN ('FORENOON', 'AFTERNOON')),
    subject_code TEXT NOT NULL REFERENCES subjects(code),
    department_id INTEGER NOT NULL REFERENCES departments(id),
    UNIQUE(schedule_version_id, date, slot, subject_code, department_id)
  )`,
  `CREATE TABLE IF NOT EXISTS export_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_version_id INTEGER NOT NULL REFERENCES schedule_versions(id),
    college_name TEXT NOT NULL,
    exam_title TEXT NOT NULL,
    regulation TEXT NOT NULL,
    credit_system TEXT NOT NULL,
    degree TEXT NOT NULL,
    batch_years TEXT NOT NULL,
    fn_timing TEXT NOT NULL DEFAULT '09.30 am to 12.30 pm',
    an_timing TEXT NOT NULL DEFAULT '01.30 pm to 04.30 pm',
    published_date TEXT,
    controller_name TEXT,
    principal_name TEXT
  )`,
];

const DEPARTMENT_SEEDS = [
  { code: "CIVIL", name: "Civil", degreePrefix: "B.E.", displayOrder: 1 },
  { code: "MECH", name: "Mechanical", degreePrefix: "B.E.", displayOrder: 2 },
  { code: "CHEM", name: "Chemical", degreePrefix: "B.Tech.", displayOrder: 3 },
  { code: "EEE", name: "Electrical and Electronics Engineering", degreePrefix: "B.E.", displayOrder: 4 },
  { code: "ECE", name: "Electronics and Communication Engineering", degreePrefix: "B.E.", displayOrder: 5 },
  { code: "BME", name: "Biomedical Engineering", degreePrefix: "B.E.", displayOrder: 6 },
  { code: "CSE", name: "Computer Science and Engineering", degreePrefix: "B.E.", displayOrder: 7 },
  { code: "IT", name: "Information Technology", degreePrefix: "B.Tech.", displayOrder: 8 },
];

function ensureDb() {
  const dir = dirname(SQLITE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const dbExists = existsSync(SQLITE_PATH);
  const sqlite = new Database(SQLITE_PATH);

  // --- Migrations for existing databases ---
  if (dbExists) {
    // Add name column to schedule_versions if missing
    const versionCols = sqlite.prepare("PRAGMA table_info(schedule_versions)").all();
    const hasNameCol = versionCols.some((c) => c.name === "name");
    if (!hasNameCol) {
      sqlite.run("ALTER TABLE schedule_versions ADD COLUMN name TEXT");
    }

    // Add department_id column to subjects if missing
    const subjectCols = sqlite.prepare("PRAGMA table_info(subjects)").all();
    const hasDeptCol = subjectCols.some((c) => c.name === "department_id");
    if (!hasDeptCol) {
      sqlite.run("ALTER TABLE subjects ADD COLUMN department_id INTEGER REFERENCES departments(id)");
    }

    // Add is_elective column to subjects if missing
    const subjectColsCheck = sqlite.prepare("PRAGMA table_info(subjects)").all();
    const hasElectiveCol = subjectColsCheck.some((c) => c.name === "is_elective");
    if (!hasElectiveCol) {
      sqlite.run("ALTER TABLE subjects ADD COLUMN is_elective INTEGER NOT NULL DEFAULT 0");
    }

    // Migrate department_id to NOT NULL if it's currently nullable
    const deptColInfo = subjectColsCheck.find((c) => c.name === "department_id");
    if (deptColInfo && deptColInfo.notnull === 0) {
      const hasElectiveGroupInOld = subjectColsCheck.some((c) => c.name === "elective_group_id");
      // Set any NULL department_id to first department (id=1)
      sqlite.run("UPDATE subjects SET department_id = 1 WHERE department_id IS NULL");
      // Recreate table with NOT NULL constraint
      sqlite.run("ALTER TABLE subjects RENAME TO subjects_old");
      sqlite.run(`CREATE TABLE subjects (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        semester_id INTEGER NOT NULL REFERENCES semesters(id),
        department_id INTEGER NOT NULL REFERENCES departments(id),
        is_elective INTEGER NOT NULL DEFAULT 0,
        elective_group_id TEXT
      )`);
      if (hasElectiveGroupInOld) {
        sqlite.run("INSERT INTO subjects SELECT code, name, semester_id, department_id, COALESCE(is_elective, 0), elective_group_id FROM subjects_old");
      } else {
        sqlite.run("INSERT INTO subjects SELECT code, name, semester_id, department_id, COALESCE(is_elective, 0), NULL FROM subjects_old");
      }
      sqlite.run("DROP TABLE subjects_old");
    }

    // Add elective_group_id column to subjects if missing
    const subjectColsAfterMigration = sqlite.prepare("PRAGMA table_info(subjects)").all();
    const hasElectiveGroupCol = subjectColsAfterMigration.some((c) => c.name === "elective_group_id");
    if (!hasElectiveGroupCol) {
      sqlite.run("ALTER TABLE subjects ADD COLUMN elective_group_id TEXT");
    }

    // Ensure subject_departments exists and backfill from legacy subjects.department_id.
    sqlite.run(`CREATE TABLE IF NOT EXISTS subject_departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_code TEXT NOT NULL REFERENCES subjects(code),
      department_id INTEGER NOT NULL REFERENCES departments(id),
      UNIQUE(subject_code, department_id)
    )`);
    sqlite.run(`INSERT OR IGNORE INTO subject_departments (subject_code, department_id)
      SELECT code, department_id FROM subjects WHERE department_id IS NOT NULL`);

    // Migrate exam_slots to include department_id and expanded uniqueness.
    const examSlotsCreate = sqlite
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='exam_slots'")
      .get();
    const examNeedsMigration =
      examSlotsCreate &&
      (!examSlotsCreate.sql.includes("department_id") ||
        examSlotsCreate.sql.includes("UNIQUE(schedule_version_id, date, slot)") ||
        examSlotsCreate.sql.includes("UNIQUE(schedule_version_id, date, slot, subject_code)"));
    if (examNeedsMigration) {
      const oldHasDept = examSlotsCreate.sql.includes("department_id");
      sqlite.run("ALTER TABLE exam_slots RENAME TO exam_slots_old");
      sqlite.run(`CREATE TABLE exam_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_version_id INTEGER NOT NULL REFERENCES schedule_versions(id),
        date TEXT NOT NULL,
        slot TEXT NOT NULL CHECK(slot IN ('FORENOON', 'AFTERNOON')),
        subject_code TEXT NOT NULL REFERENCES subjects(code),
        department_id INTEGER NOT NULL REFERENCES departments(id),
        UNIQUE(schedule_version_id, date, slot, subject_code, department_id)
      )`);
      if (oldHasDept) {
        sqlite.run(`INSERT INTO exam_slots (id, schedule_version_id, date, slot, subject_code, department_id)
          SELECT es.id, es.schedule_version_id, es.date, es.slot, es.subject_code,
            COALESCE(es.department_id, sd.department_id, s.department_id)
          FROM exam_slots_old es
          LEFT JOIN subject_departments sd ON sd.subject_code = es.subject_code
          LEFT JOIN subjects s ON s.code = es.subject_code`);
      } else {
        sqlite.run(`INSERT INTO exam_slots (id, schedule_version_id, date, slot, subject_code, department_id)
          SELECT es.id, es.schedule_version_id, es.date, es.slot, es.subject_code,
            COALESCE(sd.department_id, s.department_id)
          FROM exam_slots_old es
          LEFT JOIN subject_departments sd ON sd.subject_code = es.subject_code
          LEFT JOIN subjects s ON s.code = es.subject_code`);
      }
      sqlite.run("DROP TABLE exam_slots_old");
    }
  }

  for (const sql of DDL) {
    sqlite.run(sql);
  }

  // Seed 8 semesters (4 years) if empty
  const semCount = sqlite.prepare("SELECT COUNT(*) as n FROM semesters").get();
  if (semCount && semCount.n === 0) {
    const insert = sqlite.prepare("INSERT INTO semesters (name, semester_number) VALUES (?, ?)");
    for (let i = 1; i <= 8; i++) {
      insert.run(`Semester ${i}`, i);
    }
  }

  // Seed departments if empty
  const deptCount = sqlite.prepare("SELECT COUNT(*) as n FROM departments").get();
  if (deptCount && deptCount.n === 0) {
    const insert = sqlite.prepare(
      "INSERT INTO departments (code, name, degree_prefix, display_order) VALUES (?, ?, ?, ?)"
    );
    for (const dept of DEPARTMENT_SEEDS) {
      insert.run(dept.code, dept.name, dept.degreePrefix, dept.displayOrder);
    }
  }

  sqlite.close();

  return { created: !dbExists, path: SQLITE_PATH };
}

ensureDb();

export { ensureDb };
