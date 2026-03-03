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
  `CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    semester_id INTEGER NOT NULL REFERENCES semesters(id)
  )`,
  `CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    label TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS schedule_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_number INTEGER NOT NULL,
    cycle TEXT NOT NULL CHECK(cycle IN ('EVEN', 'ODD')),
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published'))
  )`,
  `CREATE TABLE IF NOT EXISTS exam_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_version_id INTEGER NOT NULL REFERENCES schedule_versions(id),
    date TEXT NOT NULL,
    slot TEXT NOT NULL CHECK(slot IN ('FORENOON', 'AFTERNOON')),
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    UNIQUE(schedule_version_id, date, slot)
  )`,
];

function ensureDb() {
  const dir = dirname(SQLITE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const dbExists = existsSync(SQLITE_PATH);
  const sqlite = new Database(SQLITE_PATH);

  for (const sql of DDL) {
    sqlite.run(sql);
  }

  // Migrate: drop subject_type if present (SQLite 3.35+)
  try {
    const info = sqlite.prepare("PRAGMA table_info(subjects)").all();
    if (info.some((col) => col.name === "subject_type")) {
      sqlite.run("ALTER TABLE subjects RENAME TO subjects_old");
      sqlite.run(`CREATE TABLE subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        semester_id INTEGER NOT NULL REFERENCES semesters(id)
      )`);
      sqlite.run("INSERT INTO subjects (id, code, name, semester_id) SELECT id, code, name, semester_id FROM subjects_old");
      sqlite.run("DROP TABLE subjects_old");
    }
  } catch (_) {}

  // Seed 8 semesters (4 years) if empty
  const count = sqlite.prepare("SELECT COUNT(*) as n FROM semesters").get();
  if (count && count.n === 0) {
    const insert = sqlite.prepare("INSERT INTO semesters (name, semester_number) VALUES (?, ?)");
    for (let i = 1; i <= 8; i++) {
      insert.run(`Semester ${i}`, i);
    }
  }

  sqlite.close();

  return { created: !dbExists, path: SQLITE_PATH };
}

ensureDb();

export { ensureDb };
