import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
  SectionType,
  PageOrientation,
  TableLayoutType,
} from "docx";


// ── Data helpers ──────────────────────────────────────────────────────────────

function groupBySemester(examSlots) {
  const map = new Map();
  for (const slot of examSlots) {
    const sem = slot.semesterNumber;
    if (!map.has(sem)) map.set(sem, []);
    map.get(sem).push(slot);
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
}

function getDepartmentsForSemester(slots) {
  const seen = new Map();
  for (const slot of slots) {
    if (slot.departmentId && !seen.has(slot.departmentId)) {
      seen.set(slot.departmentId, {
        id: slot.departmentId,
        code: slot.departmentCode ?? String(slot.departmentId),
        name: slot.departmentName ?? String(slot.departmentId),
        degreePrefix: slot.departmentDegreePrefix ?? "B.E.",
        displayOrder: slot.departmentDisplayOrder ?? Infinity,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Check if all exam slots on every date+session have the same subjects across depts */
function isCommonSemester(slots, departments) {
  if (departments.length <= 1) return true;
  const byDateSlot = new Map();
  for (const s of slots) {
    const key = `${s.date}:${s.slot}`;
    if (!byDateSlot.has(key)) byDateSlot.set(key, new Set());
    byDateSlot.get(key).add(s.subjectCode);
  }
  for (const codes of byDateSlot.values()) {
    if (codes.size > 1) return false;
  }
  return true;
}

function buildRowMatrix(slots, departments) {
  const ordered = new Map();
  for (const slot of slots) {
    const key = `${slot.date}:${slot.slot}`;
    if (!ordered.has(key)) {
      ordered.set(key, { date: slot.date, slot: slot.slot, cells: new Map() });
    }
    const row = ordered.get(key);
    const deptId = slot.departmentId;
    if (!row.cells.has(deptId)) row.cells.set(deptId, []);
    row.cells.get(deptId).push(slot);
  }
  return [...ordered.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.slot === b.slot) return 0;
    return a.slot === "FORENOON" ? -1 : 1;
  });
}

function formatDateLabel(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayName = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}\n${dayName}`;
}

function cellText(entries) {
  if (entries.length === 0) return "";
  if (entries.length === 1) {
    const e = entries[0];
    return `${e.subjectCode} ${e.subjectName}${e.isTheoryCumPractical ? "*" : ""}`;
  }
  // Multiple subjects → codes only
  return entries
    .map((e) => `${e.subjectCode}${e.isTheoryCumPractical ? "*" : ""}`)
    .join("\n");
}

function toRoman(n) {
  return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"][n] ?? String(n);
}

// ── Border helpers ────────────────────────────────────────────────────────────

const THIN_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

const ALL_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

// ── Landscape page dimensions (in twips / DXA) ───────────────────────────────
// Letter landscape = 15840 x 12240 twips. With 0.5in (720 twip) margins on each side:
// usable width = 15840 - 720 - 720 = 14400 twips
const TOTAL_WIDTH = 14400;
const FONT_SIZE = 20; // 10pt in half-points
const FONT_SIZE_SMALL = 18; // 9pt
const FONT_SIZE_HEADER = 22; // 11pt

// ── Header paragraphs ─────────────────────────────────────────────────────────
// Reference PDF layout (5 centered lines):
// Line 1: College name (bold)
// Line 2: (An Autonomous Institution, Affiliated to Anna University, Chennai)
// Line 3: Exam title (bold)
// Line 4: Regulation: XXXX -- Choice Based Credit System (CBCS)
// Line 5: B.E. / B.Tech. (All Programmes) - Semester: I (Batch: 2021, 2022, 2023)

function buildHeaderParagraphs(template, semNum) {
  const t = template ?? {};
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: t.collegeName ?? "(College Name)",
          bold: true,
          size: 24, // 12pt
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: t.creditSystem ?? "(Autonomous, Affiliated to University)",
          size: FONT_SIZE_SMALL,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: t.examTitle ?? "(Exam Title)",
          bold: true,
          size: FONT_SIZE,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: `Regulation: ${t.regulation ?? "(Regulation)"} -- Choice Based Credit System (CBCS)`,
          size: FONT_SIZE_SMALL,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${t.degree ?? "B.E. / B.Tech. (All Programmes)"} - Semester: ${toRoman(semNum)} (Batch: ${t.batchYears ?? "(Batch Years)"})`,
          bold: true,
          size: FONT_SIZE_SMALL,
          font: "Times New Roman",
        }),
      ],
    }),
  ];
}

// ── Table builder ─────────────────────────────────────────────────────────────

