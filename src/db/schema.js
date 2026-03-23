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

export const departments = sqliteTable("departments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  degreePrefix: text("degree_prefix").notNull(),
  displayOrder: integer("display_order").notNull(),
});

export const subjects = sqliteTable("subjects", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  semesterId: integer("semester_id")
    .notNull()
    .references(() => semesters.id),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  isElective: integer("is_elective", { mode: "boolean" }).notNull().default(false),
  electiveGroupId: text("elective_group_id"),
});

export const subjectDepartments = sqliteTable("subject_departments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subjectCode: text("subject_code")
    .notNull()
    .references(() => subjects.code),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
});

export const holidays = sqliteTable("holidays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  label: text("label"),
});

export const scheduleVersions = sqliteTable("schedule_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  versionNumber: integer("version_number").notNull(),
  name: text("name"),
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
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
  }
);

export const exportTemplates = sqliteTable("export_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scheduleVersionId: integer("schedule_version_id")
    .notNull()
    .references(() => scheduleVersions.id),
  collegeName: text("college_name").notNull(),
  examTitle: text("exam_title").notNull(),
  regulation: text("regulation").notNull(),
  creditSystem: text("credit_system").notNull(),
  degree: text("degree").notNull(),
  batchYears: text("batch_years").notNull(),
  fnTiming: text("fn_timing").notNull().default("09.30 am to 12.30 pm"),
  anTiming: text("an_timing").notNull().default("01.30 pm to 04.30 pm"),
  publishedDate: text("published_date"),
  controllerName: text("controller_name"),
  principalName: text("principal_name"),
});
