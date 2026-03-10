import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

export const semesters = sqliteTable("semesters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  semesterNumber: integer("semester_number").notNull(),
});

export const subjects = sqliteTable("subjects", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  semesterId: integer("semester_id")
    .notNull()
    .references(() => semesters.id),
});

export const holidays = sqliteTable("holidays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  label: text("label"),
});

export const scheduleVersions = sqliteTable("schedule_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  versionNumber: integer("version_number").notNull(),
  cycle: text("cycle", { enum: ["EVEN", "ODD"] }).notNull(),
  createdAt: text("created_at").notNull(),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
});

export const examSlots = sqliteTable(
  "exam_slots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scheduleVersionId: integer("schedule_version_id")
      .notNull()
      .references(() => scheduleVersions.id),
    date: text("date").notNull(),
    slot: text("slot", { enum: ["FORENOON", "AFTERNOON"] }).notNull(),
    subjectCode: text("subject_code")
      .notNull()
      .references(() => subjects.code),
  }
);