function makeCell(text, opts = {}) {
  const {
    width,
    bold = false,
    rowSpan,
    fontSize = FONT_SIZE_SMALL,
    borders = ALL_BORDERS,
    alignment = AlignmentType.CENTER,
  } = opts;

  const lines = text.split("\n");
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    rowSpan,
    verticalAlign: VerticalAlign.CENTER,
    borders,
    children: lines.map(
      (line) =>
        new Paragraph({
          alignment,
          spacing: { before: 0, after: 0 },
          children: [
            new TextRun({
              text: line,
              bold,
              size: fontSize,
              font: "Times New Roman",
            }),
          ],
        })
    ),
  });
}

function buildCommonTable(rows) {
  // Semester I style: Date and Day | Session | Subject Code and Name
  const dateW = 2000;
  const sessW = 1000;
  const subjectW = TOTAL_WIDTH - dateW - sessW;

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeCell("Date and\nDay", { width: dateW, bold: true }),
      makeCell("Session", { width: sessW, bold: true }),
      makeCell("Subject Code and Name", { width: subjectW, bold: true }),
    ],
  });

  const dataRows = [];
  let i = 0;
  while (i < rows.length) {
    const currentDate = rows[i].date;
    let j = i;
    while (j < rows.length && rows[j].date === currentDate) j++;
    const sameDate = rows.slice(i, j);

    sameDate.forEach((row, idx) => {
      const cells = [];
      if (idx === 0) {
        cells.push(
          makeCell(formatDateLabel(row.date), {
            width: dateW,
            bold: true,
            rowSpan: sameDate.length,
          })
        );
      }
      cells.push(
        makeCell(row.slot === "FORENOON" ? "FN" : "AN", {
          width: sessW,
        })
      );
      // For common semester, all depts have same subject — pick first
      const allEntries = [...row.cells.values()].flat();
      const uniqueByCode = new Map();
      for (const e of allEntries) {
        if (!uniqueByCode.has(e.subjectCode)) uniqueByCode.set(e.subjectCode, e);
      }
      const uniqueEntries = [...uniqueByCode.values()];
      const text = cellText(uniqueEntries);
      cells.push(makeCell(text || "", { width: subjectW }));
      dataRows.push(new TableRow({ children: cells }));
    });
    i = j;
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...dataRows],
  });
}

function buildDepartmentTable(rows, departments) {
  const dateW = 1600;
  const sessW = 900;
  const remainingW = TOTAL_WIDTH - dateW - sessW;
  const deptColW = Math.floor(remainingW / departments.length);

  // Header row with dept names in "degreePrefix\nDeptName" format
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeCell("Date and\nDay", { width: dateW, bold: true }),
      makeCell("Session", { width: sessW, bold: true }),
      ...departments.map((dept) =>
        makeCell(`${dept.degreePrefix}\n${dept.name}`, {
          width: deptColW,
          bold: true,
        })
      ),
    ],
  });

  const dataRows = [];
  let i = 0;
  while (i < rows.length) {
    const currentDate = rows[i].date;
    let j = i;
    while (j < rows.length && rows[j].date === currentDate) j++;
    const sameDate = rows.slice(i, j);

    sameDate.forEach((row, idx) => {
      const cells = [];
      if (idx === 0) {
        cells.push(
          makeCell(formatDateLabel(row.date), {
            width: dateW,
            bold: true,
            rowSpan: sameDate.length,
          })
        );
      }
      cells.push(
        makeCell(row.slot === "FORENOON" ? "FN" : "AN", { width: sessW })
      );
      for (const dept of departments) {
        const entries = row.cells.get(dept.id) ?? [];
        cells.push(
          makeCell(cellText(entries) || "", { width: deptColW })
        );
      }
      dataRows.push(new TableRow({ children: cells }));
    });
    i = j;
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...dataRows],
  });
}

// ── Legend for multi-subject cells ────────────────────────────────────────────

function buildLegendParagraphs(slots, rows, departments, isCommon) {
  // Identify which date+session cells had >1 subject
  const multiSubjectEntries = [];

  for (const row of rows) {
    if (isCommon) {
      const allEntries = [...row.cells.values()].flat();
      const uniqueByCode = new Map();
      for (const e of allEntries) {
        if (!uniqueByCode.has(e.subjectCode)) uniqueByCode.set(e.subjectCode, e);
      }
      if (uniqueByCode.size > 1) {
        multiSubjectEntries.push(...uniqueByCode.values());
      }
    } else {
      for (const dept of departments) {
        const entries = row.cells.get(dept.id) ?? [];
        if (entries.length > 1) {
          multiSubjectEntries.push(...entries);
        }
      }
    }
  }

  if (multiSubjectEntries.length === 0) return [];

  // Deduplicate and group by electiveGroupId
  const seen = new Set();
  const byGroup = new Map();
  for (const e of multiSubjectEntries) {
    if (seen.has(e.subjectCode)) continue;
    seen.add(e.subjectCode);
    const groupKey = e.electiveGroupId ?? "__ungrouped__";
    if (!byGroup.has(groupKey)) byGroup.set(groupKey, []);
    byGroup.get(groupKey).push(e);
  }

  const paragraphs = [];
  for (const [, entries] of byGroup) {
    const detail = entries
      .map((e) => `${e.subjectCode} ${e.subjectName}`)
      .join("; ");
    paragraphs.push(
      new Paragraph({
        spacing: { before: 40, after: 0 },
        children: [
          new TextRun({
            text: detail,
            size: FONT_SIZE_SMALL,
            font: "Times New Roman",
          }),
        ],
      })
    );
  }

  return paragraphs;
}

