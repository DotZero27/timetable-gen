import { describe, expect, test } from "bun:test";
import { validateSchedule } from "./validate.js";
import { generate } from "./generator.js";

describe("elective group slot rules", () => {
  test("validateSchedule allows semester 1 parallel exams for different departments", () => {
    const schedule = [
      {
        date: "2026-05-11",
        slot: "AFTERNOON",
        subjectCode: "UMA1111",
        semesterNumber: 1,
        departmentId: 7,
        isElective: false,
      },
      {
        date: "2026-05-11",
        slot: "AFTERNOON",
        subjectCode: "UMA1112",
        semesterNumber: 1,
        departmentId: 8,
        isElective: false,
      },
    ];

    const result = validateSchedule(schedule, "EVEN", new Set(), 0);
    expect(result).toEqual({ success: true });
  });

  test("validateSchedule allows same-group electives in one slot", () => {
    const schedule = [
      {
        date: "2026-05-12",
        slot: "FORENOON",
        subjectCode: "EL601A",
        semesterNumber: 6,
        departmentId: 1,
        isElective: true,
        electiveGroupId: "SEM6-OE-A",
      },
      {
        date: "2026-05-12",
        slot: "FORENOON",
        subjectCode: "EL602A",
        semesterNumber: 6,
        departmentId: 2,
        isElective: true,
        electiveGroupId: "SEM6-OE-A",
      },
    ];

    const result = validateSchedule(schedule, "EVEN", new Set(), 0);
    expect(result).toEqual({ success: true });
  });

  test("validateSchedule rejects non-elective mixed with grouped elective slot", () => {
    const schedule = [
      {
        date: "2026-05-12",
        slot: "FORENOON",
        subjectCode: "EL601A",
        semesterNumber: 6,
        departmentId: 1,
        isElective: true,
        electiveGroupId: "SEM6-OE-A",
      },
      {
        date: "2026-05-12",
        slot: "FORENOON",
        subjectCode: "CE603",
        semesterNumber: 6,
        departmentId: 3,
        isElective: false,
        electiveGroupId: null,
      },
    ];
    const result = validateSchedule(schedule, "EVEN", new Set(), 0);
    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.rule).toBe(9);
    }
  });

  test("validateSchedule allows grouped electives from same department in one slot", () => {
    const schedule = [
      {
        date: "2026-05-12",
        slot: "FORENOON",
        subjectCode: "EL601A",
        semesterNumber: 6,
        departmentId: 1,
        isElective: true,
        electiveGroupId: "SEM6-OE-A",
      },
      {
        date: "2026-05-12",
        slot: "FORENOON",
        subjectCode: "EL602A",
        semesterNumber: 6,
        departmentId: 1,
        isElective: true,
        electiveGroupId: "SEM6-OE-A",
      },
    ];
    const result = validateSchedule(schedule, "EVEN", new Set(), 0);
    expect(result).toEqual({ success: true });
  });

  test("validateSchedule rejects different elective groups in one slot", () => {
    const schedule = [
      {
        date: "2026-05-12",
        slot: "FORENOON",
        subjectCode: "EL601A",
        semesterNumber: 6,
        departmentId: 1,
        isElective: true,
        electiveGroupId: "SEM6-OE-A",
      },
      {
        date: "2026-05-12",
        slot: "FORENOON",
        subjectCode: "EL602B",
        semesterNumber: 6,
        departmentId: 2,
        isElective: true,
        electiveGroupId: "SEM6-OE-B",
      },
    ];

    const result = validateSchedule(schedule, "EVEN", new Set(), 0);
    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.rule).toBe(9);
    }
  });

  test("validateSchedule keeps legacy strict behavior for ungrouped electives", () => {
    const schedule = [
      {
        date: "2026-05-12",
        slot: "FORENOON",
        subjectCode: "EL601A",
        semesterNumber: 6,
        departmentId: 1,
        isElective: true,
        electiveGroupId: null,
      },
      {
        date: "2026-05-12",
        slot: "FORENOON",
        subjectCode: "EL602A",
        semesterNumber: 6,
        departmentId: 2,
        isElective: true,
        electiveGroupId: null,
      },
    ];

    const result = validateSchedule(schedule, "EVEN", new Set(), 0);
    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.rule).toBe(9);
    }
  });

  test("validateSchedule rejects same elective group split across dates", () => {
    const schedule = [
      {
        date: "2026-05-12",
        slot: "FORENOON",
        subjectCode: "EL601A",
        semesterNumber: 6,
        departmentId: 1,
        isElective: true,
        electiveGroupId: "SEM6-OE-A",
      },
      {
        date: "2026-05-14",
        slot: "FORENOON",
        subjectCode: "EL602A",
        semesterNumber: 6,
        departmentId: 2,
        isElective: true,
        electiveGroupId: "SEM6-OE-A",
      },
    ];

    const result = validateSchedule(schedule, "EVEN", new Set(), 0);
    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.rule).toBe(9);
    }
  });

  test("generate can place same-group electives together in a single day", () => {
    const result = generate({
      cycle: "EVEN",
      startDate: "2026-05-12",
      endDate: "2026-05-12",
      holidayDates: new Set(),
      fixedAssignments: [
        {
          date: "2026-05-12",
          slot: "FORENOON",
          subjectCode: "EL601A",
          semesterNumber: 6,
          departmentId: 1,
          isElective: true,
          electiveGroupId: "SEM6-OE-A",
        },
      ],
      exams: [
        {
          subjectCode: "EL602A",
          semesterNumber: 6,
          departmentId: 2,
          isElective: true,
          electiveGroupId: "SEM6-OE-A",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schedule).toHaveLength(2);
      expect(result.schedule.every((entry) => entry.slot === "FORENOON")).toBe(true);
    }
  });

  test("generate schedules grouped electives atomically without fixed assignments", () => {
    const result = generate({
      cycle: "EVEN",
      startDate: "2026-05-12",
      endDate: "2026-05-14",
      holidayDates: new Set(),
      exams: [
        {
          subjectCode: "EL601A",
          semesterNumber: 6,
          departmentId: 1,
          isElective: true,
          electiveGroupId: "SEM6-OE-A",
        },
        {
          subjectCode: "EL602A",
          semesterNumber: 6,
          departmentId: 2,
          isElective: true,
          electiveGroupId: "SEM6-OE-A",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.schedule).toHaveLength(2);
      const uniqueDateSlots = new Set(result.schedule.map((entry) => `${entry.date}:${entry.slot}`));
      expect(uniqueDateSlots.size).toBe(1);
    }
  });

  test("generate rejects conflicting fixed assignments for same elective group", () => {
    const result = generate({
      cycle: "EVEN",
      startDate: "2026-05-12",
      endDate: "2026-05-14",
      holidayDates: new Set(),
      fixedAssignments: [
        {
          date: "2026-05-12",
          slot: "FORENOON",
          subjectCode: "EL601A",
          semesterNumber: 6,
          departmentId: 1,
          isElective: true,
          electiveGroupId: "SEM6-OE-A",
        },
        {
          date: "2026-05-14",
          slot: "FORENOON",
          subjectCode: "EL602A",
          semesterNumber: 6,
          departmentId: 2,
          isElective: true,
          electiveGroupId: "SEM6-OE-A",
        },
      ],
      exams: [],
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.rule).toBe(9);
    }
  });
});

