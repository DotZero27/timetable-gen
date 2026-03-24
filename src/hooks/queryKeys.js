export const queryKeys = {
  schedules: {
    all: ["schedules"],
    detail: (id) => ["schedules", id],
  },
  semesters: {
    all: ["semesters"],
  },
  departments: {
    all: ["departments"],
  },
  subjects: {
    all: ["subjects"],
    list: (semesterId) => (semesterId != null && semesterId !== "" ? ["subjects", semesterId] : ["subjects"]),
  },
  holidays: {
    all: ["holidays"],
    range: (from, to) => (from && to ? ["holidays", from, to] : ["holidays"]),
  },
  exportTemplates: {
    detail: (versionId) => ["exportTemplates", versionId],
  },
};