// ── Footer ────────────────────────────────────────────────────────────────────
// Reference layout:
// * Theory cum Practical Course (if electives exist)
//
// FN: 09.30 am to 12.30 pm                        AN : 01.30 pm to 04.30 pm
//
// Controller of Examinations                                          Principal
//   (name)                                                             (name)
//   College details                                              College details
//
// Timetable Published on DD.MM.YYYY.                                 X of Y

function buildFooterParagraphs(template, pageNum, totalPages, hasTcp) {
  const t = template ?? {};
  const fnTiming = t.fnTiming ?? "09.30 am to 12.30 pm";
  const anTiming = t.anTiming ?? "01.30 pm to 04.30 pm";
  const controller = t.controllerName ?? "";
  const principal = t.principalName ?? "";
  const published = t.publishedDate ?? "";
  const collegeName = t.collegeName ?? "";

  const children = [];

  // TCP footnote
  if (hasTcp) {
    children.push(
      new Paragraph({
        spacing: { before: 60, after: 0 },
        children: [
          new TextRun({
            text: "* Theory cum Practical Course",
            size: FONT_SIZE_SMALL,
            font: "Times New Roman",
            italics: true,
          }),
        ],
      })
    );
  }

  // Spacer
  children.push(new Paragraph({ spacing: { before: 60, after: 0 }, children: [] }));

  // Timing line as a 2-column borderless table
  const makeFooterRow = (leftChildren, rightChildren) =>
    new TableRow({
      children: [
        new TableCell({
          borders: NO_BORDERS,
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 0, after: 0 },
              children: leftChildren,
            }),
          ],
        }),
        new TableCell({
          borders: NO_BORDERS,
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 0, after: 0 },
              children: rightChildren,
            }),
          ],
        }),
      ],
    });

  const tr = (text, opts = {}) =>
    new TextRun({ text, size: FONT_SIZE_SMALL, font: "Times New Roman", ...opts });

  const footerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // FN / AN timing
      makeFooterRow(
        [tr(`FN: ${fnTiming}`)],
        [tr(`AN : ${anTiming}`)]
      ),
      // Spacer row
      makeFooterRow([tr("")], [tr("")]),
      // Controller / Principal labels
      makeFooterRow(
        [tr("Controller of Examinations", { bold: true })],
        [tr("Principal", { bold: true })]
      ),
      // Names
      makeFooterRow(
        [tr(controller ? `  ${controller}` : "")],
        [tr(principal ? `${principal}` : "")]
      ),
      // College details under each
      makeFooterRow(
        [tr(collegeName ? `  ${collegeName}` : "")],
        [tr(collegeName ? `${collegeName}` : "")]
      ),
      // Spacer
      makeFooterRow([tr("")], [tr("")]),
      // Published date / Page
      makeFooterRow(
        [tr(published ? `Timetable Published on ${published}.` : "")],
        [tr(`${pageNum} of ${totalPages}`)]
      ),
    ],
  });

  children.push(footerTable);
  return children;
}

// ── Document assembly ─────────────────────────────────────────────────────────

export function generateDocx({ template, examSlots }) {
  const semesterMap = groupBySemester(examSlots);
  const semNums = [...semesterMap.keys()];
  const totalPages = semNums.length;

  const sections = semNums.map((semNum, idx) => {
    const slots = semesterMap.get(semNum);
    const departments = getDepartmentsForSemester(slots);
    const rows = buildRowMatrix(slots, departments);
    const common = isCommonSemester(slots, departments);
    const hasTcp = slots.some((s) => s.isTheoryCumPractical);

    const table = common
      ? buildCommonTable(rows)
      : buildDepartmentTable(rows, departments);

    return {
      properties: {
        type: idx === 0 ? SectionType.CONTINUOUS : SectionType.NEXT_PAGE,
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
            width: 15840,
            height: 12240,
          },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        ...buildHeaderParagraphs(template, semNum),
        table,
        ...buildLegendParagraphs(slots, rows, departments, common),
        ...buildFooterParagraphs(template, idx + 1, totalPages, hasTcp),
      ],
    };
  });

  return new Document({
    sections,
    defaultRunProperties: {
      font: "Times New Roman",
      size: FONT_SIZE_SMALL,
    },
  });
}

export { Packer };
