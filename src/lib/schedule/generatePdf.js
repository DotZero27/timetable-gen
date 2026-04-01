import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function toRoman(n) {
  return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"][n] ?? String(n);
}

function formatDateLabel(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayName = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}\n${dayName}`;
}

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

function buildRowMatrix(slots) {
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

function cellText(entries) {
  if (entries.length === 0) return "";
  if (entries.length === 1) {
    const e = entries[0];
    return `${e.subjectCode} ${e.subjectName}${e.isTheoryCumPractical ? "*" : ""}`;
  }
  return entries
    .map((e) => `${e.subjectCode}${e.isTheoryCumPractical ? "*" : ""}`)
    .join("\n");
}

function uniqueEntriesByCode(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.subjectCode)) map.set(e.subjectCode, e);
  }
  return [...map.values()];
}

const FONT_SIZE = 9;
const FONT_SIZE_SMALL = 8;
const LINE_HEIGHT = 11;
const CELL_PAD_TOP = 4;
const CELL_PAD_BOTTOM = 3;
const MIN_ROW_H = 22;

function textHeight(text, fontSize) {
  const lines = String(text ?? "").split("\n");
  return lines.length * (fontSize + 2) + CELL_PAD_TOP + CELL_PAD_BOTTOM;
}

function rowHeight(texts) {
  let max = MIN_ROW_H;
  for (const t of texts) {
    max = Math.max(max, textHeight(t, FONT_SIZE_SMALL));
  }
  return max;
}

function drawCell(page, text, x, yTop, w, h, font, options = {}) {
  const { align = "left", size = FONT_SIZE_SMALL, padding = 4 } = options;

  page.drawRectangle({
    x,
    y: yTop - h,
    width: w,
    height: h,
    borderWidth: 0.6,
    borderColor: rgb(0, 0, 0),
  });

  const lines = String(text ?? "").split("\n");
  let lineY = yTop - CELL_PAD_TOP - size;
  for (const line of lines) {
    if (lineY < yTop - h + 2) break;
    const tw = font.widthOfTextAtSize(line, size);
    let textX = x + padding;
    if (align === "center") textX = x + Math.max(padding, (w - tw) / 2);
    else if (align === "right") textX = x + w - tw - padding;
    page.drawText(line, { x: textX, y: lineY, size, font, color: rgb(0, 0, 0) });
    lineY -= size + 2;
  }
}

function drawTextCentered(page, text, y, size, font, usableW, margin) {
  const tw = font.widthOfTextAtSize(text, size);
  const x = margin + Math.max(0, (usableW - tw) / 2);
  page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
}

function drawHeader(page, fonts, template, semNum, usableW, margin, pageTop) {
  const t = template ?? {};
  let y = pageTop;

  drawTextCentered(page, t.collegeName ?? "(College Name)", y, 12, fonts.bold, usableW, margin);
  y -= 15;
  drawTextCentered(page, t.creditSystem ?? "(Autonomous, Affiliated to University)", y, FONT_SIZE, fonts.regular, usableW, margin);
  y -= 13;
  drawTextCentered(page, t.examTitle ?? "(Exam Title)", y, 10, fonts.bold, usableW, margin);
  y -= 13;
  drawTextCentered(
    page,
    `Regulation: ${t.regulation ?? "(Regulation)"} -- Choice Based Credit System (CBCS)`,
    y, FONT_SIZE, fonts.regular, usableW, margin,
  );
  y -= 13;
  drawTextCentered(
    page,
    `${t.degree ?? "B.E. / B.Tech. (All Programmes)"} - Semester: ${toRoman(semNum)} (Batch: ${t.batchYears ?? "(Batch Years)"})`,
    y, FONT_SIZE, fonts.bold, usableW, margin,
  );

  return y - 16;
}

function drawCommonTable(page, fonts, rows, tableY, usableW, margin) {
  const dateW = Math.round(usableW * 0.139);
  const sessW = Math.round(usableW * 0.069);
  const subjectW = usableW - dateW - sessW;
  let y = tableY;

  const headerH = rowHeight(["Date and\nDay"]);
  drawCell(page, "Date and\nDay", margin, y, dateW, headerH, fonts.bold, { align: "center" });
  drawCell(page, "Session", margin + dateW, y, sessW, headerH, fonts.bold, { align: "center" });
  drawCell(page, "Subject Code and Name", margin + dateW + sessW, y, subjectW, headerH, fonts.bold, { align: "center" });
  y -= headerH;

  let i = 0;
  while (i < rows.length) {
    const currentDate = rows[i].date;
    let j = i;
    while (j < rows.length && rows[j].date === currentDate) j++;
    const sameDate = rows.slice(i, j);

    const rowHeights = sameDate.map((row) => {
      const allEntries = [...row.cells.values()].flat();
      const text = cellText(uniqueEntriesByCode(allEntries));
      return rowHeight([formatDateLabel(row.date), text]);
    });
    const dateGroupH = rowHeights.reduce((a, b) => a + b, 0);

    drawCell(page, formatDateLabel(currentDate), margin, y, dateW, dateGroupH, fonts.bold, { align: "center" });

    let rowY = y;
    sameDate.forEach((row, idx) => {
      const rh = rowHeights[idx];
      drawCell(page, row.slot === "FORENOON" ? "FN" : "AN", margin + dateW, rowY, sessW, rh, fonts.regular, { align: "center" });
      const allEntries = [...row.cells.values()].flat();
      const text = cellText(uniqueEntriesByCode(allEntries));
      drawCell(page, text || "", margin + dateW + sessW, rowY, subjectW, rh, fonts.regular, { align: "center" });
      rowY -= rh;
    });

    y -= dateGroupH;
    i = j;
  }

  return y;
}

function drawDepartmentTable(page, fonts, rows, departments, tableY, usableW, margin) {
  const dateW = Math.round(usableW * 0.111);
  const sessW = Math.round(usableW * 0.063);
  const remainingW = usableW - dateW - sessW;
  const deptColW = Math.floor(remainingW / departments.length);
  let y = tableY;

  const headerTexts = departments.map((d) => `${d.degreePrefix}\n${d.name}`);
  const headerH = rowHeight(["Date and\nDay", ...headerTexts]);
  drawCell(page, "Date and\nDay", margin, y, dateW, headerH, fonts.bold, { align: "center" });
  drawCell(page, "Session", margin + dateW, y, sessW, headerH, fonts.bold, { align: "center" });
  let hx = margin + dateW + sessW;
  for (const dept of departments) {
    drawCell(page, `${dept.degreePrefix}\n${dept.name}`, hx, y, deptColW, headerH, fonts.bold, { align: "center" });
    hx += deptColW;
  }
  y -= headerH;

  let i = 0;
  while (i < rows.length) {
    const currentDate = rows[i].date;
    let j = i;
    while (j < rows.length && rows[j].date === currentDate) j++;
    const sameDate = rows.slice(i, j);

    const rowHeights = sameDate.map((row) => {
      const cellTexts = departments.map((dept) => cellText(row.cells.get(dept.id) ?? []));
      return rowHeight([formatDateLabel(row.date), ...cellTexts]);
    });
    const dateGroupH = rowHeights.reduce((a, b) => a + b, 0);

    drawCell(page, formatDateLabel(currentDate), margin, y, dateW, dateGroupH, fonts.bold, { align: "center" });

    let rowY = y;
    sameDate.forEach((row, idx) => {
      const rh = rowHeights[idx];
      drawCell(page, row.slot === "FORENOON" ? "FN" : "AN", margin + dateW, rowY, sessW, rh, fonts.regular, { align: "center" });
      let cx = margin + dateW + sessW;
      for (const dept of departments) {
        const entries = row.cells.get(dept.id) ?? [];
        drawCell(page, cellText(entries) || "", cx, rowY, deptColW, rh, fonts.regular, { align: "center" });
        cx += deptColW;
      }
      rowY -= rh;
    });

    y -= dateGroupH;
    i = j;
  }

  return y;
}

function drawLegend(page, fonts, rows, departments, isCommon, startY, margin) {
  const multiSubjectEntries = [];

  for (const row of rows) {
    if (isCommon) {
      const allEntries = [...row.cells.values()].flat();
      const unique = uniqueEntriesByCode(allEntries);
      if (unique.length > 1) multiSubjectEntries.push(...unique);
    } else {
      for (const dept of departments) {
        const entries = row.cells.get(dept.id) ?? [];
        if (entries.length > 1) multiSubjectEntries.push(...entries);
      }
    }
  }

  if (multiSubjectEntries.length === 0) return startY;

  const seen = new Set();
  const byGroup = new Map();
  for (const e of multiSubjectEntries) {
    if (seen.has(e.subjectCode)) continue;
    seen.add(e.subjectCode);
    const groupKey = e.electiveGroupId ?? "__ungrouped__";
    if (!byGroup.has(groupKey)) byGroup.set(groupKey, []);
    byGroup.get(groupKey).push(e);
  }

  let y = startY - 6;
  for (const [, entries] of byGroup) {
    const detail = entries.map((e) => `${e.subjectCode} ${e.subjectName}`).join("; ");
    page.drawText(detail, { x: margin, y, size: FONT_SIZE, font: fonts.regular, color: rgb(0, 0, 0) });
    y -= 12;
  }

  return y;
}

function drawFooter(page, fonts, template, startY, pageIndex, totalPages, usableW, margin, hasTcp) {
  const t = template ?? {};
  let y = startY - 8;

  if (hasTcp) {
    page.drawText("* Theory cum Practical Course", { x: margin, y, size: FONT_SIZE, font: fonts.italic, color: rgb(0, 0, 0) });
    y -= 14;
  }

  y -= 4;
  const fnText = `FN: ${t.fnTiming ?? "09.30 am to 12.30 pm"}`;
  const anText = `AN : ${t.anTiming ?? "01.30 pm to 04.30 pm"}`;
  page.drawText(fnText, { x: margin, y, size: FONT_SIZE, font: fonts.regular, color: rgb(0, 0, 0) });
  page.drawText(anText, {
    x: margin + usableW - fonts.regular.widthOfTextAtSize(anText, FONT_SIZE),
    y, size: FONT_SIZE, font: fonts.regular, color: rgb(0, 0, 0),
  });
  y -= 18;

  page.drawText("Controller of Examinations", { x: margin, y, size: FONT_SIZE, font: fonts.bold, color: rgb(0, 0, 0) });
  const principalLabel = "Principal";
  page.drawText(principalLabel, {
    x: margin + usableW - fonts.bold.widthOfTextAtSize(principalLabel, FONT_SIZE),
    y, size: FONT_SIZE, font: fonts.bold, color: rgb(0, 0, 0),
  });
  y -= 12;

  const controller = t.controllerName ?? "";
  const principal = t.principalName ?? "";
  if (controller) {
    page.drawText(`  ${controller}`, { x: margin, y, size: FONT_SIZE, font: fonts.regular, color: rgb(0, 0, 0) });
  }
  if (principal) {
    page.drawText(principal, {
      x: margin + usableW - fonts.regular.widthOfTextAtSize(principal, FONT_SIZE),
      y, size: FONT_SIZE, font: fonts.regular, color: rgb(0, 0, 0),
    });
  }
  y -= 12;

  const collegeName = t.collegeName ?? "";
  if (collegeName) {
    page.drawText(`  ${collegeName}`, { x: margin, y, size: 8, font: fonts.regular, color: rgb(0, 0, 0) });
    page.drawText(collegeName, {
      x: margin + usableW - fonts.regular.widthOfTextAtSize(collegeName, 8),
      y, size: 8, font: fonts.regular, color: rgb(0, 0, 0),
    });
  }
  y -= 16;

  const published = t.publishedDate ? `Timetable Published on ${t.publishedDate}.` : "";
  if (published) {
    page.drawText(published, { x: margin, y, size: FONT_SIZE, font: fonts.regular, color: rgb(0, 0, 0) });
  }
  const pageLabel = `${pageIndex} of ${totalPages}`;
  page.drawText(pageLabel, {
    x: margin + usableW - fonts.regular.widthOfTextAtSize(pageLabel, FONT_SIZE),
    y, size: FONT_SIZE, font: fonts.regular, color: rgb(0, 0, 0),
  });
}

export function generatePdf({ template, examSlots }) {
  const semesterMap = groupBySemester(examSlots);
  const semNums = [...semesterMap.keys()];
  const totalPages = semNums.length || 1;

  return (async () => {
    const pdfDoc = await PDFDocument.create();
    const fonts = {
      regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
      bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
      italic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    };

    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const margin = 36;
    const pageTop = pageHeight - margin;
    const usableW = pageWidth - margin * 2;

    semNums.forEach((semNum, idx) => {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const slots = semesterMap.get(semNum);
      const departments = getDepartmentsForSemester(slots);
      const rows = buildRowMatrix(slots);
      const common = isCommonSemester(slots, departments);
      const hasTcp = slots.some((s) => s.isTheoryCumPractical);

      const tableStartY = drawHeader(page, fonts, template, semNum, usableW, margin, pageTop);

      const tableBottomY = common
        ? drawCommonTable(page, fonts, rows, tableStartY, usableW, margin)
        : drawDepartmentTable(page, fonts, rows, departments, tableStartY, usableW, margin);

      const legendBottomY = drawLegend(page, fonts, rows, departments, common, tableBottomY, margin);
      drawFooter(page, fonts, template, legendBottomY, idx + 1, totalPages, usableW, margin, hasTcp);
    });

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  })();
}
